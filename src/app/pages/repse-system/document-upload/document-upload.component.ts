import { Component, TemplateRef, ViewChild } from "@angular/core";
import {
  NbDialogService,
  NbDialogRef,
  NbToastrService,
  NbTreeGridComponent,
  NbTreeGridDataSourceBuilder,
  NbTreeGridDataSource,
  NbTreeGridPresentationNode,
} from "@nebular/theme";
import { DocumentService } from "../../../services/repse/document.service";
import * as moment from "moment";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

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

  activeTab: string = "regular";
  selectedDocument: any = null;
  selectedPeriod: any = null;
  selectedFormat: string = "";
  availableFormats: string[] = [];
  selectedFile: File | null = null;
  modalTitle: string = "";
  dialogRef!: NbDialogRef<any>;

  requiredFiles: any[] = [];
  uploadedFiles: any[] = [];
  pastPeriods: any[] = [];
  loading = true;
  companyId = 1;

  selectedDocumentForUpload: any;
  fileNodes: TreeNode<FileNode>[] = [];
  selectedNodes: TreeNode<FileNode>[] = [];
  treeGridDataSource!: NbTreeGridDataSource<FileNode>;

  // Configuración de columnas para el tree grid
  allColumns = ["select", "name", "actions"];

  // Opciones de expansión
  expandedNodes: Set<string> = new Set();

  constructor(
    private dialogService: NbDialogService,
    private documentService: DocumentService,
    private toastrService: NbToastrService,
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<FileNode>
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
      .getFileStructure(file.required_file_id, file.current_period?.period_id)
      .subscribe((structure) => {
        this.modalTitle = `Documentos disponibles - ${file.name}`;
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
    const treeNodes: TreeNode<FileNode>[] = [];

    structure.periods.forEach((period) => {
      const periodNode: TreeNode<FileNode> = {
        data: {
          name: period.name,
          type: "period",
          expanded: true,
        },
        children: [],
        expanded: true,
      };

      period.formats.forEach((format) => {
        const formatNode: TreeNode<FileNode> = {
          data: {
            name: format.type,
            type: "format",
            expanded: true,
          },
          children: format.files.map((file) => ({
            data: {
              name: file.name,
              type: "file",
              path: file.path,
              data: file,
            },
            expanded: false,
          })),
          expanded: true,
        };

        periodNode.children?.push(formatNode);
      });

      treeNodes.push(periodNode);
    });

    return treeNodes;
  }

  getIconForType(type: string): string {
    const icons = {
      period: "calendar-outline",
      format: "folder-outline",
      file: "file-text-outline",
    };
    return icons[type] || "file-outline";
  }

  toggleNode(node: FileNode): void {
    node.expanded = !node.expanded;
  }

  // Métodos para manejar la selección de nodos
  toggleSelection(node: TreeNode<FileNode>): void {
    if (node.data.type !== "file") return;

    const index = this.selectedNodes.findIndex(
      (n) => this.getNodeId(n) === this.getNodeId(node)
    );
    if (index >= 0) {
      this.selectedNodes.splice(index, 1);
    } else {
      this.selectedNodes.push(node);
    }
  }

  isSelected(node: TreeNode<FileNode>): boolean {
    return (
      node.data.type === "file" &&
      this.selectedNodes.some((n) => this.getNodeId(n) === this.getNodeId(node))
    );
  }

  getNodeId(node: TreeNode<FileNode>): string {
    return `${node.data.type}-${node.data.name}-${node.data.path}`;
  }

  toggleAllSelection(): void {
    if (this.allSelected) {
      this.selectedNodes = [];
    } else {
      this.selectedNodes = [];
      this.collectAllFileNodes(this.fileNodes, this.selectedNodes);
    }
  }

  private collectAllFileNodes(
    nodes: TreeNode<FileNode>[],
    collection: TreeNode<FileNode>[]
  ): void {
    nodes.forEach((node) => {
      if (node.data.type === "file") {
        collection.push(node);
      }
      if (node.children) {
        this.collectAllFileNodes(node.children, collection);
      }
    });
  }

  get allSelected(): boolean {
    const totalFiles = this.countFileNodes(this.fileNodes);
    return this.selectedNodes.length === totalFiles && totalFiles > 0;
  }

  get someSelected(): boolean {
    const totalFiles = this.countFileNodes(this.fileNodes);
    return (
      this.selectedNodes.length > 0 && this.selectedNodes.length < totalFiles
    );
  }

  private countFileNodes(nodes: TreeNode<FileNode>[]): number {
    let count = 0;
    nodes.forEach((node) => {
      if (node.data.type === "file") {
        count++;
      }
      if (node.children) {
        count += this.countFileNodes(node.children);
      }
    });
    return count;
  }

  // Métodos para descarga
  downloadSingleFile(node: TreeNode<FileNode>): void {
    if (node.data.type !== "file" || !node.data.path) return;
    this.documentService.downloadFile(node.data.path);
  }

  downloadSelected(): void {
    if (this.selectedNodes.length === 0) return;

    this.selectedNodes.forEach((node) => {
      if (node.data.path) {
        this.documentService.downloadFile(node.data.path);
      }
    });

    this.toastrService.success(
      `Descargando ${this.selectedNodes.length} archivos`,
      "Éxito"
    );
  }

  getTotalFiles(): number {
    let count = 0;
    this.fileNodes.forEach((period) => {
      period.children?.forEach((format) => {
        count += format.children?.length || 0;
      });
    });
    return count;
  }

  downloadFile(filePath: string) {
    this.documentService.downloadFile(filePath);
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

      if (this.activeTab === "regular" && this.selectedDocumentForUpload) {
        this.uploadDocument();
      }
    } else {
      this.selectedFile = null;
    }
    event.target.value = "";
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
      file_format: this.activeTab === "late" ? this.selectedFormat : null,
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
        uploadData.period_id,
        uploadData.file_format
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

  onDocumentSelect() {
    this.selectedFile = null;
    this.selectedPeriod = null;
    this.selectedFormat = "";
    this.availableFormats = [];

    if (!this.selectedDocument) {
      this.pastPeriods = [];
      return;
    }

    if (this.selectedDocument.is_periodic) {
      this.documentService
        .getPastPeriods(this.selectedDocument.required_file_id)
        .subscribe({
          next: (periods) => {
            this.pastPeriods = periods || [];
          },
          error: (err) => {
            console.error("Error al cargar periodos:", err);
            this.pastPeriods = [];
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
    this.selectedFile = null;
    this.selectedFormat = "";
    this.loadAvailableFormats();
  }

  loadAvailableFormats() {
    if (!this.selectedDocument || !this.selectedPeriod) {
      this.availableFormats = [];
      return;
    }

    this.documentService
      .getFileStructure(
        this.selectedDocument.required_file_id,
        this.selectedPeriod.period_id
      )
      .subscribe((structure) => {
        const formats = new Set<string>();

        // Recorrer todos los periodos y formatos para obtener los tipos únicos
        structure.periods.forEach((period) => {
          period.formats.forEach((format) => {
            formats.add(format.type);
          });
        });

        this.availableFormats = Array.from(formats);
      });
  }

  getFileAccept(): string {
    if (!this.selectedFormat) return "*";

    const acceptMap: { [key: string]: string } = {
      PDF: ".pdf",
      XML: ".xml",
      TXT: ".txt",
      Imagen: ".jpg,.jpeg,.png",
    };

    return acceptMap[this.selectedFormat] || "*";
  }

  // Actualiza el método canSelectFile para incluir la validación del formato
  canSelectFile(): boolean {
    if (this.activeTab === "late") {
      return !!(
        this.selectedDocument &&
        (!this.selectedDocument.is_periodic || this.selectedPeriod) &&
        this.selectedFormat
      );
    }
    return true;
  }

  canUpload(): boolean {
    if (!this.selectedFile) return false;

    if (this.activeTab === "late") {
      const hasRequiredFields = !!(
        this.selectedDocument &&
        (!this.selectedDocument.is_periodic || this.selectedPeriod) &&
        this.selectedFormat
      );

      return hasRequiredFields;
    }

    return !!this.selectedDocumentForUpload;
  }

  getNodePadding(node: any): number {
    // Nivel 0 (period): 12px
    // Nivel 1 (format): 32px
    // Nivel 2 (file): 52px
    return node.level * 20 + 12;
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

  getUploadProgress(file: any): string {
    const totalRequired = file.min_documents_needed || 1;
    const uploadedCount =
      file.uploaded_count ||
      (file.uploaded_files ? file.uploaded_files.length : 0) ||
      0;

    return `${uploadedCount}/${totalRequired}`;
  }

  // Agrega estos métodos a tu componente

  getIncompletePeriodicFiles(): any[] {
    return this.requiredFiles.filter((file) => {
      // Solo documentos periódicos activos
      if (!file.is_periodic || !file.is_active) return false;

      // Verifica si tiene periodos incompletos
      return file.periods.some(
        (period) => !period.is_active && !this.isPeriodComplete(period, file)
      );
    });
  }

  hasAvailablePeriods(file: any): boolean {
    if (!file.is_periodic) return false;

    // Verifica si hay periodos pasados incompletos
    return file.periods.some(
      (period) => !period.is_active && !this.isPeriodComplete(period, file)
    );
  }

  getIncompletePeriods(): any[] {
    if (!this.selectedDocument) return [];

    // Filtra directamente los periodos que ya tenemos cargados
    return this.pastPeriods.filter(
      (period) => !this.isPeriodComplete(period, this.selectedDocument)
    );
  }

  isPeriodComplete(period: any, file?: any): boolean {
    const document = file || this.selectedDocument;
    if (!document) return false;

    // Verifica si el periodo está completo
    const uploadedFiles = this.uploadedFiles.filter(
      (f) =>
        f.required_file_id === document.required_file_id &&
        f.period_id === period.period_id
    );

    return uploadedFiles.length >= (document.min_documents_needed || 1);
  }

  onTabChange(tab: string) {
    this.activeTab = tab;
    if (tab === "regular") {
      this.resetLateUploadForm();
    }
  }

  resetLateUploadForm() {
    this.selectedDocument = null;
    this.selectedPeriod = null;
    this.selectedFormat = "";
    this.selectedFile = null;
    this.pastPeriods = [];
    this.availableFormats = [];
  }
}
