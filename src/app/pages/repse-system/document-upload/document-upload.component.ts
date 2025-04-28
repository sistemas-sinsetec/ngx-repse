import { Component, TemplateRef, ViewChild } from "@angular/core";
import {
  NbDialogService,
  NbDialogRef,
  NbToastrService,
  NbTreeGridDataSourceBuilder,
  NbTreeGridDataSource,
} from "@nebular/theme";
import { DocumentService } from "../../../services/repse/document.service";
import * as moment from "moment";
import { CompanyService } from "../../../services/company.service";

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
  @ViewChild("downloadModal") downloadModal!: TemplateRef<any>;
  @ViewChild("fileInput") fileInput: any;

  // Tabs
  activeTab: "regular" | "late" = "regular";

  // Data from dashboard endpoint
  requiredFiles: any[] = [];
  loading = true;

  // Regular-tab upload
  selectedDocumentForUpload: any = null;

  // Late-tab selection
  selectedDocument: any = null;
  selectedPeriod: any = null;
  selectedFormat: string = "";
  availableFormats: string[] = [];
  selectedFile: File | null = null;

  // Download modal
  fileNodes: TreeNode<FileNode>[] = [];
  selectedNodes: TreeNode<FileNode>[] = [];
  treeGridDataSource!: NbTreeGridDataSource<FileNode>;
  modalTitle = "";
  dialogRef!: NbDialogRef<any>;
  allColumns = ["select", "name", "actions"];

  constructor(
    private documentService: DocumentService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<FileNode>,
    private companyService: CompanyService
  ) {
    this.loadDocuments();
  }

  // ── Load dashboard data ─────────────────────────────────────
  loadDocuments(): void {
    this.loading = true;
    const companyId = this.companyService.selectedCompany.id;
    this.documentService.getRequiredFiles(companyId).subscribe({
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

  prepareUpload(file: any): void {
    this.activeTab = "regular";
    this.selectedDocumentForUpload = file;
    // pick the current period automatically
    this.selectedPeriod = file.current_period ?? null;
    // formats available for regular upload are all codes
    this.availableFormats = file.formats.map((f: any) => f.code);
    this.selectedFormat = "";
    // trigger file input
    this.fileInput.nativeElement.click();
  }

  // ── File selection & upload (both tabs) ────────────────────

  onFileSelected(event: any): void {
    const f = event.target.files?.[0] as File;
    this.selectedFile = f || null;
    event.target.value = "";
    if (this.activeTab === "regular" && this.selectedFile) {
      this.uploadDocument();
    }
  }

  canSelectFile(): boolean {
    if (this.activeTab === "late") {
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
    if (this.activeTab === "late") {
      return !!(
        this.selectedDocument &&
        this.selectedPeriod &&
        this.selectedFormat
      );
    }
    return !!this.selectedDocumentForUpload;
  }

  uploadDocument(): void {
    if (!this.canUpload()) {
      this.toastrService.warning(
        "Complete todos los campos requeridos",
        "Advertencia"
      );
      return;
    }
    const fd = new FormData();
    fd.append("file", this.selectedFile as Blob);
    const reqId =
      this.activeTab === "regular"
        ? this.selectedDocumentForUpload.required_file_id
        : this.selectedDocument.required_file_id;
    const periodId =
      this.activeTab === "late"
        ? this.selectedPeriod.period_id
        : this.selectedPeriod?.period_id;
    fd.append("required_file_id", reqId.toString());
    fd.append("period_id", periodId?.toString() || "");
    fd.append(
      "format_code",
      this.activeTab === "late" ? this.selectedFormat : ""
    );

    this.documentService.uploadFile(fd).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          this.toastrService.success("Archivo subido correctamente", "Éxito");
          this.loadDocuments();
          this.resetUploadForm();
        }
      },
      error: (err) => {
        console.error("Upload error", err);
        this.toastrService.danger("Error al subir el archivo", "Error");
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
  }

  // ── Late tab: selecting document, period, format ────────────

  onTabChange(tab: "regular" | "late"): void {
    this.activeTab = tab;
    this.resetUploadForm();
  }

  selectForLateUpload(file: any): void {
    this.activeTab = "late";
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

  getIncompletePeriodicFiles(): any[] {
    return this.requiredFiles.filter(
      (f) =>
        f.is_periodic && f.status !== "complete" && f.current_period != null
    );
  }

  // ── Download modal ───────────────────────────────────────────

  openDownloadModal(file: any): void {
    this.modalTitle = `Documentos disponibles - ${file.name}`;
    this.documentService
      .getFileStructure(file.required_file_id, file.current_period?.period_id)
      .subscribe((structure) => {
        this.fileNodes = this.transformToTreeNodes(structure);
        this.treeGridDataSource = this.dataSourceBuilder.create(this.fileNodes);
        this.selectedNodes = [];
        this.dialogRef = this.dialogService.open(this.downloadModal, {
          context: { fileStructure: structure },
          dialogClass: "custom-modal",
          closeOnBackdropClick: false,
          autoFocus: true,
        });
      });
  }

  transformToTreeNodes(structure: any): TreeNode<FileNode>[] {
    return structure.periods.map((period: any) => ({
      data: {
        name: `${period.start_date} - ${period.end_date}`,
        type: "period",
      },
      expanded: true,
      children: period.formats.map((fmt: any) => ({
        data: { name: fmt.code, type: "format" },
        expanded: true,
        children: fmt.files.map((f: any) => ({
          data: {
            name: f.file_path.split("/").pop(),
            type: "file",
            path: f.file_path,
          },
        })),
      })),
    }));
  }

  getIconForType(type: string): string {
    return {
      period: "calendar-outline",
      format: "folder-outline",
      file: "file-text-outline",
    }[type]!;
  }

  // Selection in tree
  toggleSelection(node: TreeNode<FileNode>): void {
    if (node.data.type !== "file") return;
    const id = node.data.path;
    const idx = this.selectedNodes.findIndex((n) => n.data.path === id);
    if (idx >= 0) this.selectedNodes.splice(idx, 1);
    else this.selectedNodes.push(node);
  }

  isSelected(node: TreeNode<FileNode>): boolean {
    return this.selectedNodes.some((n) => n.data.path === node.data.path);
  }

  get allSelected(): boolean {
    const total = this.countFileNodes(this.fileNodes);
    return this.selectedNodes.length === total && total > 0;
  }

  get someSelected(): boolean {
    const total = this.countFileNodes(this.fileNodes);
    return this.selectedNodes.length > 0 && this.selectedNodes.length < total;
  }

  toggleAllSelection(): void {
    if (this.allSelected) this.selectedNodes = [];
    else this.collectAllFileNodes(this.fileNodes, this.selectedNodes);
  }

  private collectAllFileNodes(
    nodes: TreeNode<FileNode>[],
    coll: TreeNode<FileNode>[]
  ): void {
    nodes.forEach((n) => {
      if (n.data.type === "file") coll.push(n);
      if (n.children) this.collectAllFileNodes(n.children, coll);
    });
  }

  private countFileNodes(nodes: TreeNode<FileNode>[]): number {
    let c = 0;
    nodes.forEach((n) => {
      if (n.data.type === "file") c++;
      if (n.children) c += this.countFileNodes(n.children);
    });
    return c;
  }

  downloadSingleFile(node: TreeNode<FileNode>): void {
    if (node.data.type === "file" && node.data.path) {
      this.documentService.downloadFile(node.data.path);
    }
  }

  downloadSelected(): void {
    this.selectedNodes.forEach((n) => {
      if (n.data.type === "file" && n.data.path) {
        this.documentService.downloadFile(n.data.path);
      }
    });
    this.toastrService.success(
      `Descargando ${this.selectedNodes.length} archivos`,
      "Éxito"
    );
  }

  getFileAccept(): string {
    // Si estamos en “Con retraso”, sólo el formato elegido
    if (this.activeTab === "late") {
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

  getNodePadding(node: any): number {
    // Nivel 0 (period): 12px
    // Nivel 1 (format): 32px
    // Nivel 2 (file): 52px
    return node.level * 20 + 12;
  }

  closeModal(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
      this.dialogRef = null!;
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
}
