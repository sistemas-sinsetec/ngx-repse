import { Component, TemplateRef, ViewChild } from "@angular/core";
import { NbDialogService, NbDialogRef, NbToastrService } from "@nebular/theme";
import {
  DocumentService,
  RequiredFileView,
} from "../../../../services/repse/document.service";
import { CompanyService } from "../../../../services/company.service";
import * as moment from "moment";

interface FilePreview {
  name: string;
  path: string;
  uploaded_at: string;
  format: string;
  required_file_id: number;
}

@Component({
  selector: "app-document-upload",
  templateUrl: "./document-upload.component.html",
  styleUrls: ["./document-upload.component.scss"],
})
export class DocumentUploadComponent {
  @ViewChild("uploadModal") uploadModal!: TemplateRef<any>;
  @ViewChild("fileInput") fileInput: any;
  @ViewChild("previewModal") previewModal!: TemplateRef<any>;

  // Tabs y estado
  activeTab: "Regular" | "Con retraso" | "Rechazados" = "Regular";
  activeTabIndex: any;
  loading = true;
  isUploading = false;

  // Datos del dashboard
  assignedByMe: any[] = [];
  assignedByOthers: { company_id: number; company: string; files: any[] }[] =
    [];
  selectedExternalCompanyId: string | number = "all";

  // Documentos
  rejectedFiles: any[] = [];
  filesPendingConfirmation: FilePreview[] = [];
  filesToVisualize: FilePreview[] = [];

  // Subida regular
  selectedDocumentForUpload: any = null;
  dialogRefUpload!: NbDialogRef<any>;

  // Subida con retraso
  lateDocuments: RequiredFileView[] = [];
  selectedDocument: any | null = null;
  selectedPeriod: any | null = null;

  selectedFormat: string = "";
  availableFormats: string[] = [];
  selectedFile: File | null = null;

  // Modal preview
  dialogRef!: NbDialogRef<any>;
  modalTitle = "";
  allColumns = ["select", "name", "actions"];

  // Fechas REPSE
  private tempIssueDate: Date | null = null;
  private tempExpiryDate: Date | null = null;
  // Nuevo conjunto para rastrear notificaciones

  constructor(
    private documentService: DocumentService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private companyService: CompanyService
  ) {
    this.loadDocuments();
    this.loadRejectedFiles();
    this.checkExpiringDocuments();
  }

  // ── Carga inicial ───────────────────────────────────────────
  loadDocuments(): void {
    this.loading = true;
    const myCompanyId = Number(this.companyService.selectedCompany.id);

    this.documentService.getOwnRequiredFiles(myCompanyId, "current").subscribe({
      next: (files) => {
        // Forzar tipo numérico para evitar errores por comparación estricta
        const myCompanyFiles = files.filter(
          (f) => Number(f.companyId) === myCompanyId
        );

        // Asignados por mi empresa
        this.assignedByMe = myCompanyFiles.filter(
          (f) => Number(f.assignedBy) === myCompanyId
        );

        // Asignados por otras empresas
        const grouped: {
          [key: number]: { company_id: number; company: string; files: any[] };
        } = {};

        myCompanyFiles.forEach((file) => {
          const assignedBy = Number(file.assignedBy);
          if (assignedBy !== myCompanyId) {
            if (!grouped[assignedBy]) {
              grouped[assignedBy] = {
                company_id: assignedBy,
                company: file.companyName || `Empresa ${assignedBy}`,
                files: [],
              };
            }
            grouped[assignedBy].files.push(file);
          }
        });

        this.assignedByOthers = Object.values(grouped);

        this.loading = false;
      },
      error: (err) => {
        console.error("Error loading documents", err);
        this.loading = false;
      },
    });
  }

  loadLateDocuments(): void {
    this.loading = true;
    const myCompanyId = Number(this.companyService.selectedCompany.id);

    this.documentService.getOwnRequiredFiles(myCompanyId, "past").subscribe({
      next: (files: RequiredFileView[]) => {
        this.lateDocuments = files.filter(
          (f) => f.isPeriodic && f.status !== "complete"
        );
        this.loading = false;
      },
      error: (err) => {
        this.toastrService.danger(
          "Error al cargar documentos con retraso",
          "Error"
        );
        console.error("Error en loadLateDocuments", err);
        this.loading = false;
      },
    });
  }

