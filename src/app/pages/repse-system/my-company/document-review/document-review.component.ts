import { Component, OnInit } from "@angular/core";
import { RejectionCommentComponent } from "../rejection-comment/rejection-comment.component";
import {
  DocumentService,
  CompanyFile,
  DocumentPeriod,
  FileType,
} from "../../../../services/repse/document.service";
import { NbDialogService, NbToastrService } from "@nebular/theme";

interface PendingDocument extends CompanyFile {
  fileNames: string[];
  periodInfo?: DocumentPeriod;
  fileTypeInfo?: FileType;
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
    this.documentService.getPendingDocuments().subscribe({
      next: (files) => {
        this.pendingDocuments = files.map((file) => ({
          ...file,
          fileNames: [file.file_path.split("/").pop() || "documento"],
          periodInfo: file.period_id
            ? this.documentService.getPeriodById(file.period_id)
            : undefined,
          // Aquí deberías obtener el fileTypeInfo basado en required_file_id
          // Esto es un mock - en producción necesitarías un método para obtener esta relación
          fileTypeInfo: this.documentService.getFileTypeByRequiredFileId(
            file.required_file_id
          ),
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
    this.documentService.downloadDocument(fileId);
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
