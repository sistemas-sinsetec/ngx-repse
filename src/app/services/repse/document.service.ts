import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";

export interface RequiredFile {
  required_file_id: number;
  name: string;
  is_periodic: number;
  periodicity_type: string | null;
  periodicity_count: number | null;
  formats: { code: string; min_required: number }[];
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
    const url = `${this.base}/${filePath}`;
    window.open(url, "_blank");
  }
}
