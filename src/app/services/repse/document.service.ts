import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";
import * as moment from "moment";
import { map } from "rxjs/operators";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ParsedDocumentDates {
  issueDate: Date | null;
  expiryDate: Date | null;
}

const meses: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function calculateExpiry(baseDate: Date, value: number, unit: string): Date {
  const result = new Date(baseDate);
  switch (unit.toLowerCase()) {
    case "dias":
      result.setDate(result.getDate() + value);
      break;
    case "semanas":
      result.setDate(result.getDate() + value * 7);
      break;
    case "meses":
      result.setMonth(result.getMonth() + value);
      break;
    case "años":
      result.setFullYear(result.getFullYear() + value);
      break;
  }
  return result;
}

export interface BaseRequiredFile {
  id: number;
  companyId: number;
  assignedBy: number;
  documentType: string;
  isPeriodic: boolean;
  periodAmount?: number;
  periodType?: string;
  startDate: Date;
  endDate: Date | null;
  minQuantity: number;
  formats: {
    code: string;
    min_required: number;
    uploaded_count?: number;
    manual_expiry_value?: number | null;
    manual_expiry_unit?: string | null;
  }[];
  companyName?: string;
}

export interface RequiredFileView extends BaseRequiredFile {
  periods: Array<{
    period_id: number;
    start_date: string;
    end_date: string;
    uploaded_count: number;
  }>;
  deadline: string | null;
  currentPeriod: {
    period_id: number;
    start_date: string;
    end_date: string;
    uploaded_count: number;
  } | null;
  status: "pending" | "partial" | "complete" | "overdue";
}

export interface AssignedRequiredFileView extends RequiredFileView {
  partnerCount: number;
}

export interface RequirementForm extends BaseRequiredFile {
  partners: string[];
  partnerCount: number;
}

export interface FileStructure {
  periods: Array<{
    name: string;
    isCurrent: boolean;
    formats: Array<{
      type: string;
      files: Array<{
        name: string;
        path: string;
        uploaded_at: string;
        isCurrent: boolean;
      }>;
    }>;
  }>;
}

export interface Partner {
  id: number;
  name: string;
  affiliation: string;
  selected: boolean;
}

export interface DocumentType {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

function mapToRequiredFileView(file: any): RequiredFileView {
  return {
    id: file.required_file_id,
    companyId: file.company_id,
    assignedBy: file.assigned_by,
    documentType: file.name,
    isPeriodic: file.is_periodic === 1,
    periodAmount: file.periodicity_count,
    periodType: file.periodicity_type,
    startDate: moment(file.start_date).toDate(),
    endDate: file.end_date ? moment(file.end_date).toDate() : null,
    minQuantity: file.min_documents_needed,
    formats: file.formats,
    periods: file.periods,
    deadline: file.deadline,
    currentPeriod: file.current_period,
    status: file.status,
    companyName: file.company_name ?? undefined,
  };
}

@Injectable({
  providedIn: "root",
})
export class DocumentService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getCompanyRequirements(companyId: number): Observable<RequirementForm[]> {
    const params = new HttpParams().set("company_id", companyId.toString());
    return this.http
      .get<any[]>(`${this.base}/company_required_files.php`, { params })
      .pipe(
        map((files) =>
          files.map(
            (f): RequirementForm => ({
              ...mapToRequiredFileView(f),
              partners: [],
              partnerCount: f.partner_count,
            })
          )
        )
      );
  }

  getDocumentTypes(options?: {
    onlyActive?: boolean;
  }): Observable<DocumentType[]> {
    return this.http.get<any[]>(`${this.base}/file_types.php`).pipe(
      map((items) =>
        items
          .filter((item) => {
            if (options?.onlyActive) {
              return Number(item.is_active) === 1;
            }
            return true;
          })
          .map((item) => ({
            id: Number(item.file_type_id),
            name: item.name,
            description: item.description,
            active: Number(item.is_active) === 1,
          }))
      )
    );
  }

  saveOrUpdateDocumentType(
    data: Omit<DocumentType, "id">,
    id?: number
  ): Observable<{
    success: boolean;
    file_type_id?: number;
    affected_rows?: number;
  }> {
    const payload = {
      name: data.name,
      description: data.description,
      is_active: data.active ? 1 : 0,
      ...(id ? { file_type_id: id } : {}),
    };

    if (id) {
      return this.http.put<{ success: boolean; affected_rows: number }>(
        `${this.base}/file_types.php`,
        payload
      );
    } else {
      return this.http.post<{ success: boolean; file_type_id: number }>(
        `${this.base}/file_types.php`,
        payload
      );
    }
  }

  deleteDocumentType(
    id: number
  ): Observable<{ success: boolean; affected_rows: number }> {
    const params = new HttpParams().set("id", id.toString());
    return this.http.delete<{ success: boolean; affected_rows: number }>(
      `${this.base}/file_types.php`,
      {
        params,
      }
    );
  }

