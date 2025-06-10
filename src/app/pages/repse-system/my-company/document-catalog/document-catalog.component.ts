import { Component, OnInit } from "@angular/core";
import { DocumentService } from "../../../../services/repse/document.service";
import { CompanyService } from "../../../../services/company.service";

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
}