  loadRejectedFiles(): void {
    this.documentService
      .getFilteredDocuments({ status: "rejected" })
      .subscribe({
        next: (files) => {
          this.rejectedFiles = files;
        },
        error: (err) => {
          console.error("Error loading rejected files", err);
        },
      });
  }

  // ── Tabs  ──────────────────────────────────────────────────

  onTabChange(tab: "Regular" | "Con retraso" | "Rechazados"): void {
    this.activeTab = tab;
    this.resetUploadForm();
    if (tab === "Rechazados") {
      this.loadRejectedFiles();
    } else if (tab === "Con retraso") {
      this.loadLateDocuments();
      this.selectedDocument = null;
      this.selectedPeriod = null;
    }
  }

  selectForLateUpload(file: any): void {
    this.activeTab = "Con retraso";
    this.selectedDocument = file;
    this.loadAvailableFormats();
  }

  loadAvailableFormats(): void {
    if (!this.selectedDocument) {
      this.availableFormats = [];
      return;
    }
    this.availableFormats = this.selectedDocument.formats.map(
      (f: any) => f.code
    );
  }

  // ── Subida de archivos ────────────────────────────────

  triggerFileInput(formatCode: string): void {
    this.selectedFormat = formatCode;
    this.fileInput.nativeElement.accept = `.${formatCode.toLowerCase()}`;
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: any): Promise<void> {
    const files: File[] = Array.from(event.target.files);
    event.target.value = "";

    const selectedDoc = this.selectedDocumentForUpload ?? this.selectedDocument;
    const format = selectedDoc.formats.find(
      (f) => f.code === this.selectedFormat
    );
    const currentCount = format?.uploaded_count || 0;
    const max = format?.min_required || 1;
    const remaining = max - currentCount;

    if (files.length > remaining) {
      this.toastrService.warning(
        `Solo se permiten ${remaining} archivo(s) más para este formato.`
      );
      return;
    }

    for (let i = 0; i < Math.min(remaining, files.length); i++) {
      await this.uploadSingleFile(files[i]);
    }

    // Actualizar solo el documento que estás viendo
    this.refreshUploadProgress(
      this.selectedDocumentForUpload ?? this.selectedDocument,
      true
    );

    this.selectedFile = files[0];
  }

  async uploadSingleFile(file: File): Promise<void> {
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.split(".").pop();
    const selectedDoc = this.selectedDocumentForUpload ?? this.selectedDocument;
    const fileTypeName = selectedDoc?.documentType?.toLowerCase();

    const selectedPeriod = this.selectedPeriod;
    let issueDate: Date | null = null;
    let expiryDate: Date | null = null;

    // ── 1. Obtener fechas ──
    if (fileTypeName?.includes("repse") && fileExt === "pdf") {
      const formatConfig = selectedDoc.formats.find(
        (f: any) => f.code.toLowerCase() === "pdf"
      );
      const expiryOffset = {
        value: formatConfig?.manual_expiry_value || 0,
        unit: formatConfig?.manual_expiry_unit || "años",
      };

      const extracted = await this.documentService.extractRepseDates(
        file,
        expiryOffset
      );
      issueDate = extracted.issueDate;
      expiryDate = extracted.expiryDate;
    }

    if (!expiryDate && selectedPeriod) {
      expiryDate = new Date(selectedPeriod.end_date);
      issueDate = new Date();
    }

    // Guardar en estado
    this.tempIssueDate = issueDate;
    this.tempExpiryDate = expiryDate;

    // ── 2. Validar cobertura ──
    if (selectedPeriod && expiryDate) {
      const periodStart = moment(selectedPeriod.start_date);
      const periodEnd = moment(selectedPeriod.end_date);
      const exp = moment(expiryDate);

      if (exp.isBefore(periodStart)) {
        this.toastrService.danger(
          `La vigencia del documento (${exp.format(
            "DD/MM/YYYY"
          )}) no cubre el inicio del periodo.`,
          "Vigencia inválida"
        );
        return;
      }

      if (exp.isBefore(periodEnd)) {
        this.toastrService.warning(
          `La vigencia del documento (${exp.format(
            "DD/MM/YYYY"
          )}) no cubre completamente el periodo.`,
          "Advertencia"
        );
      }
    }

    // ── 3. Subir ──
    const fd = new FormData();
    fd.append("file", file);
    fd.append("required_file_id", selectedDoc?.id.toString() || "");
    const periodId =
      this.selectedDocumentForUpload?.currentPeriod?.period_id ||
      this.selectedPeriod?.period_id;

    if (!periodId) {
      this.toastrService.danger(
        "No se encontró el periodo actual para este documento",
        "Error"
      );
      return;
    }

    fd.append("period_id", periodId?.toString() || "");

    fd.append("format_code", this.selectedFormat);

    if (issueDate)
      fd.append("issue_date", issueDate.toISOString().split("T")[0]);
    if (expiryDate)
      fd.append("expiry_date", expiryDate.toISOString().split("T")[0]);

    this.isUploading = true;

    return new Promise((resolve) => {
      this.documentService.uploadFile(fd).subscribe({
        next: async () => {
          this.toastrService.success("Archivo cargado", file.name);
          this.refreshUploadProgress(selectedDoc, true);

          resolve();
        },
        error: () => {
          this.toastrService.danger("Error al subir archivo", file.name);
          resolve();
        },
        complete: () => (this.isUploading = false),
      });
    });
  }

