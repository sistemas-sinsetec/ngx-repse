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
  path?: string;
}

interface TreeNode<T> {
  data: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
}

@Component({
  selector: "ngx-companies-documents-view",
  templateUrl: "./companies-documents-view.component.html",
  styleUrls: ["./companies-documents-view.component.scss"],
})
export class CompaniesDocumentsViewComponent implements OnInit {
  providers: any[] = [];
  selectedProviderId: number;
  treeData: TreeNode<CatalogNode>[] = [];
  providerFiles: NbTreeGridDataSource<CatalogNode>;
  columns = ["name", "actions"];
  searchQuery = "";

  constructor(
    private documentService: DocumentService,
    private companyService: CompanyService,
    private dataSourceBuilder: NbTreeGridDataSourceBuilder<CatalogNode>
  ) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.documentService
      .getProviderFiles(this.companyService.selectedCompany.id)
      .subscribe((response) => {
        this.providers = response;
      });
  }

  onProviderChange(): void {
    const selected = this.providers.find(
      (p) => p.id === this.selectedProviderId
    );
    if (selected && selected.catalog && selected.catalog.length) {
      this.treeData = this.transformToTree(selected.catalog);
      this.providerFiles = this.dataSourceBuilder.create(this.treeData);
    } else {
      this.treeData = [];
      this.providerFiles = this.dataSourceBuilder.create([]);
    }
  }

  transformToTree(data: any): TreeNode<CatalogNode>[] {
    return data.map((docType: any) => ({
      data: { name: docType.name, type: "type" },
      expanded: true,
      children: docType.periodicities.map((periodicity: any) => ({
        data: {
          name:
            !periodicity.type || periodicity.type === "sin periodicidad"
              ? "Sin periodicidad"
              : `${periodicity.count ?? ""} ${periodicity.type ?? ""}`.trim(),
          type: "periodicity",
        },
        expanded: true,
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
    this.providerFiles = this.dataSourceBuilder.create(filtered);
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
