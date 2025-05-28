import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import {
  NbTreeGridDataSource,
  NbTreeGridDataSourceBuilder,
} from "@nebular/theme";
import { DocumentService } from "../../../../services/repse/document.service";

export interface CatalogNode {
  name: string;
  type: "type" | "periodicity" | "period" | "format" | "file";
  path?: string;
  expirationDate?: Date; // Propiedad renombrada/agregada
  isExpired?: boolean; // Nombre correcto de la propiedad
  children?: CatalogNode[];
}

interface TreeNode<T> {
  data: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
}

@Component({
  selector: "ngx-document-tree",
  templateUrl: "./document-tree.component.html",
  styleUrls: ["./document-tree.component.scss"],
})
export class DocumentTreeComponent {
  // Inputs que reciben datos del componente padre
  @Input() showExpired: boolean = false;
  @Input() catalog: CatalogNode[];
  @Input() searchQuery: string;

  // Lógica para determinar si un nodo debe mostrarse
  shouldDisplay(node: CatalogNode): boolean {
    return this.showExpired || !node.isExpired;
  }

  getIcon(type: string, expired: boolean): string {
    if (expired) return "file-remove-outline";

    switch (type) {
      case "type":
        return "folder-outline";
      case "periodicity":
        return "calendar-outline";
      case "period":
        return "clock-outline";
      case "format":
      case "file":
        return "file-outline";
      default:
        return "file-outline";
    }
  }

  columns = ["name", "actions"];
  dataSource: NbTreeGridDataSource<CatalogNode>;
  treeData: TreeNode<CatalogNode>[] = [];

  constructor(
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<CatalogNode>,
    private documentService: DocumentService
  ) {}

  private parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day); // Sin hora -> evita problemas de zona horaria
  }

  private processExpiration(documents: CatalogNode[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    documents.forEach((doc) => {
      if (doc.expirationDate) {
        const expirationDate = new Date(doc.expirationDate);
        expirationDate.setHours(0, 0, 0, 0);
        doc.isExpired = expirationDate < today;
      }
      if (doc.children) this.processExpiration(doc.children);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.catalog) {
      this.treeData = this.transformToTree(this.catalog);
      this.dataSource = this.dataSourceBuilder.create(this.treeData);
    }

    if (changes.searchQuery) {
      this.filterTree();
    }
  }

  //actualizacion de caltalogo de documento
  transformToTree(data: any): TreeNode<CatalogNode>[] {
    return data.map((docType: any) => {
      const periodicityNodes = docType.periodicities.map((periodicity: any) => {
        const periodNodes = periodicity.periods.map((period: any) => {
          const isExpired = this.isExpired(period.end_date);

          return {
            data: {
              name:
                period.start_date === "sin periodicidad" ||
                period.end_date === "" ||
                period.end_date === "9999-12-31"
                  ? "Sin periodicidad"
                  : `${period.start_date} - ${period.end_date}`,
              type: "period",
              expired: isExpired,
            },
            expanded: isExpired,
            children: period.formats.map((fmt: any) => ({
              data: {
                name: fmt.code?.toUpperCase() || "",
                type: "format",
                expired: isExpired,
              },
              expanded: false,
              children: fmt.files.map((file: any) => ({
                data: {
                  name: file.file_path?.split("/").pop() || "",
                  type: "file",
                  path: file.file_path,
                  // Modificación clave: Verificar vencimiento por archivo
                  expired: file.is_expired === 1, // ¡Nuevo!
                  expirationDate: file.expiry_date
                    ? this.parseLocalDate(file.expiry_date)
                    : null,
                  // Agregado aquí
                },
              })),
            })),
          };
        });

        const shouldExpandPeriodicity = periodNodes.some((p) => p.expanded);

        return {
          data: {
            name:
              !periodicity.type || periodicity.type === "sin periodicidad"
                ? "Sin periodicidad"
                : `${periodicity.count ?? ""} ${periodicity.type ?? ""}`.trim(),
            type: "periodicity",
          },
          expanded: shouldExpandPeriodicity,
          children: periodNodes,
        };
      });

      const shouldExpandType = periodicityNodes.some((p) => p.expanded);

      return {
        data: { name: docType.name, type: "type" },
        expanded: shouldExpandType,
        children: periodicityNodes,
      };
    });
  }

  // Modificar el método isExpired para aceptar cualquier fecha
  private isExpired(endDate: string): boolean {
    if (!endDate || endDate === "9999-12-31") return false;

    // Manejar formato ISO 8601 con timestamp
    const date = new Date(endDate);
    const today = new Date();

    return date < today;
  }

  filterTree(): void {
    const query = this.searchQuery.toLowerCase();
    const filtered = this.filterTreeNodes(this.treeData, query);
    this.dataSource = this.dataSourceBuilder.create(filtered);
  }

  private filterTreeNodes(
    nodes: TreeNode<CatalogNode>[],
    query: string
  ): TreeNode<CatalogNode>[] {
    return nodes
      .map((node) => {
        const children = node.children
          ? this.filterTreeNodes(node.children, query)
          : [];
        const matches = node.data.name.toLowerCase().includes(query);

        if (matches) {
          return { ...node, children: node.children || [], expanded: false };
        } else if (children.length > 0) {
          return { ...node, children, expanded: true };
        }
        return null;
      })
      .filter((n) => n !== null) as TreeNode<CatalogNode>[];
  }

  downloadFile(path: string): void {
    this.documentService.downloadFile(path);
  }

  ggetIcon(type: string, expired: boolean): string {
    if (expired) return "file-remove-outline"; // Icono para documentos vencidos

    switch (type) {
      case "type":
        return "folder-outline"; // Primer nivel: Carpeta REPSE
      case "periodicity":
        return "calendar-outline"; // Periodicidad (anual, mensual)
      case "period":
        return "clock-outline"; // Un período específico
      case "format":
      case "file":
        return "file-outline"; // Documentos activos
      default:
        return "file-outline"; // Valor por defecto
    }
  }

  getLevelClass(level: number): string {
    return (
      [
        "level-type",
        "level-periodicity",
        "level-period",
        "level-format",
        "level-file",
      ][level] || ""
    );
  }
}