  // ── Limpieza ──────────────────────────────────────────

  resetUploadForm(): void {
    this.selectedFile = null;
    this.selectedDocumentForUpload = null;
    this.selectedDocument = null;
    this.selectedPeriod = null;
    this.selectedFormat = "";
    this.availableFormats = [];
    this.tempIssueDate = null;
    this.tempExpiryDate = null;
  }

  // ── Modal de subida y preview ─────────────────────────

  async prepareUpload(file: any): Promise<void> {
    this.activeTab = "Regular";
    this.selectedDocumentForUpload = file;
    this.selectedPeriod = file.currentPeriod ?? null;

    this.refreshUploadProgress(file, true);

    this.dialogRefUpload = this.dialogService.open(this.uploadModal, {
      dialogClass: "custom-modal",
      closeOnBackdropClick: false,
      autoFocus: true,
    });
  }

  prepareUploadFromLateTab(): void {
    if (!this.selectedDocument || !this.selectedPeriod) {
      this.toastrService.warning("Selecciona un documento y un periodo válido");
      return;
    }

    this.selectedDocumentForUpload = this.selectedDocument;
    this.refreshUploadProgress(this.selectedDocument, true);

    this.dialogRefUpload = this.dialogService.open(this.uploadModal, {
      dialogClass: "custom-modal",
      closeOnBackdropClick: false,
      autoFocus: true,
    });
  }

