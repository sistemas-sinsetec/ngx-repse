import { Component, TemplateRef, ViewChild } from "@angular/core";
import { NbDialogService, NbDialogRef, NbToastrService } from "@nebular/theme";
import { DocumentService } from "../../../services/repse/document.service";
import * as moment from "moment";

@Component({
  selector: "app-document-upload",
  templateUrl: "./document-upload.component.html",
  styleUrls: ["./document-upload.component.scss"],
})
export class DocumentUploadComponent {
  @ViewChild("downloadModal") downloadModal!: TemplateRef<any>;
  @ViewChild("fileInput") fileInput: any;

  activeTab: string = "regular";
  selectedDocument: any = null;
  selectedPeriod: any = null;
  selectedFile: File | null = null;
  modalTitle: string = "";
  dialogRef!: NbDialogRef<any>;

  requiredFiles: any[] = [];
  uploadedFiles: any[] = [];
  pastPeriods: any[] = [];
  loading = true;
  companyId = 1;

  selectedDocumentForUpload: any;

  constructor(
    private dialogService: NbDialogService,
    private documentService: DocumentService,
    private toastrService: NbToastrService
  ) {
    this.loadDocuments();
  }

  loadDocuments() {
    this.loading = true;
    this.documentService.getRequiredFiles(this.companyId).subscribe({
      next: (files) => {
        this.requiredFiles = files;
        this.loading = false;
      },
      error: (err) => {
        console.error("Error loading documents", err);
        this.loading = false;
      },
    });
  }

  getStatusColor(status: string): string {
    return (
      {
        completado: "success",
        pendiente: "warning",
        vencido: "danger",
      }[status] || "basic"
    );
  }

  openDownloadModal(file: any) {
    this.documentService
      .getUploadedFiles(file.required_file_id, file.current_period?.period_id)
      .subscribe((files) => {
        this.uploadedFiles = files;
        this.modalTitle = `Documentos disponibles - ${file.name}`;

        if (!this.dialogRef) {
          this.dialogRef = this.dialogService.open(this.downloadModal);
        }

        this.dialogRef.onClose.subscribe(() => {
          this.dialogRef = null;
        });
      });
  }

  downloadFile(filePath: string) {
    this.documentService.downloadFile(filePath);
  }

  downloadAll() {
    this.uploadedFiles.forEach((file) => this.downloadFile(file.file_path));
    this.closeModal();
  }

  closeModal() {
    if (this.dialogRef) {
      this.dialogRef.onClose.subscribe(() => {
        this.dialogRef = null;
      });
      this.dialogRef.close();
    }
  }

  prepareUpload(file: any) {
    this.selectedDocumentForUpload = file;
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0] as File;
    if (file) {
      this.selectedFile = file;

      // Si es carga regular, subir inmediatamente
      if (this.activeTab === "regular" && this.selectedDocumentForUpload) {
        this.uploadDocument();
      }
    } else {
      this.selectedFile = null;
    }
    event.target.value = ""; // Resetear el input
  }

  uploadDocument() {
    if (!this.canUpload()) {
      this.toastrService.warning(
        "Complete todos los campos requeridos",
        "Advertencia"
      );
      return;
    }

    const uploadData = {
      file: this.selectedFile,
      required_file_id:
        this.activeTab === "regular"
          ? this.selectedDocumentForUpload?.required_file_id
          : this.selectedDocument?.required_file_id,
      period_id:
        this.activeTab === "late" ? this.selectedPeriod?.period_id : null,
    };

    if (!uploadData.required_file_id) {
      this.toastrService.warning(
        "Seleccione un documento válido",
        "Advertencia"
      );
      return;
    }

    this.documentService
      .uploadFile(
        uploadData.file,
        uploadData.required_file_id,
        uploadData.period_id
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.toastrService.success("Archivo subido correctamente", "Éxito");
            this.loadDocuments();
            this.resetUploadForm();
          }
        },
        error: (err) => {
          this.toastrService.danger("Error al subir el archivo", "Error");
          console.error("Upload error", err);
        },
      });
  }

  resetUploadForm() {
    this.selectedFile = null;
    this.selectedDocumentForUpload = null;
    if (this.activeTab === "late") {
      this.selectedDocument = null;
      this.selectedPeriod = null;
      this.pastPeriods = [];
    }
  }

  loadPastPeriods(requiredFileId: number) {
    this.documentService.getPastPeriods(requiredFileId).subscribe((periods) => {
      this.pastPeriods = periods;
    });
  }

  canUpload(): boolean {
    // Siempre necesita un archivo seleccionado
    if (!this.selectedFile) return false;

    if (this.activeTab === "late") {
      // Para carga con retraso:
      // - Necesita documento seleccionado
      // - Si es periódico, necesita periodo seleccionado
      const hasRequiredFields =
        this.selectedDocument &&
        (!this.selectedDocument.is_periodic || this.selectedPeriod);

      return hasRequiredFields;
    }

    // Para carga regular solo necesita el archivo y documento (manejado por selectedDocumentForUpload)
    return !!this.selectedDocumentForUpload;
  }

  onDocumentSelect() {
    // Limpiar selección previa
    this.selectedFile = null;
    this.selectedPeriod = null;
    this.pastPeriods = [];

    if (!this.selectedDocument) {
      this.pastPeriods = [];
      return;
    }

    // Solo cargar periodos si el documento es periódico
    if (this.selectedDocument.is_periodic) {
      this.documentService
        .getPastPeriods(this.selectedDocument.required_file_id)
        .subscribe({
          next: (periods) => {
            this.pastPeriods = periods;
          },
          error: (err) => {
            console.error("Error al cargar periodos:", err);
            this.toastrService.danger(
              "Error al cargar periodos pasados",
              "Error"
            );
          },
        });
    } else {
      this.pastPeriods = [];
      this.toastrService.warning(
        "Este documento no tiene periodos pasados",
        "Advertencia"
      );
    }
  }

  onPeriodSelect() {
    // Resetear archivo seleccionado cuando cambia el periodo
    this.selectedFile = null;
  }

  canSelectFile(): boolean {
    if (this.activeTab === "late") {
      return (
        this.selectedDocument &&
        (!this.selectedDocument.is_periodic || this.selectedPeriod)
      );
    }
    return true; // Para carga regular siempre permite seleccionar
  }

  selectForLateUpload(file: any) {
    this.selectedDocument = file;
    this.onDocumentSelect();
  }

  formatDate(date: string | Date, format: string = "dd/MM/yyyy"): string {
    return moment(date).format(format);
  }

  isPeriodActive(period: any): boolean {
    const now = moment();
    return now.isBetween(
      moment(period.start_date),
      moment(period.end_date),
      null,
      "[]"
    );
  }

  getCurrentPeriod(periods: any[]): any {
    return periods.find((period) => this.isPeriodActive(period));
  }

  getCurrentFile(file: any): any {
    if (file.is_periodic) {
      const currentPeriod = this.getCurrentPeriod(file.periods);
      if (!currentPeriod) return null;

      return this.uploadedFiles.find(
        (f) =>
          f.required_file_id === file.required_file_id &&
          f.period_id === currentPeriod.period_id
      );
    }

    return this.uploadedFiles.find(
      (f) => f.required_file_id === file.required_file_id && f.is_current
    );
  }
}