  getAvailableFormats(): Observable<
    { id: number; name: string; extension: string }[]
  > {
    return this.http.get<any[]>(`${this.base}/file_formats.php`).pipe(
      map((formats) =>
        formats.map((f, i) => ({
          id: i + 1,
          name: f.name,
          extension: f.code,
        }))
      )
    );
  }

  getBusinessPartners(companyId: number): Observable<Partner[]> {
    const params = new HttpParams().set("association_id", companyId.toString());
    return this.http
      .get<any[]>(`${this.base}/getBusinessPartner.php`, { params })
      .pipe(
        map((list) =>
          list.map((p) => ({
            id: +p.businessPartnerId,
            name: p.nameCompany,
            affiliation: p.roleName,
            selected: false,
          }))
        )
      );
  }

  getVisibilities(requiredFileId: number): Observable<any[]> {
    const params = new HttpParams().set(
      "required_file_id",
      requiredFileId.toString()
    );
    return this.http.get<any[]>(`${this.base}/required_file_visibilities.php`, {
      params,
    });
  }

  addVisibility(requiredFileId: number, providerId: number): Observable<any> {
    return this.http.post(`${this.base}/required_file_visibilities.php`, {
      required_file_id: requiredFileId,
      provider_id: providerId,
      is_visible: 1,
    });
  }

  removeVisibility(
    requiredFileId: number,
    providerId: number
  ): Observable<any> {
    const params = new HttpParams()
      .set("required_file_id", requiredFileId.toString())
      .set("provider_id", providerId.toString());
    return this.http.delete(`${this.base}/required_file_visibilities.php`, {
      params,
    });
  }

  /**
   * GET dashboard of required files for a company.
   */

  getOwnRequiredFiles(
    companyId: number,
    periodScope: "all" | "current" | "past" = "all"
  ): Observable<RequiredFileView[]> {
    const params = new HttpParams()
      .set("company_id", companyId.toString())
      .set("period_scope", periodScope);
    return this.http
      .get<any[]>(`${this.base}/company_required_files.php`, { params })
      .pipe(map((files) => files.map(mapToRequiredFileView)));
  }

  getAssignedRequiredFiles(
    assignedById: number
  ): Observable<AssignedRequiredFileView[]> {
    const params = new HttpParams().set("assigned_by", assignedById.toString());
    return this.http
      .get<any[]>(`${this.base}/company_required_files.php`, { params })
      .pipe(
        map((files) =>
          files.map((f) => ({
            ...mapToRequiredFileView(f),
            partnerCount: f.partner_count,
          }))
        )
      );
  }

  saveRequiredFile(data: any): Observable<any> {
    return this.http.post(`${this.base}/company_required_files.php`, data);
  }

  getFileStructure(
    requiredFileId: number,
    periodId?: number
  ): Observable<FileStructure> {
    let params = new HttpParams().set(
      "required_file_id",
      requiredFileId.toString()
    );
    if (periodId != null) {
      params = params.set("period_id", periodId.toString());
    }
    return this.http.get<FileStructure>(`${this.base}/company_files.php`, {
      params,
    });
  }

