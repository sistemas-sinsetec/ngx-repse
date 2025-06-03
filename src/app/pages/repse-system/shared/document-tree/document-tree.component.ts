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
  expirationDate?: Date;
  isExpired?: boolean;
  isLate?: boolean;
  status?: string; // Agregado para verificar si es "late"
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
export class DocumentTreeComponent implements OnChanges {
  @Input() showExpired: boolean = false;
  @Input() catalog: any;
  @Input() searchQuery: string;

  shouldDisplay(node: CatalogNode): boolean {
    return this.showExpired || !node.isExpired;
  }
  //GET DE LOS INCON
  // FUNCIÓN PARA OBTENER EL ÍCONO (YA LA TIENES)
  public getIcon(type: string, expired: boolean, isLate: boolean): string {
    // Mantener íconos originales sin cambios de estado
    switch (type) {
      case "type":
        return "folder-outline";
      case "periodicity":
        return "calendar-outline";
      case "period":
        return "clock-outline";
      case "format":
        return "file-text-outline";
      case "file":
        // Para archivos, usar íconos según estado
        if (isLate) return "file-outline";
        if (expired) return "file-remove-outline";
        return "file-outline";
      default:
        return "file-outline";
    }
  }

  // FUNCIÓN FALTANTE PARA TAMAÑO DE ÍCONOS (AGREGAR ESTA)
  public getIconSize(level: number): string {
    switch (level) {
      case 0: // Tipo (carpeta principal)
        return "1.8rem";
      case 1: // Periodicidad (año/mes/semana)
        return "1.5rem";
      case 2: // Periodo (fecha específica)
        return "1.5rem";
      case 3: // Formato (tipo de archivo)
        return "1.3rem";
      case 4: // Archivo individual
        return "1.2rem";
      default:
        return "1.2rem";
    }
  }

  columns = ["name", "actions"];
  dataSource: NbTreeGridDataSource<CatalogNode>;
  treeData: TreeNode<CatalogNode>[] = [];

  constructor(
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<CatalogNode>,
    private documentService: DocumentService
  ) {}

  // Añadir estas funciones si no existen
  private parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.catalog) {
      this.treeData = Array.isArray(this.catalog)
        ? this.transformToTree(this.catalog)
        : [];

      this.dataSource = this.dataSourceBuilder.create(this.treeData);
    }

    if (changes.searchQuery) {
      this.filterTree();
    }
  }

  // Añade esta función para determinar si un nodo es hoja (archivo)
  public isFileNode(node: TreeNode<CatalogNode>): boolean {
    return node.data.type === "file";
  }

  private transformToTree(data: any): TreeNode<CatalogNode>[] {
    if (!Array.isArray(data)) return [];

    return data.map((docType: any) => {
      return {
        data: {
          name: docType.name,
          type: "type",
        },
        expanded: false, // Tipo expandido
        children: docType.periodicities.map((periodicity: any) => {
          const periodicityName =
            !periodicity.type || periodicity.type === "sin periodicidad"
              ? "Sin periodicidad"
              : `${periodicity.count ?? ""} ${periodicity.type ?? ""}`.trim();

          return {
            data: {
              name: periodicityName,
              type: "periodicity",
            },
            expanded: true, // Periodicidad expandida
            children: periodicity.periods.map((period: any) => {
              // Calcular si el periodo está expirado
              const isPeriodExpired = this.isExpired(period.end_date);

              // Construir nombre del periodo
              const periodName =
                period.start_date === "sin periodicidad" ||
                period.end_date === "" ||
                period.end_date === "9999-12-31"
                  ? "Sin periodicidad"
                  : `${period.start_date} - ${period.end_date}`;

              return {
                data: {
                  name: periodName,
                  type: "period",
                  expired: isPeriodExpired,
                },
                expanded: false, // PERIODO COLAPSADO (cambio clave)
                children: period.formats.map((fmt: any) => {
                  return {
                    data: {
                      name: fmt.code?.toUpperCase() || "",
                      type: "format",
                      expired: isPeriodExpired, // Hereda del periodo
                    },
                    expanded: false, // FORMATO COLAPSADO (cambio clave)
                    children: fmt.files.map((file: any) => {
                      const expirationDate = file.expiry_date
                        ? this.parseLocalDate(file.expiry_date)
                        : null;

                      const isExpiredFile = file.is_expired === 1;
                      const isLateFile = file.status === "late";
                      const formattedDate = expirationDate
                        ? this.formatDate(expirationDate)
                        : "";

                      return {
                        data: {
                          name: file.file_path?.split("/").pop() || "",
                          type: "file",
                          path: file.file_path,
                          expired: isExpiredFile,
                          isLate: isLateFile,
                          expirationDate: expirationDate,
                          statusText: isExpiredFile
                            ? `Vencido el ${formattedDate}`
                            : isLateFile
                            ? "Retrasado"
                            : "",
                        },
                      };
                    }),
                  };
                }),
              };
            }),
          };
        }),
      };
    });
  }

  private formatDate(date: Date): string {
    if (!date) return "";
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  private isExpired(endDate: string): boolean {
    if (!endDate || endDate === "9999-12-31") return false;
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

  getLevelClass(level: number): string {
    // Asignar clases CSS basadas en el nivel del nodo
    return (
      [
        "level-type", // Nivel 0: Tipo de documento
        "level-periodicity", // Nivel 1: Periodicidad
        "level-period", // Nivel 2: Periodo
        "level-format", // Nivel 3: Formato
        "level-file", // Nivel 4: Archivo
      ][level] || ""
    );
  }
}
