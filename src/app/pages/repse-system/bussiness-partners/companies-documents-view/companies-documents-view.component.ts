import { Component, OnInit } from "@angular/core";
import { DocumentService } from "../../../../services/repse/document.service";
import { CompanyService } from "../../../../services/company.service";

@Component({
  selector: "ngx-companies-documents-view",
  templateUrl: "./companies-documents-view.component.html",
  styleUrls: ["./companies-documents-view.component.scss"],
})
export class CompaniesDocumentsViewComponent implements OnInit {
  providers: any[] = [];
  selectedProviderId: number;
  selectedCatalog: any[] = [];
  searchQuery = "";

  constructor(
    private documentService: DocumentService,
    private companyService: CompanyService
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
    this.selectedCatalog = selected?.catalog || [];
  }
}