  uploadFile(formData: FormData): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.base}/company_files.php`,
      formData
    );
  }

  downloadFile(filePath: string): void {
    const url = `${this.base}/../documents/${filePath}`;
    window.open(url, "_blank");
  }

  getFilteredDocuments(filters: {
    status?: string;
    period_coverage?: string;
    company_id?: number;
    required_file_id?: number;
    is_expired?: number;
  }): Observable<any[]> {
    let params = new HttpParams();

    if (filters.status) {
      params = params.set("status", filters.status);
    }

    if (filters.period_coverage) {
      params = params.set("period_coverage", filters.period_coverage);
    }

    if (filters.company_id) {
      params = params.set("company_id", filters.company_id.toString());
    }

    if (filters.required_file_id) {
      params = params.set(
        "required_file_id",
        filters.required_file_id.toString()
      );
    }

    if (filters.is_expired !== undefined) {
      params = params.set("is_expired", filters.is_expired.toString());
    }

    return this.http.get<any[]>(`${this.base}/company_files.php`, { params });
  }

  submitUploads(body: FormData): Observable<any> {
    return this.http.post(`${this.base}/company_files.php`, body);
  }

  approveDocument(fileId: number, isLate = false): Observable<any> {
    const body = new FormData();
    body.append("action", isLate ? "approve_late" : "approve");
    body.append("file_id", fileId.toString());
    return this.http.post<any>(`${this.base}/company_files.php`, body);
  }

  rejectDocument(fileId: number, comment: string): Observable<any> {
    const body = new FormData();
    body.append("action", "reject");
    body.append("file_id", fileId.toString());
    body.append("comment", comment);
    return this.http.post<any>(`${this.base}/company_files.php`, body);
  }

  getUploadedFiles(
    requiredFileId: number,
    periodId: number,
    statuses: string[] = ["uploaded", "pending", "approved", "rejected"]
  ): Observable<any[]> {
    const params = new HttpParams()
      .set("required_file_id", requiredFileId.toString())
      .set("period_id", periodId.toString())
      .set("status", statuses.join(","));
    return this.http.get<any[]>(`${this.base}/company_files.php`, { params });
  }

  deleteUploadedFile(filePath: string): Observable<any> {
    const body = new FormData();
    body.append("action", "delete_uploaded");
    body.append("file_path", filePath);
    return this.http.post<any>(`${this.base}/company_files.php`, body);
  }

  submitUploadedFiles(
    requiredFileId: number,
    periodId: number
  ): Observable<any> {
    const body = new FormData();
    body.append("action", "submit_uploaded");
    body.append("required_file_id", requiredFileId.toString());
    body.append("period_id", periodId.toString());
    return this.http.post<any>(`${this.base}/company_files.php`, body);
  }

  acknowledgeDocument(fileId: number): Observable<any> {
    const body = new FormData();
    body.append("action", "acknowledge");
    body.append("file_id", fileId.toString());
    return this.http.post<any>(`${this.base}/company_files.php`, body);
  }

  downloadApprovedZip(requiredFileId: number): void {
    const url = `${this.base}/company_files_download_complete.php?required_file_id=${requiredFileId}`;
    const fileName = `documentos_completos_${requiredFileId}.zip`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
  }

  getCompanyFiles(
    companyId: number,
    statuses: string[] = ["approved", "late"] // Agregar "late" aquí
  ): Observable<any> {
    const params = new HttpParams()
      .set("mode", "catalog")
      .set("company_id", companyId.toString())
      .set(
        "status",
        statuses.includes("approved_or_late")
          ? "approved_or_late"
          : statuses.join(",")
      );

    return this.http.get(`${this.base}/company_files_tree.php`, { params });
  }

  getProviderFiles(
    assignedByCompanyId: number,
    statuses: string[] = ["approved", "late"]
  ): Observable<any> {
    const params = new HttpParams()
      .set("mode", "providers")
      .set("company_id", assignedByCompanyId.toString())
      .set(
        "status",
        statuses.includes("approved_or_late")
          ? "approved_or_late"
          : statuses.join(",")
      );

    return this.http.get(`${this.base}/company_files_tree.php`, { params });
  }

  // ─────────────── VALIDACIÓN PDF ───────────────

  async parsePDFForRepse(
    file: File,
    expiryOffset: { value: number; unit: string }
  ): Promise<ParsedDocumentDates> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textContent += content.items.map((item: any) => item.str).join(" ");
    }

    const match = textContent.match(
      /ciudad de méxico a\s+([a-zñ]+)\s+(\d{1,2})\s+de\s+([a-zñ]+)\s+del\s+(\d{4})/i
    );

    let issueDate: Date | null = null;
    if (match) {
      const dia = parseInt(match[2]);
      const mes = match[3].toLowerCase();
      const anio = parseInt(match[4]);

      const mesIndex = meses[mes];
      if (!isNaN(dia) && !isNaN(anio) && mesIndex !== undefined) {
        issueDate = new Date(anio, mesIndex, dia);
      }
    }

    const expiryDate = issueDate
      ? calculateExpiry(issueDate, expiryOffset.value, expiryOffset.unit)
      : null;

    return { issueDate, expiryDate };
  }

  async validateRepsePdf(
    file: File,
    expiryConfig: { value: number; unit: string },
    currentPeriod?: { start_date: string; end_date: string }
  ): Promise<{ valid: boolean; message?: string; warning?: string }> {
    const { issueDate, expiryDate } = await this.extractRepseDates(
      file,
      expiryConfig
    );

    if (!issueDate || !expiryDate) {
      return {
        valid: false,
        message: "No se pudo obtener la fecha de expedición del documento.",
      };
    }

    if (!currentPeriod) {
      return { valid: true };
    }

    const periodStart = moment(currentPeriod.start_date);
    const periodEnd = moment(currentPeriod.end_date);
    const exp = moment(expiryDate);

    console.log("→ Fecha de expedición:", issueDate);
    console.log("→ Vigencia calculada:", expiryDate);
    console.log(
      "→ Periodo actual:",
      periodStart.format("DD/MM/YYYY"),
      "-",
      periodEnd.format("DD/MM/YYYY")
    );

    if (exp.isBefore(periodStart)) {
      return {
        valid: false,
        message: `La vigencia del documento (${exp.format(
          "DD/MM/YYYY"
        )}) no cubre el periodo actual.`,
      };
    }

    if (exp.isBefore(periodEnd)) {
      return {
        valid: true,
        warning: `El documento vencerá durante este periodo (${exp.format(
          "DD/MM/YYYY"
        )}).`,
      };
    }

    return { valid: true };
  }

  private formatDate(date: Date): string {
    return moment(date).format("DD/MM/YYYY");
  }

  async extractRepseDates(
    file: File,
    expiryOffset: { value: number; unit: string }
  ): Promise<ParsedDocumentDates> {
    return this.parsePDFForRepse(file, expiryOffset);
  }
}
