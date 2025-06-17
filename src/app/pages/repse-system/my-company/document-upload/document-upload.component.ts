import { Component, TemplateRef, ViewChild } from "@angular/core";
import { NbDialogService, NbDialogRef, NbToastrService } from "@nebular/theme";
import {
  calculateExpiry,
  DocumentService,
  PdfExtractor,
  RequiredFileView,
} from "../../../../services/repse/document.service";
import { CompanyService } from "../../../../services/company.service";
import * as moment from "moment";

interface FilePreview {
  file_id: number; // <-- Añade esta propiedad
  name: string;
  path: string;
  uploaded_at: string;
  format: string;
  required_file_id: number;
  period_id: number;
  assignment_id: number;
}

interface CompatibleAssignment {
  assignment: any;
  companyName: string;
  documentType: string;
  periodCoverage: string;
}
interface FileHandlerConfig {
  extensions: string[];
  extractMandatoryData?: (
    file: File,
    documentService: DocumentService
  ) => Promise<{
    issueDate: Date | null;
    expiryDate: Date | null;
    rfc?: string | null;
  }>;
}

const FILE_HANDLERS: Record<string, FileHandlerConfig> = {
  repse: {
    extensions: ["pdf"],
    extractMandatoryData: async (file, service) => {
      const extractors: PdfExtractor[] = [
        {
          key: "issueDate",
          pattern: /Ciudad de México a .*?(\d{2}) de (\w+) del (\d{4})/i,
          transform: ([_, day, monthText, year]) => {
            const monthNum = {
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
            }[monthText.toLowerCase()];
            if (monthNum === undefined) return null;
            return new Date(Number(year), monthNum, Number(day));
          },
        },
        {
          key: "expiryDate",
          pattern: /Fecha de Vencimiento:\s*(\d{2}\/\d{2}\/\d{4})/i,
          transform: ([_, date]) => {
            const d = moment(date, "DD/MM/YYYY");
            return d.isValid() ? d.toDate() : null;
          },
        },
        {
          key: "rfc",
          pattern: /Registro Federal de Contribuyentes:\s*([A-ZÑ&0-9]{12,13})/i,
          transform: ([_, rfc]) => rfc.trim().toUpperCase(),
        },
      ];

      const result = await service.parsePdfData(file, extractors);

      return {
        issueDate: result.issueDate instanceof Date ? result.issueDate : null,
        expiryDate:
          result.expiryDate instanceof Date ? result.expiryDate : null,
        rfc: typeof result.rfc === "string" ? result.rfc : null,
      };
    },
  },
  rfc: {
    extensions: ["xml"],
    extractMandatoryData: async (file, service) => {
      const parsed = await service.parseXmlData(file, [
        {
          key: "FechaInicio",
          namespace: "cfdi",
          tag: "Receptor",
          transform: (v) => {
            const [year, month, day] = v.split("-");
            return new Date(Number(year), Number(month) - 1, Number(day));
          },
        },
        {
          key: "FechaFin",
          namespace: "cfdi",
          tag: "Receptor",
          transform: (v) => {
            const [year, month, day] = v.split("-");
            return new Date(Number(year), Number(month) - 1, Number(day));
          },
        },
      ]);

      return {
        issueDate: parsed["FechaInicio"] as Date,
        expiryDate: parsed["FechaFin"] as Date,
      };
    },
  },
  nómina: {
    extensions: ["xml"],
    extractMandatoryData: async (file, documentService) => {
      const parsed = await documentService.parseXmlData(file, [
        {
          key: "rfc",
          namespace: "cfdi",
          tag: "Emisor",
          attribute: "Rfc",
          transform: (v) => v.toUpperCase().trim(),
        },
        {
          key: "issueDate",
          namespace: "nomina12",
          tag: "Nomina",
          attribute: "FechaInicialPago",
          transform: (v) => {
            const [year, month, day] = v.split("-");
            return new Date(Number(year), Number(month) - 1, Number(day));
          },
        },
        {
          key: "expiryDate",
          namespace: "nomina12",
          tag: "Nomina",
          attribute: "FechaFinalPago",
          transform: (v) => {
            const [year, month, day] = v.split("-");
            return new Date(Number(year), Number(month) - 1, Number(day));
          },
        },
      ]);
      console.log(parsed);
      return {
        issueDate: parsed["issueDate"] as Date,
        expiryDate: parsed["expiryDate"] as Date,
        rfc: parsed["rfc"] as string,
      };
    },
  },
};

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

  // Nuevas propiedades para compartir archivos
  sharedAssignments: CompatibleAssignment[] = [];

  constructor(
    private documentService: DocumentService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private companyService: CompanyService
  ) {
    this.loadDocuments();
    this.loadLateDocuments();
    this.loadRejectedFiles();
    this.checkExpiringDocuments();
  }

  // ── Carga inicial ───────────────────────────────────────────
  loadDocuments(): void {
    this.loading = true;
    const myCompanyId = Number(this.companyService.selectedCompany.id);

    this.documentService.getOwnRequiredFiles(myCompanyId, "current").subscribe({
      next: (files) => {
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
        const filtered = files.filter((doc) => {
          if (!doc.isPeriodic) return false;

          const incomplete = doc.periods.filter(
            (p) =>
              moment(p.end_date).isBefore(moment(), "day") &&
              p.uploaded_count < doc.minQuantity
          );

          return incomplete.length > 0;
        });

        files.forEach((doc) => {
          doc.startDate = new Date(doc.startDate);
          doc.endDate = doc.endDate ? new Date(doc.endDate) : null;
          doc.periods = doc.periods.filter(
            (p) =>
              moment(p.end_date).isBefore(moment(), "day") &&
              p.uploaded_count < doc.minQuantity
          );
        });

        this.lateDocuments = filtered;
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
      .getFilteredDocuments({
        status: "rejected",
        company_id: this.companyService.selectedCompany.id,
      })
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
    this.selectedPeriod = null;
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
    setTimeout(() => {
      this.fileInput.nativeElement.accept = `.${formatCode.toLowerCase()}`;
      this.fileInput.nativeElement.click();
    }, 0);
  }

  async onFileSelected(event: any): Promise<void> {
    const files: File[] = Array.from(event.target.files);
    event.target.value = "";

    const selectedDoc = this.selectedDocumentForUpload ?? this.selectedDocument;
    const format = selectedDoc.formats.find(
      (f) => f.code === this.selectedFormat
    );
    const currentCount = format?.temp_uploaded_count || 0;
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

    this.refreshUploadProgress(
      this.selectedDocumentForUpload ?? this.selectedDocument,
      true
    );

    this.selectedFile = files[0];
  }

  async uploadSingleFile(file: File): Promise<void> {
    // Resetear asignaciones compatibles
    this.sharedAssignments = [];

    const fileName = file.name.toLowerCase();
    const selectedDoc = this.selectedDocumentForUpload ?? this.selectedDocument;
    const fileTypeName = selectedDoc?.documentType?.toLowerCase();
    const fileExt = fileName.split(".").pop();

    // Buscar configuración de extracción según tipo de documento y formato
    const config = Object.entries(FILE_HANDLERS).find(
      ([type, cfg]) =>
        fileTypeName.includes(type) && cfg.extensions.includes(fileExt)
    )?.[1];

    let issueDate: Date | null = null;
    let expiryDate: Date | null = null;
    let extractedRfc: string | null = null;

    // Intentar extraer fechas
    if (config?.extractMandatoryData) {
      try {
        const result = await config.extractMandatoryData(
          file,
          this.documentService
        );
        issueDate = result.issueDate;
        expiryDate = result.expiryDate;
        extractedRfc = result.rfc;
      } catch (error) {
        console.warn("Error al extraer fechas:", error);
        this.toastrService.danger(
          `Ocurrió un error al procesar el archivo "${file.name}".`,
          "Error de extracción"
        );
        return;
      }
    }

    // Valida que sí haya RFC extraído y que coincida
    const companyRfc = this.companyService.selectedCompany?.rfc?.toUpperCase();
    if (!extractedRfc || extractedRfc !== companyRfc) {
      this.toastrService.warning(
        `El RFC extraído (${
          extractedRfc ?? "N/D"
        }) no coincide con el RFC de la empresa (${companyRfc}).`,
        "RFC no coincide"
      );
      return;
    }

    // Validar issueDate obligatoria
    if (!issueDate) {
      this.toastrService.warning(
        `No se pudo encontrar la fecha de emisión en el archivo "${file.name}". Verifica el contenido del PDF.`,
        "Fecha no detectada"
      );
      return;
    }

    // Si no hay fecha de vencimiento y se permite calcularla
    const formatConfig = selectedDoc.formats.find(
      (f: any) => f.code.toLowerCase() === fileExt
    );

    if (!expiryDate && formatConfig?.manual_expiry_visible === 0) {
      const value = formatConfig.manual_expiry_value || 0;
      const unit = formatConfig.manual_expiry_unit || "años";
      const normalizedIssue = moment(issueDate).startOf("day").toDate();
      expiryDate = calculateExpiry(normalizedIssue, value, unit);
    }

    if (!expiryDate) {
      this.toastrService.warning(
        `No se pudo determinar la fecha de vencimiento del archivo "${file.name}" (${issueDate} - ${expiryDate}).`,
        "Vencimiento no detectado"
      );
      return;
    }

    // Determinar la cobertura del periodo actual
    const period = selectedDoc.currentPeriod ?? this.selectedPeriod;
    if (!period) {
      this.toastrService.danger("No se encontró el periodo actual", "Error");
      return;
    }

    const periodStart = moment(period.start_date).startOf("day");
    const periodEnd = moment(period.end_date).endOf("day");

    let coverage: "none" | "partial" | "full" = "none";

    if (expiryDate && moment(expiryDate).isBefore(periodStart)) {
      coverage = "none";
    } else if (expiryDate && moment(expiryDate).isBefore(periodEnd)) {
      coverage = "partial";
    } else {
      coverage = "full";
    }

    // Mostrar notificaciones según cobertura
    if (coverage === "none") {
      this.toastrService.warning(
        `El archivo "${
          file.name
        }" no cubre el periodo actual (${periodStart.format(
          "DD/MM/YYYY"
        )} a ${periodEnd.format("DD/MM/YYYY")}).`,
        "Archivo inválido"
      );
      return;
    } else if (coverage === "partial") {
      this.toastrService.info(
        `El archivo "${
          file.name
        }" solo cubre parcialmente el periodo (${periodStart.format(
          "DD/MM/YYYY"
        )} a ${periodEnd.format("DD/MM/YYYY")}).`,
        "Cobertura parcial"
      );
    }

    // Subir a la asignación principal
    await this.uploadToAssignment(file, selectedDoc, issueDate, expiryDate);

    // Buscar asignaciones compatibles
    this.findCompatibleAssignments(selectedDoc, {
      start: issueDate,
      end: expiryDate,
    });

    // Guardar referencia del último archivo cargado
    this.selectedFile = file;
  }

  private findCompatibleAssignments(
    currentAssignment: any,
    filePeriod: { start: Date; end: Date }
  ): any[] {
    const compatibleAssignments = [];
    const myCompanyId = Number(this.companyService.selectedCompany.id);

    const allAssignments = [
      ...this.assignedByMe,
      ...this.assignedByOthers.flatMap((group) => group.files),
    ].filter(
      (assignment) =>
        assignment.id !== currentAssignment.id && assignment.isPeriodic === true
    );

    for (const assignment of allAssignments) {
      const formatMatch = assignment.formats.some(
        (f: any) => f.code === this.selectedFormat
      );

      const coversPeriod = this.documentService.isFileCompatibleWithAssignment(
        filePeriod,
        assignment
      );

      const isActive =
        !assignment.endDate || new Date(assignment.endDate) > new Date();

      if (formatMatch && coversPeriod && isActive) {
        // Agregar a lista para mostrar en UI
        this.sharedAssignments.push({
          assignment: assignment,
          companyName: assignment.companyName || "Mi empresa",
          documentType: assignment.documentType,
          periodCoverage: this.getPeriodCoverageString(assignment),
        });

        // Agregar a lista para subida
        compatibleAssignments.push(assignment);
      }
    }

    return compatibleAssignments;
  }

  private getPeriodCoverageString(assignment: any): string {
    if (!assignment.startDate || !assignment.endDate)
      return "Período no definido";

    const start = moment(assignment.startDate).format("DD/MM/YYYY");
    const end = assignment.endDate
      ? moment(assignment.endDate).format("DD/MM/YYYY")
      : "Vigente";

    return `${start} - ${end}`;
  }

  private async uploadToMultipleAssignments(
    file: File,
    assignments: any[],
    issueDate: Date | null,
    expiryDate: Date | null
  ): Promise<void> {
    this.isUploading = true;
    const uploadPromises = [];

    for (const assignment of assignments) {
      uploadPromises.push(
        this.uploadToAssignment(file, assignment, issueDate, expiryDate)
      );
    }

    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Error en subidas múltiples", error);
    } finally {
      this.isUploading = false;
    }
  }

  private async uploadToAssignment(
    file: File,
    assignment: any,
    issueDate: Date | null,
    expiryDate: Date | null
  ): Promise<void> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("required_file_id", assignment.id.toString());

    const periodId = assignment.currentPeriod?.period_id;

    if (!periodId) {
      this.toastrService.danger(
        `No se encontró el periodo actual para ${assignment.documentType}`,
        "Error"
      );
      return;
    }

    fd.append("period_id", periodId.toString());
    fd.append("format_code", this.selectedFormat);

    if (issueDate) {
      fd.append("issue_date", moment(issueDate).format("YYYY-MM-DD"));
    }
    if (expiryDate) {
      fd.append("expiry_date", moment(expiryDate).format("YYYY-MM-DD"));
    }

    try {
      const response: any = await this.documentService
        .uploadFile(fd)
        .toPromise();

      // Asegúrate de que la respuesta incluya el file_id
      this.filesPendingConfirmation.push({
        file_id: response.file_id, // ID devuelto por el backend
        name: file.name,
        path: response.file_path,
        uploaded_at: new Date().toISOString(),
        format: this.selectedFormat,
        required_file_id: assignment.id,
        period_id: periodId,
        assignment_id: assignment.id,
      });

      this.toastrService.success(
        `Archivo subido a: ${assignment.documentType}`,
        file.name
      );
    } catch (error: any) {
      this.toastrService.danger(
        `Error al subir a ${assignment.documentType}: ${
          error?.message || "Error desconocido"
        }`,
        file.name
      );
      throw error;
    }
  }

  // ── Limpieza ──────────────────────────────────────────

  resetUploadForm(): void {
    this.selectedFile = null;
    this.selectedDocumentForUpload = null;
    this.selectedDocument = null;
    this.selectedPeriod = null;
    this.selectedFormat = "";
    this.availableFormats = [];
    this.sharedAssignments = [];
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
    this.dialogRef = this.dialogService.open(this.previewModal, {
      dialogClass: "custom-modal",
      closeOnBackdropClick: false,
    });
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  closeUploadModal(): void {
    if (this.dialogRefUpload) {
      this.dialogRefUpload.close();
    }
    this.resetUploadForm();
  }

  // ── Archivos subidos (preview y eliminación) ──────────

  getAssignmentName(assignmentId: number): string {
    const allAssignments = [
      ...this.assignedByMe,
      ...this.assignedByOthers.flatMap((group) => group.files),
    ];

    const assignment = allAssignments.find((a) => a.id === assignmentId);
    return assignment?.documentType || `Asignación ${assignmentId}`;
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
    // Recopilar todos los IDs de archivo pendientes
    const fileIds = this.filesPendingConfirmation.map((file) => file.file_id);

    if (fileIds.length === 0) {
      this.finalizeUpload();
      return;
    }

    // Enviar todos los IDs en una sola solicitud
    this.documentService.submitMultipleUploadsGroup(0, fileIds).subscribe({
      next: () => this.finalizeUpload(),
      error: (error) => {
        this.toastrService.danger("Error al enviar archivos", "Error");
        console.error(error);
      },
    });
  }

  private finalizeUpload(): void {
    this.toastrService.success("Archivos enviados a revisión", "Éxito");
    this.closeModal();
    this.closeUploadModal();
    this.loadLateDocuments();
    this.loadDocuments();
    this.resetUploadForm();
    this.filesPendingConfirmation = [];
  }

  checkExpiringDocuments(): void {
    this.documentService
      .getFilteredDocuments({
        status: "all",
        period_coverage: "partial",
        company_id: this.companyService.selectedCompany.id,
        is_expired: 0,
      })
      .subscribe({
        next: (files) => {
          const now = moment().startOf("day");

          files.forEach((file) => {
            if (!file.expiry_date) return;

            const expiry = moment(file.expiry_date).startOf("day");
            const daysLeft = expiry.diff(now, "days");

            if (daysLeft <= 0) {
              this.toastrService.warning(
                `El archivo de "${
                  file.file_type_name
                }" se vence hoy (${expiry.format("DD/MM/YYYY")}).`,
                "Archivo vencido"
              );
            } else if (
              file.notify_day > 0 &&
              daysLeft <= file.notify_day &&
              daysLeft >= 1
            ) {
              this.toastrService.info(
                `El archivo "${
                  file.file_type_name
                }" vencerá en ${daysLeft} día(s) (${expiry.format(
                  "DD/MM/YYYY"
                )}).`,
                "Próximo a vencer"
              );
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

  getLastPeriodEndDate(file: any): string {
    if (!file.periods || file.periods.length === 0) return "Sin periodos";

    const last = file.periods[file.periods.length - 1];
    return moment(last.end_date).format("DD/MM/YYYY");
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
        "late",
      ])
      .subscribe({
        next: (files) => {
          const counts: Record<string, number> = {};

          for (const f of files) {
            if (f.is_expired === 1) continue;
            const ext = (f.file_ext || "").toLowerCase();
            counts[ext] = (counts[ext] || 0) + 1;
          }

          for (const fmt of doc.formats) {
            fmt.temp_uploaded_count = counts[fmt.code.toLowerCase()] || 0;
          }

          if (includePreview) {
            // ACTUALIZA ESTA PARTE PARA QUE COINCIDA CON FilePreview
            this.filesPendingConfirmation = files
              .filter((f: any) => f.status === "uploaded")
              .map((f: any) => ({
                file_id: f.file_id, // Añade el file_id
                name: f.file_path.split("/").pop(),
                path: f.file_path,
                uploaded_at: f.uploaded_at,
                format: f.file_ext.toLowerCase(),
                required_file_id: f.required_file_id,
                period_id: f.period_id,
                assignment_id: f.required_file_id,
              }));
          }
        },
        error: () => {
          this.toastrService.danger("No se pudo calcular el progreso", "Error");
        },
      });
  }

  getFileAccept(): string {
    if (this.activeTab === "Con retraso") {
      return this.selectedFormat
        ? `.${this.selectedFormat.toLowerCase()}`
        : "*/*";
    }

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

  get latePeriodsCount(): number {
    return this.lateDocuments.reduce((total, doc) => {
      return total + (doc.periods?.length || 0);
    }, 0);
  }

  downloadZip(requiredFileId: number): void {
    this.documentService.downloadApprovedZip(requiredFileId);
  }

  formatDate(date: any): string {
    return moment(date).isValid() ? moment(date).format("DD/MM/YYYY") : "-";
  }
}
