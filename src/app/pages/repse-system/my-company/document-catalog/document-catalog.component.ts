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
  catalog: any[] = [];
  searchQuery = "";

  constructor(
    private documentService: DocumentService,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.documentService
      .getCompanyFiles(this.companyService.selectedCompany.id)
      .subscribe((structure) => {
        this.catalog = structure;
      });
  }

  filterTree(): void {
    // delegamos al componente hijo
  }
}