  openPreviewModal(): void {
    const doc = this.selectedDocumentForUpload;

    if (!doc?.id || !doc?.currentPeriod?.period_id) {
      this.toastrService.warning(
        "No se encontró información del documento",
        "Error"
      );
      return;
    }

    this.documentService
      .getUploadedFiles(doc.id, doc.currentPeriod.period_id, ["uploaded"])
      .subscribe({
        next: (files) => {
          this.filesToVisualize = files.map((f: any) => ({
            name: f.file_path.split("/").pop(),
            path: f.file_path,
            uploaded_at: f.uploaded_at,
            format: f.file_ext.toLowerCase(),
            required_file_id: f.id,
          }));

          this.dialogRef = this.dialogService.open(this.previewModal, {
            dialogClass: "custom-modal",
            closeOnBackdropClick: false,
          });
        },
        error: () => {
          this.toastrService.danger(
            "Error al cargar archivos cargados",
            "Error"
          );
        },
      });
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null!;
    }
  }

  closeUploadModal(): void {
    if (this.dialogRefUpload) {
      this.dialogRefUpload.close();
      this.dialogRefUpload = null!;
    }
  }

  // ── Archivos subidos (preview y eliminación) ──────────

  loadFilesForReview(): void {
    const doc = this.selectedDocumentForUpload;
    if (!doc?.id || !doc?.currentPeriod?.period_id) return;

    this.documentService
      .getUploadedFiles(doc.id, doc.currentPeriod.period_id, ["uploaded"])
      .subscribe({
        next: (files) => {
          this.filesPendingConfirmation = files.map((f: any) => ({
            name: f.file_path.split("/").pop(),
            path: f.file_path,
            uploaded_at: f.uploaded_at,
            format: f.file_ext.toLowerCase(),
            required_file_id: f.id,
          }));
        },
        error: () => {
          this.toastrService.danger(
            "Error al cargar archivos para revisión",
            "Error"
          );
        },
      });
  }

  downloadPreviewFile(file: any): void {
    if (file?.path) {
      this.documentService.downloadFile(file.path);
    } else {
      this.toastrService.warning("Ruta inválida del archivo", "Aviso");
    }
  }

  deletePreviewFile(file: any): void {
    this.documentService.deleteUploadedFile(file.path).subscribe({
      next: () => {
        this.toastrService.success("Archivo eliminado", "Éxito");
        this.filesPendingConfirmation = this.filesPendingConfirmation.filter(
          (f) => f.path !== file.path
        );
        if (this.filesPendingConfirmation.length === 0) {
          this.closeModal();
          this.toastrService.info(
            "Ya no hay archivos para revisar",
            "Revisión vacía"
          );
        }
        this.refreshUploadProgress(this.selectedDocumentForUpload, true);
      },
      error: () => {
        this.toastrService.danger("No se pudo eliminar el archivo", "Error");
      },
    });
  }
  confirmUploadSubmit(): void {
    const doc = this.selectedDocumentForUpload ?? this.selectedDocument;

    const periodId =
      this.selectedDocumentForUpload?.currentPeriod?.period_id ??
      this.selectedPeriod?.period_id;

    if (!doc?.id || !periodId) return;

    this.documentService.submitUploadedFiles(doc.id, periodId).subscribe({
      next: () => {
        this.toastrService.success("Archivos enviados a revisión", "Éxito");
        this.closeModal();
        this.refreshUploadProgress(this.selectedDocumentForUpload, true);
        this.loadLateDocuments();
        this.loadDocuments();
        this.resetUploadForm();
      },
      error: () => {
        this.toastrService.danger("Error al enviar archivos", "Error");
      },
    });
  }

  checkExpiringDocuments(): void {
    this.documentService
      .getFilteredDocuments({
        status: "all",
        period_coverage: "partial",
        is_expired: 0,
      })
      .subscribe({
        next: (files) => {
          const now = moment();
          files.forEach((file) => {
            if (!file.expiry_date) return;
            const expiry = moment(file.expiry_date);
            const daysLeft = expiry.diff(now, "days");

            if (expiry.isBefore(now)) {
              this.toastrService.warning(
                `El archivo de "${
                  file.file_type_name
                }" ha vencido (${expiry.format("DD/MM/YYYY")}).`,
                "Archivo vencido"
              );

              // Marcar como notificado
            }
            // Mostrar próximo a vencer
            else {
              let threshold = file.file_type_name;
              const isRepse = file.file_type_name
                ?.toLowerCase()
                .includes("repse");
              threshold = isRepse ? 90 : 7;

              if (daysLeft <= threshold) {
                this.toastrService.info(
                  `El archivo de "${
                    file.file_type_name
                  }" vencerá pronto (${expiry.format("DD/MM/YYYY")}).`,
                  "Próximo a vencer"
                );
              }
            }
          });
        },
        error: () => {
          this.toastrService.danger("Error al verificar vencimientos", "Error");
        },
      });
  }

  // ── Archivos rechazados ───────────────────────────────
  downloadDocument(fileId: number): void {
    const file = this.rejectedFiles.find((f) => f.file_id === fileId);
    if (file && file.file_path) {
      this.documentService.downloadFile(file.file_path);
    } else {
      this.toastrService.warning("Archivo no encontrado", "Advertencia");
    }
  }
  acknowledgeDocument(fileId: number): void {
    const body = new FormData();
    body.append("action", "acknowledge");
    body.append("file_id", fileId.toString());

    this.documentService.acknowledgeDocument(fileId).subscribe({
      next: () => {
        this.toastrService.success("Documento eliminado", "Éxito");
        this.loadDocuments();
        this.loadRejectedFiles();
      },
      error: () => {
        this.toastrService.danger("Error al eliminar el documento", "Error");
      },
    });
  }

  // ── Helpers de visualización ──────────────────────────

  getStatusColor(status: string): string {
    return (
      {
        complete: "success",
        partial: "warning",
        pending: "info",
        overdue: "danger",
      }[status] || "basic"
    );
  }

  getStatusLabel(status: string): string {
    return (
      {
        complete: "Completo",
        partial: "Parcial",
        pending: "Pendiente",
        overdue: "Atrasado",
      }[status] || status
    );
  }

  getDeadlineLabel(file: any): string {
    if (!file.deadline || file.deadline === "9999-12-31") {
      return "Sin límite";
    }
    return moment(file.deadline).format("DD/MM/YYYY");
  }

  getUploadProgress(file: any): string {
    if (file.currentPeriod) {
      return `${file.currentPeriod.uploaded_count}/${file.minQuantity}`;
    }
    const totalDone = file.periods.reduce(
      (sum: number, p: any) => sum + p.uploaded_count,
      0
    );
    const needed = file.minQuantity * file.periods.length || 1;
    return `${totalDone}/${needed}`;
  }

  private refreshUploadProgress(
    doc: any,
    includePreview: boolean = false
  ): void {
    if (!doc?.id || !doc?.currentPeriod?.period_id) return;

    this.documentService
      .getUploadedFiles(doc.id, doc.currentPeriod.period_id, [
        "uploaded",
        "pending",
        "approved",
        "rejected",
      ])
      .subscribe({
        next: (files) => {
          const counts: Record<string, number> = {};

          // Agrupar conteo por extensión
          for (const f of files) {
            const ext = (f.file_ext || "").toLowerCase();
            counts[ext] = (counts[ext] || 0) + 1;
          }

          // Actualizar conteo en cada formato
          for (const fmt of doc.formats) {
            fmt.temp_uploaded_count = counts[fmt.code.toLowerCase()] || 0;
          }

          // Si se necesita, actualizar también la tabla de preview
          if (includePreview) {
            this.filesPendingConfirmation = files
              .filter((f: any) => f.status === "uploaded")
              .map((f: any) => ({
                name: f.file_path.split("/").pop(),
                path: f.file_path,
                uploaded_at: f.uploaded_at,
                format: f.file_ext.toLowerCase(),
                required_file_id: f.id,
              }));
          }
        },
        error: () => {
          this.toastrService.danger("No se pudo calcular el progreso", "Error");
        },
      });
  }

  getFileAccept(): string {
    // Si estamos en “Con retraso”, sólo el formato elegido
    if (this.activeTab === "Con retraso") {
      return this.selectedFormat
        ? `.${this.selectedFormat.toLowerCase()}`
        : "*/*";
    }

    // En “Regular”, toma todos los códigos de formato disponibles
    if (!this.selectedDocumentForUpload) {
      return "*/*";
    }
    return this.selectedDocumentForUpload.formats
      .map((f: any) => `.${f.code.toLowerCase()}`)
      .join(",");
  }

  getIncompletePeriods(): any[] {
    if (!this.selectedDocument) return [];

    const now = moment().startOf("day");
    return this.selectedDocument.periods.filter(
      (p: any) =>
        moment(p.end_date).isBefore(now, "day") &&
        p.uploaded_count < this.selectedDocument.minQuantity
    );
  }

  isFormatComplete(file: any, formatCode: string): boolean {
    const format = file.formats.find((f: any) => f.code === formatCode);
    if (!format) return false;

    const currentCount = format.temp_uploaded_count || 0;
    return currentCount >= format.min_required;
  }

  canSelectFile(): boolean {
    if (this.activeTab === "Con retraso") {
      return !!(
        this.selectedDocument &&
        this.selectedPeriod &&
        this.selectedFormat
      );
    }
    return !!this.selectedDocumentForUpload;
  }
  canUpload(): boolean {
    if (!this.selectedFile) return false;
    if (this.activeTab === "Con retraso") {
      return !!(
        this.selectedDocument &&
        this.selectedPeriod &&
        this.selectedFormat
      );
    }
    return !!this.selectedDocumentForUpload;
  }

  getUploadedCount(file: any, formatCode: string): number {
    const format = file.formats.find((f: any) => f.code === formatCode);
    return format ? format.uploaded_count : 0;
  }

  get incompleteRequiredFilesCount(): number {
    const myIncomplete = this.assignedByMe.filter(
      (file) => file.status !== "complete"
    ).length;

    const othersIncomplete = this.assignedByOthers.reduce((total, group) => {
      const count = group.files.filter(
        (file) => file.status !== "complete"
      ).length;
      return total + count;
    }, 0);

    return myIncomplete + othersIncomplete;
  }

  downloadZip(requiredFileId: number): void {
    this.documentService.downloadApprovedZip(requiredFileId);
  }
}
