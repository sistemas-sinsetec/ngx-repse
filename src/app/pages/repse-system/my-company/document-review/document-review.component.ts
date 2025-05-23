import { Component, OnInit } from "@angular/core";
import { RejectionCommentComponent } from "../rejection-comment/rejection-comment.component";
import { DocumentService } from "../../../../services/repse/document.service";
import { NbDialogService, NbToastrService } from "@nebular/theme";

interface PendingDocument extends CompanyFile {
  fileNames: string[];
  periodInfo?: DocumentPeriod;
  fileTypeInfo?: FileType;
}

interface CompanyFile {
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

interface DocumentPeriod {
  period_id: number;
  required_file_id: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface FileType {
  filetype_id: number;
  nombre: string;
  description: string;
  is_active: boolean;
}

@Component({
  selector: "ngx-document-review",
  templateUrl: "./document-review.component.html",
  styleUrls: ["./document-review.component.scss"],
})
export class DocumentReviewComponent implements OnInit {
  pendingDocuments: PendingDocument[] = [];
  loading = true;
  searchQuery = "";

  constructor(
    private documentService: DocumentService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService
  ) {}

  ngOnInit(): void {
    this.loadPendingDocuments();
  }

  loadPendingDocuments(): void {
    this.loading = true;
    this.documentService.getFilteredDocuments({ status: "pending" }).subscribe({
      next: (files) => {
        this.pendingDocuments = files.map((file) => ({
          ...file,
          fileNames: [file.file_path?.split("/").pop() || "documento"],
          periodInfo: file.period_id
            ? {
                period_id: file.period_id,
                required_file_id: file.required_file_id,
                start_date: file.start_date,
                end_date: file.end_date,
                created_at: "",
              }
            : undefined,
          fileTypeInfo: file.file_type_name
            ? {
                filetype_id: 0,
                nombre: file.file_type_name,
                description: file.file_type_description,
                is_active: true,
              }
            : undefined,
        }));
        this.loading = false;
      },
      error: (err) => {
        this.toastrService.danger(
          "Error al cargar documentos pendientes",
          "Error"
        );
        this.loading = false;
      },
    });
  }

  get filteredDocuments(): PendingDocument[] {
    if (!this.searchQuery) {
      return this.pendingDocuments;
    }

    const searchTerm = this.searchQuery.toLowerCase();
    return this.pendingDocuments.filter((doc) => {
      const fileTypeMatches =
        doc.fileTypeInfo?.nombre.toLowerCase().includes(searchTerm) ?? false;
      const periodMatches = doc.periodInfo
        ? doc.periodInfo.start_date.toLowerCase().includes(searchTerm) ||
          doc.periodInfo.end_date.toLowerCase().includes(searchTerm)
        : false;

      return fileTypeMatches || periodMatches;
    });
  }

  downloadDocument(fileId: number): void {
    const doc = this.pendingDocuments.find((d) => d.file_id === fileId);
    if (doc?.file_path) {
      this.documentService.downloadFile(doc.file_path);
    } else {
      this.toastrService.warning("No se encontró la ruta del archivo", "Aviso");
    }
  }

  approveDocument(fileId: number): void {
    this.documentService.approveDocument(fileId).subscribe({
      next: () => {
        this.toastrService.success("Documento aprobado correctamente", "Éxito");
        this.loadPendingDocuments();
      },
      error: (err) => {
        this.toastrService.danger("Error al aprobar documento", "Error");
      },
    });
  }

  rejectDocument(document: PendingDocument): void {
    this.dialogService
      .open(RejectionCommentComponent)
      .onClose.subscribe((comment) => {
        if (comment) {
          this.documentService
            .rejectDocument(document.file_id, comment)
            .subscribe({
              next: () => {
                this.toastrService.success(
                  "Documento rechazado correctamente",
                  "Éxito"
                );
                this.loadPendingDocuments();
              },
              error: (err) => {
                this.toastrService.danger(
                  "Error al rechazar documento",
                  "Error"
                );
              },
            });
        }
      });
  }
}
