import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";
import * as moment from "moment";

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

@Injectable({
  providedIn: "root",
})
export class DocumentService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * GET dashboard of required files for a company.
   */
  getRequiredFiles(companyId: number): Observable<RequiredFile[]> {
    const params = new HttpParams().set("company_id", companyId.toString());
    return this.http.get<RequiredFile[]>(
      `${this.base}/company_required_files.php`,
      { params }
    );
  }

  /**
   * GET the structure of uploaded files (tree) for download modal.
   */
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

  /**
   * POST upload a file. Expects a FormData containing:
   *   file, required_file_id, period_id, format_code
   */
  uploadFile(formData: FormData): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.base}/company_files.php`,
      formData
    );
  }

  /**
   * Download a file by opening a new window/tab. Assumes `filePath`
   * is the path returned by the API, relative to the base URL.
   */
  downloadFile(filePath: string): void {
    const url = `${this.base}/../documents/${filePath}`;
    window.open(url, "_blank");
  }

  getPendingDocuments(): Observable<any[]> {
    const params = new HttpParams().set("status", "pending");
    return this.http.get<any[]>(`${this.base}/company_files.php`, { params });
  }

  getRejectedDocuments(): Observable<any[]> {
    const params = new HttpParams().set("status", "rejected");
    return this.http.get<any[]>(`${this.base}/company_files.php`, { params });
  }

  getAllDocuments(): Observable<any[]> {
    const params = new HttpParams().set("status", "all");
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

  getFullCatalog(companyId: number): Observable<any> {
    const params = new HttpParams().set("company_id", companyId.toString());
    return this.http.get(`${this.base}/company_files_catalog.php`, { params });
  }

  getProviderFiles(assignedByCompanyId: number): Observable<any> {
    const params = new HttpParams().set(
      "assigned_by",
      assignedByCompanyId.toString()
    );
    return this.http.get(`${this.base}/company_files_providers.php`, {
      params,
    });
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
