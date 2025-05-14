import { Component, OnInit } from "@angular/core";
import {
  NbTreeGridDataSourceBuilder,
  NbTreeGridDataSource,
} from "@nebular/theme";
import { DocumentService } from "../../../../services/repse/document.service";
import { CompanyService } from "../../../../services/company.service";

interface CatalogNode {
  name: string;
  type: "type" | "periodicity" | "period" | "format" | "file";
  path?: string; // solo para documentos
}

interface TreeNode<T> {
  data: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
}

@Component({
  selector: "ngx-document-catalog",
  templateUrl: "./document-catalog.component.html",
  styleUrls: ["./document-catalog.component.scss"],
})
export class DocumentCatalogComponent implements OnInit {
  columns = ["name", "actions"];
  dataSource!: NbTreeGridDataSource<CatalogNode>;
  treeData: TreeNode<CatalogNode>[] = [];
  searchQuery = "";

  constructor(
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<CatalogNode>,
    private documentService: DocumentService,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.documentService
      .getFullCatalog(this.companyService.selectedCompany.id)
      .subscribe((structure) => {
        this.treeData = this.transformToTree(structure);
        this.dataSource = this.dataSourceBuilder.create(this.treeData);
      });
  }

  transformToTree(data: any): TreeNode<CatalogNode>[] {
    return data.map((docType: any) => ({
      data: { name: docType.name, type: "type" },
      expanded: true,
      children: docType.periodicities.map((periodicity: any) => ({
        data: {
          name:
            periodicity.type === "sin periodicidad"
              ? "Sin periodicidad"
              : `${periodicity.count ?? ""} ${periodicity.type ?? ""}`.trim(),

          type: "periodicity",
        },
        expanded: true,
        children: periodicity.periods.map((period: any) => ({
          data: {
            name: period.end_date
              ? `${period.start_date} - ${period.end_date}`
              : period.start_date,

            type: "period",
          },
          expanded: true,
          children: period.formats.map((fmt: any) => ({
            data: { name: fmt.code?.toUpperCase() || "", type: "format" },
            expanded: true,
            children: fmt.files.map((file: any) => ({
              data: {
                name: file.file_path?.split("/").pop() || "",
                type: "file",
                path: file.file_path,
              },
            })),
          })),
        })),
      })),
    }));
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
          // Si coincide, muestra todos sus hijos originales, pero cerrado
          return {
            ...node,
            children: node.children || [],
            expanded: false, // Aquí lo dejamos cerrado
          };
        } else if (children.length > 0) {
          // Si no coincide, pero hijos sí, muestra solo esos hijos filtrados, también cerrado
          return {
            ...node,
            children,
            expanded: true, // También cerrado
          };
        }
        return null;
      })
      .filter((n) => n !== null) as TreeNode<CatalogNode>[];
  }

  downloadFile(path: string): void {
    this.documentService.downloadFile(path);
  }

  getIcon(type: string): string {
    return (
      {
        type: "folder-outline",
        periodicity: "calendar-outline",
        period: "clock-outline",
        format: "file-text-outline",
        file: "file-outline",
      }[type] || "file-outline"
    );
  }

  getLevelClass(level: number): string {
    switch (level) {
      case 0:
        return "level-type";
      case 1:
        return "level-periodicity";
      case 2:
        return "level-period";
      case 3:
        return "level-format";
      case 4:
        return "level-file";
      default:
        return "";
    }
  }
}
