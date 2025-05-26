import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import {
  NbTreeGridDataSource,
  NbTreeGridDataSourceBuilder,
} from "@nebular/theme";
import { DocumentService } from "../../../../services/repse/document.service";

interface CatalogNode {
  name: string;
  type: "type" | "periodicity" | "period" | "format" | "file";
  path?: string;
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
  @Input() catalog: any[] = [];
  @Input() searchQuery: string = "";

  getIconClass(type: string): string {
    switch (type) {
      case "type":
        return "level-type";
      case "periodicity":
        return "level-periodicity";
      case "period":
        return "level-period";
      case "format":
        return "level-format";
      case "file":
        return "level-file";
      default:
        return "";
    }
  }

  columns = ["name", "actions"];
  dataSource: NbTreeGridDataSource<CatalogNode>;
  treeData: TreeNode<CatalogNode>[] = [];

  constructor(
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<CatalogNode>,
    private documentService: DocumentService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.catalog) {
      this.treeData = this.transformToTree(this.catalog);
      this.dataSource = this.dataSourceBuilder.create(this.treeData);
    }

    if (changes.searchQuery) {
      this.filterTree();
    }
  }
  // a entrar solo se puede abrir cuando se hace click a los objetivos
  transformToTree(data: any): TreeNode<CatalogNode>[] {
    return data.map((docType: any) => ({
      data: { name: docType.name, type: "type" },
      expanded: false, // Cambiado de true a false
      children: docType.periodicities.map((periodicity: any) => ({
        data: {
          name:
            !periodicity.type || periodicity.type === "sin periodicidad"
              ? "Sin periodicidad"
              : `${periodicity.count ?? ""} ${periodicity.type ?? ""}`.trim(),
          type: "periodicity",
        },
        expanded: false, // Cambiado de true a false
        children: periodicity.periods.map((period: any) => ({
          data: {
            name:
              period.start_date === "sin periodicidad" ||
              period.end_date === "" ||
              period.end_date === "9999-12-31"
                ? "Sin periodicidad"
                : `${period.start_date} - ${period.end_date}`,
            type: "period",
          },
          expanded: false, // Cambiado de true a false
          children: period.formats.map((fmt: any) => ({
            data: { name: fmt.code?.toUpperCase() || "", type: "format" },
            expanded: false, // Cambiado de true a false
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
