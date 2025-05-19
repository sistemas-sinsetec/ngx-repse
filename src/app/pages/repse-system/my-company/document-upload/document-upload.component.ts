import { Component, TemplateRef, ViewChild } from "@angular/core";
import {
  NbDialogService,
  NbDialogRef,
  NbToastrService,
  NbTreeGridDataSourceBuilder,
  NbTreeGridDataSource,
} from "@nebular/theme";
import {
  DocumentService,
  ParsedDocumentDates,
} from "../../../../services/repse/document.service";
import * as moment from "moment";
import { CompanyService } from "../../../../services/company.service";

interface FileNode {
  name: string;
  type: "period" | "format" | "file";
  path?: string;
  children?: FileNode[];
  expanded?: boolean;
  data?: any;
}

interface TreeNode<T> {
  data: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
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

  // Tabs
  activeTab: "Regular" | "Con retraso" | "Rechazados" = "Regular";

  // Data from dashboard endpoint
  requiredFiles: any[] = [];
  previewFiles: {
    name: string;
    path: string;
    uploaded_at: string;
    format: string;
  }[] = [];

  assignedByMe: any[] = [];
  assignedByOthers: { company_id: number; company: string; files: any[] }[] =
    [];
  selectedExternalCompanyId: string | number = "all";

  loading = true;

  isUploading = false;

  private tempIssueDate: Date | null = null;
  private tempExpiryDate: Date | null = null;

  // Regular-tab upload
  selectedDocumentForUpload: any = null;

  // Late-tab selection
  selectedDocument: any = null;
  selectedPeriod: any = null;
  selectedFormat: string = "";
  availableFormats: string[] = [];
  selectedFile: File | null = null;

  //Rejected files
  rejectedFiles: any[] = [];

  // Download modal

  selectedNodes: TreeNode<FileNode>[] = [];
  treeGridDataSource!: NbTreeGridDataSource<FileNode>;
  modalTitle = "";
  dialogRef!: NbDialogRef<any>;
  dialogRefUpload!: NbDialogRef<any>;
  allColumns = ["select", "name", "actions"];
  activeTabIndex: any;

  constructor(
    private documentService: DocumentService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<FileNode>,
    private companyService: CompanyService
  ) {
    this.loadDocuments();
    this.loadRejectedFiles();
  }

