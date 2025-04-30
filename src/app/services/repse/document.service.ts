import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { environment } from "../../../environments/environment";
import { delay } from "rxjs/operators";

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

// TEST
export interface CompanyFile {
  file_id: number;
  required_file_id: number;
  file_path: string;
  issue_date: string;
  expiry_date: string | null;
  user_id: number;
  status: "pending" | "approved" | "rejected";
  comment: string | null;
  is_current: boolean;
  uploaded_at: string;
  period_id: number | null;
  file_ext: string | null;
}
// TEST
export interface DocumentPeriod {
  period_id: number;
  required_file_id: number;
  start_date: string;
  end_date: string;
  created_at: string;
}
// TEST
export interface CompanyRequiredFile {
  required_file_id: number;
  company_id: number;
  file_type_id: number;
  is_periodic: boolean;
  periodicity_type: string | null;
  periodicity_count: number | null;
  min_documents_needed: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
// TEST
export interface FileType {
  filetype_id: number;
  nombre: string;
  description: string;
  is_active: boolean;
}
// TEST
export interface RequiredFileFormat {
  required_file_id: number;
  format_code: string;
  min_required: number;
}
//TEST
export interface RequiredFileToType {
  required_file_id: number;
  file_type_id: number;
}

@Injectable({
  providedIn: "root",
})
export class DocumentService {
  //TEST
  private mockFiles: CompanyFile[] = [
    {
      file_id: 1,
      required_file_id: 101,
      file_path: "/documents/contrato.pdf",
      issue_date: "2023-05-15",
      expiry_date: "2023-11-15",
      user_id: 1,
      status: "pending",
      comment: null,
      is_current: true,
      uploaded_at: "2023-05-16 09:30:22",
      period_id: 1,
      file_ext: "pdf",
    },
    {
      file_id: 2,
      required_file_id: 102,
      file_path: "/documents/reporte.xml",
      issue_date: "2023-05-10",
      expiry_date: "2023-08-10",
      user_id: 1,
      status: "pending",
      comment: null,
      is_current: true,
      uploaded_at: "2023-05-12 14:15:10",
      period_id: 2,
      file_ext: "xml",
    },
  ];
  //TEST
  private mockPeriods: DocumentPeriod[] = [
    {
      period_id: 1,
      required_file_id: 27,
      start_date: "2023-05-01",
      end_date: "2023-05-31",
      created_at: "2023-04-28 00:00:00",
    },
    {
      period_id: 2,
      required_file_id: 28,
      start_date: "2023-05-01",
      end_date: "2023-05-31",
      created_at: "2023-04-28 00:00:00",
    },
  ];
  //TEST
  private mockFileTypes: FileType[] = [
    {
      filetype_id: 1,
      nombre: "Contrato de Servicios",
      description: "Documento contractual",
      is_active: true,
    },
    {
      filetype_id: 2,
      nombre: "Reporte Mensual",
      description: "Reporte de actividades",
      is_active: true,
    },
  ];
  //TEST
  private mockRequiredFileTypes: RequiredFileToType[] = [
    { required_file_id: 101, file_type_id: 1 },
    { required_file_id: 102, file_type_id: 2 },
  ];

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

  //TEST
  getPendingDocuments(): Observable<CompanyFile[]> {
    return of(this.mockFiles.filter((file) => file.status === "pending")).pipe(
      delay(800)
    );
  }
  //TEST
  getPeriodById(periodId: number): DocumentPeriod | undefined {
    return this.mockPeriods.find((p) => p.period_id === periodId);
  }
  //TEST
  getFileTypeById(fileTypeId: number): FileType | undefined {
    return this.mockFileTypes.find((ft) => ft.filetype_id === fileTypeId);
  }
  //TEST
  approveDocument(fileId: number): Observable<any> {
    const file = this.mockFiles.find((f) => f.file_id === fileId);
    if (file) file.status = "approved";
    return of({ success: true }).pipe(delay(500));
  }
  //TEST
  rejectDocument(fileId: number, comment: string): Observable<any> {
    const file = this.mockFiles.find((f) => f.file_id === fileId);
    if (file) {
      file.status = "rejected";
      file.comment = comment;
    }
    return of({ success: true }).pipe(delay(500));
  }
  //TEST
  downloadDocument(fileId: number): void {
    const file = this.mockFiles.find((f) => f.file_id === fileId);
    if (file) {
      console.log(`Descargando documento: ${file.file_path}`);
      // Lógica real de descarga iría aquí
    }
  }
  //test
  getFileTypeByRequiredFileId(requiredFileId: number): FileType | undefined {
    const relation = this.mockRequiredFileTypes.find(
      (r) => r.required_file_id === requiredFileId
    );
    if (!relation) return undefined;
    return this.getFileTypeById(relation.file_type_id);
  }
}
