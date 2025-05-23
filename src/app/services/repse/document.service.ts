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

export interface RequiredFile {
  required_file_id: number;
  company_id: number;
  name: string;
  is_periodic: number;
  periodicity_type: string | null;
  periodicity_count: number | null;
  formats: {
    code: string;
    min_required: number;
    uploaded_count?: number;
    manual_expiry_value?: number | null;
    manual_expiry_unit?: string | null;
  }[];
  min_documents_needed: number;
  periods: Array<{
    period_id: number;
    start_date: string;
    end_date: string;
    uploaded_count: number;
  }>;
  deadline: string | null;
  current_period: {
    period_id: number;
    start_date: string;
    end_date: string;
    uploaded_count: number;
  } | null;
  status: "pending" | "partial" | "complete" | "overdue";
  assigned_by: number;
  company_name?: string;
}

export interface AssignedRequiredFile extends RequiredFile {
  partner_count: number;
  company_name?: string;
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
export interface Requirement {
  id: number;
  documentType: string;
  isActive: boolean;
  isPeriodic: boolean;
  periodAmount?: number;
  periodType?: string;
  startDate?: Date;
  minQuantity: number;
  partners: string[];
  partnerCount: number;
  formats?: any[];
}

export interface Partner {
  id: number;
  name: string;
  affiliation: string;
  selected: boolean;
}

@Injectable({
  providedIn: "root",
})
export class DocumentService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getCompanyRequirements(companyId: number): Observable<Requirement[]> {
    const params = new HttpParams().set("company_id", companyId.toString());
    return this.http
      .get<any[]>(`${this.base}/company_required_files.php`, { params })
      .pipe(
        map((configs) =>
          configs.map((cfg) => ({
            id: cfg.required_file_id,
            documentType: cfg.name,
            isActive: true,
            isPeriodic: cfg.is_periodic === 1,
            periodAmount: cfg.periodicity_count,
            periodType: cfg.periodicity_type,
            startDate: moment.utc(cfg.start_date).toDate(),
            minQuantity: cfg.min_documents_needed,
            partners: [],
            partnerCount: cfg.partner_count,
            formats: cfg.formats,
          }))
        )
      );
  }

  getDocumentTypes(): Observable<{ id: number; name: string }[]> {
    return this.http
      .get<any[]>(`${this.base}/file_types.php`)
      .pipe(
        map((types) =>
          types
            .filter((t) => Number(t.is_active) === 1)
            .map((t) => ({ id: Number(t.file_type_id), name: t.name }))
        )
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

  getOwnRequiredFiles(companyId: number): Observable<RequiredFile[]> {
    const params = new HttpParams().set("company_id", companyId.toString());
    return this.http.get<RequiredFile[]>(
      `${this.base}/company_required_files.php`,
      { params }
    );
  }

  getAssignedRequiredFiles(
    assignedById: number
  ): Observable<AssignedRequiredFile[]> {
    const params = new HttpParams().set("assigned_by", assignedById.toString());
    return this.http.get<AssignedRequiredFile[]>(
      `${this.base}/company_required_files.php`,
      { params }
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

  approveDocument(fileId: number): Observable<any> {
    const body = new FormData();
    body.append("action", "approve");
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
    status: string = "approved"
  ): Observable<any> {
    const params = new HttpParams()
      .set("mode", "catalog")
      .set("company_id", companyId.toString())
      .set("status", status);
    return this.http.get(`${this.base}/company_files_tree.php`, { params });
  }

  getProviderFiles(
    assignedByCompanyId: number,
    status: string = "approved"
  ): Observable<any> {
    const params = new HttpParams()
      .set("mode", "providers")
      .set("company_id", assignedByCompanyId.toString())
      .set("status", status);
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