  // ── Load dashboard data ─────────────────────────────────────
  loadDocuments(): void {
    this.loading = true;
    const myCompanyId = Number(this.companyService.selectedCompany.id);

    this.documentService.getRequiredFiles(myCompanyId).subscribe({
      next: (files) => {
        // Forzar tipo numérico para evitar errores por comparación estricta
        const myCompanyFiles = files.filter(
          (f) => Number(f.company_id) === myCompanyId
        );

        // Asignados por mi empresa
        this.assignedByMe = myCompanyFiles.filter(
          (f) => Number(f.assigned_by) === myCompanyId
        );

        // Asignados por otras empresas
        const grouped: {
          [key: number]: { company_id: number; company: string; files: any[] };
        } = {};

        myCompanyFiles.forEach((file) => {
          const assignedBy = Number(file.assigned_by);
          if (assignedBy !== myCompanyId) {
            if (!grouped[assignedBy]) {
              grouped[assignedBy] = {
                company_id: assignedBy,
                company: file.company_name || `Empresa ${assignedBy}`,
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

  // ── Helpers for the Regular table ──────────────────────────

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

  getUploadProgress(file: any): string {
    if (file.current_period) {
      return `${file.current_period.uploaded_count}/${file.min_documents_needed}`;
    }
    const totalDone = file.periods.reduce(
      (sum: number, p: any) => sum + p.uploaded_count,
      0
    );
    const needed = file.min_documents_needed * file.periods.length || 1;
    return `${totalDone}/${needed}`;
  }

  async prepareUpload(file: any): Promise<void> {
    this.activeTab = "Regular";
    this.selectedDocumentForUpload = file;
    this.selectedPeriod = file.current_period ?? null;

    this.updateUploadProgress(file);
    await this.loadUploadedFilesForPreview();

    this.dialogRefUpload = this.dialogService.open(this.uploadModal, {
      dialogClass: "custom-modal",
      closeOnBackdropClick: false,
      autoFocus: true,
    });
  }

  // ── File selection & upload (both tabs) ────────────────────
  getUploadedCount(file: any, formatCode: string): number {
    const format = file.formats.find((f: any) => f.code === formatCode);
    return format ? format.uploaded_count : 0;
  }

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
      const fmt = selectedDoc.formats.find(
        (f: any) => f.code === this.selectedFormat
      );
      if (fmt) {
        fmt.temp_uploaded_count = (fmt.temp_uploaded_count || 0) + 1;
      }
    }

    // Actualizar solo el documento que estás viendo
    this.updateUploadProgress(
      this.selectedDocumentForUpload ?? this.selectedDocument
    );

    this.selectedFile = files[0];
  }

  async uploadSingleFile(file: File): Promise<void> {
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.split(".").pop();
    const selectedDoc = this.selectedDocumentForUpload ?? this.selectedDocument;
    const fileTypeName = selectedDoc?.name?.toLowerCase();

    if (fileTypeName?.includes("repse") && fileExt === "pdf") {
      const formatConfig = selectedDoc.formats.find(
        (f: any) => f.code.toLowerCase() === "pdf"
      );

      const expiryOffset = {
        value: formatConfig?.manual_expiry_value || 0,
        unit: formatConfig?.manual_expiry_unit || "años",
      };

      const validation = await this.documentService.validateRepsePdf(
        file,
        expiryOffset,
        this.selectedPeriod
      );

      if (!validation.valid) {
        this.toastrService.danger(
          validation.message || "Documento inválido",
          "Error"
        );
        return;
      }

      if (validation.warning) {
        this.toastrService.warning(validation.warning, "Advertencia");
        return;
      }

      const { issueDate, expiryDate } =
        await this.documentService.extractRepseDates(file, expiryOffset);

      if (issueDate) this.tempIssueDate = issueDate;
      if (expiryDate) this.tempExpiryDate = expiryDate;
    }

    const fd = new FormData();
    fd.append("file", file);

    const selectedPeriod = this.selectedPeriod;

    fd.append(
      "required_file_id",
      selectedDoc?.required_file_id.toString() || ""
    );
    fd.append("period_id", selectedPeriod?.period_id.toString() || "");
    fd.append("format_code", this.selectedFormat);

    this.isUploading = true;

    return new Promise((resolve) => {
      this.documentService.uploadFile(fd).subscribe({
        next: () => {
          this.toastrService.success("Archivo cargado", file.name);
          if (selectedDoc) {
            this.updateUploadProgress(selectedDoc);
          }
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

  async uploadDocument(): Promise<void> {
    if (!this.canUpload() || !this.selectedFile) {
      this.toastrService.warning(
        "Complete todos los campos requeridos",
        "Advertencia"
      );
      return;
    }

    const file = this.selectedFile;
    const fileName = file.name.toLowerCase();
    const fileExt = fileName.split(".").pop();

    const selectedDoc = this.selectedDocumentForUpload ?? this.selectedDocument;
    const selectedPeriod = this.selectedPeriod;
    const fileTypeName = selectedDoc?.name?.toLowerCase();

    // Validación REPSE
    if (fileTypeName?.includes("repse") && fileExt === "pdf") {
      const formatConfig = selectedDoc.formats.find(
        (f: any) => f.code.toLowerCase() === "pdf"
      );

      const expiryOffset = {
        value: formatConfig?.manual_expiry_value || 0,
        unit: formatConfig?.manual_expiry_unit || "años",
      };

      const validation = await this.documentService.validateRepsePdf(
        file,
        expiryOffset,
        selectedPeriod
      );

      if (!validation.valid) {
        this.toastrService.danger(
          validation.message || "Documento inválido",
          "Error"
        );
        return;
      }

      if (validation.warning) {
        this.toastrService.warning(validation.warning, "Advertencia");
      }

      const { issueDate, expiryDate } =
        await this.documentService.extractRepseDates(file, expiryOffset);

      if (issueDate) this.tempIssueDate = issueDate;
      if (expiryDate) this.tempExpiryDate = expiryDate;
    }

    // Subida
    this.isUploading = true;
    const fd = new FormData();
    fd.append("file", file);
    fd.append(
      "required_file_id",
      selectedDoc?.required_file_id.toString() || ""
    );
    fd.append("period_id", selectedPeriod?.period_id.toString() || "");
    fd.append("format_code", this.selectedFormat);

    if (this.tempIssueDate && this.tempExpiryDate) {
      fd.append("issue_date", this.tempIssueDate.toISOString().split("T")[0]);
      fd.append("expiry_date", this.tempExpiryDate.toISOString().split("T")[0]);
    }

    this.documentService.uploadFile(fd).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          this.toastrService.success("Archivo subido correctamente", "Éxito");
          this.loadDocuments();
          if (this.dialogRef) this.dialogRef.close();
          this.resetUploadForm();
        }
      },
      error: () => {
        this.toastrService.danger("Error al subir el archivo", "Error");
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

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

  // ── Late tab: selecting document, period, format ────────────

  onTabChange(tab: "Regular" | "Con retraso" | "Rechazados"): void {
    this.activeTab = tab;
    this.resetUploadForm();
    if (tab === "Rechazados") {
      this.loadRejectedFiles();
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

  loadRejectedFiles(): void {
    this.documentService.getRejectedDocuments().subscribe({
      next: (files) => {
        this.rejectedFiles = files;
      },
      error: (err) => {
        console.error("Error loading rejected files", err);
      },
    });
  }

  downloadDocument(fileId: number): void {
    const file = this.rejectedFiles.find((f) => f.file_id === fileId);
    if (file && file.file_path) {
      this.documentService.downloadFile(file.file_path);
    } else {
      this.toastrService.warning("Archivo no encontrado", "Advertencia");
    }
  }

  getIncompletePeriodicFiles(): any[] {
    return this.requiredFiles.filter(
      (f) =>
        f.is_periodic && f.status !== "complete" && f.current_period != null
    );
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

  getIncompletePeriods(): any[] {
    if (!this.selectedDocument) return [];

    const now = moment().startOf("day");
    return this.selectedDocument.periods.filter(
      (p: any) =>
        moment(p.end_date).isBefore(now, "day") &&
        p.uploaded_count < this.selectedDocument.min_documents_needed
    );
  }

  private formatDate(dateString: string): string {
    return moment(dateString).format("DD/MM/YYYY");
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

  getDeadlineLabel(file: any): string {
    if (!file.deadline || file.deadline === "9999-12-31") {
      return "Sin límite";
    }
    return moment(file.deadline).format("DD/MM/YYYY");
  }

  isFormatComplete(file: any, formatCode: string): boolean {
    const format = file.formats.find((f: any) => f.code === formatCode);
    if (!format) return false;

    const currentCount = format.temp_uploaded_count || 0;
    return currentCount >= format.min_required;
  }

  private updateUploadProgress(doc: any): void {
    if (!doc?.required_file_id || !doc?.current_period?.period_id) return;

    this.documentService
      .getUploadedFiles(doc.required_file_id, doc.current_period.period_id, [
        "uploaded",
        "pending",
        "approved",
        "rejected",
      ])
      .subscribe({
        next: (files) => {
          const counts: Record<string, number> = {};

          for (const f of files) {
            const ext = (f.file_ext || "").toLowerCase();

            if (f.required_file_id === doc.required_file_id) {
              counts[ext] = (counts[ext] || 0) + 1;
            }
          }

          for (const fmt of doc.formats) {
            fmt.temp_uploaded_count = counts[fmt.code.toLowerCase()] || 0;
          }
        },
        error: () => {
          this.toastrService.danger("No se pudo calcular el progreso", "Error");
        },
      });
  }

  private async loadUploadedFilesForPreview(): Promise<void> {
    const doc = this.selectedDocumentForUpload;
    if (!doc?.required_file_id || !doc?.current_period?.period_id) return;

    this.documentService
      .getUploadedFiles(doc.required_file_id, doc.current_period.period_id, [
        "uploaded",
      ])
      .subscribe({
        next: (files) => {
          this.previewFiles = files.map((f: any) => ({
            name: f.file_path.split("/").pop(),
            path: f.file_path,
            uploaded_at: f.uploaded_at,
            format: f.file_ext.toLowerCase(),
            required_file_id: f.required_file_id,
          }));

          const counts: Record<string, number> = {};
          for (const file of this.previewFiles) {
            counts[file.format] = (counts[file.format] || 0) + 1;
          }

          for (const fmt of doc.formats) {
            fmt.temp_uploaded_count = counts[fmt.code.toLowerCase()] || 0;
          }
        },
        error: () => {
          this.toastrService.danger("Error al cargar archivos", "Error");
        },
      });
  }

  openPreviewModal(): void {
    const doc = this.selectedDocumentForUpload;

    if (!doc?.required_file_id || !doc?.current_period?.period_id) {
      this.toastrService.warning(
        "No se encontró información del documento",
        "Error"
      );
      return;
    }

    this.documentService
      .getUploadedFiles(doc.required_file_id, doc.current_period.period_id, [
        "uploaded",
      ])
      .subscribe({
        next: (files) => {
          this.previewFiles = files.map((f: any) => ({
            name: f.file_path.split("/").pop(),
            path: f.file_path,
            uploaded_at: f.uploaded_at,
            format: f.file_ext.toLowerCase(),
            required_file_id: f.required_file_id,
          }));

          const counts: Record<string, number> = {};
          for (const file of this.previewFiles) {
            counts[file.format] = (counts[file.format] || 0) + 1;
          }

          for (const fmt of doc.formats) {
            fmt.temp_uploaded_count = counts[fmt.code.toLowerCase()] || 0;
          }

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

  downloadPreviewFile(file: any): void {
    if (file?.path) {
      this.documentService.downloadFile(file.path);
    } else {
      this.toastrService.warning("Ruta inválida del archivo", "Aviso");
    }
  }

  downloadZip(requiredFileId: number): void {
    this.documentService.downloadApprovedZip(requiredFileId);
  }

  deletePreviewFile(file: any): void {
    this.documentService.deleteUploadedFile(file.path).subscribe({
      next: () => {
        this.toastrService.success("Archivo eliminado", "Éxito");
        this.previewFiles = this.previewFiles.filter(
          (f) => f.path !== file.path
        );
        this.updateUploadProgress(this.selectedDocumentForUpload);
      },
      error: () => {
        this.toastrService.danger("No se pudo eliminar el archivo", "Error");
      },
    });
  }

  confirmUploadSubmit(): void {
    const doc = this.selectedDocumentForUpload;
    if (!doc?.required_file_id || !doc?.current_period?.period_id) return;

    this.documentService
      .submitUploadedFiles(doc.required_file_id, doc.current_period.period_id)
      .subscribe({
        next: () => {
          this.toastrService.success("Archivos enviados a revisión", "Éxito");
          this.closeModal();
          this.loadDocuments();
        },
        error: () => {
          this.toastrService.danger("Error al enviar archivos", "Error");
        },
      });
  }
}
