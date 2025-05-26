import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { FormControl } from "@angular/forms";
import { NbDialogRef, NbDialogService, NbToastrService } from "@nebular/theme";
import { HttpClient, HttpParams } from "@angular/common/http";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../../../environments/environment";
import { CompanyService } from "../../../../services/company.service";
import * as moment from "moment";
import {
  Requirement,
  Partner,
  DocumentService,
} from "../../../../services/repse/document.service";

@Component({
  selector: "ngx-requirements-assignment",
  templateUrl: "./requirements-assignment.component.html",
  styleUrls: ["./requirements-assignment.component.scss"],
})
export class RequirementsAssignmentComponent implements OnInit {
  companyId!: number;

  requirements: Requirement[] = [];
  documentTypes: { id: number; name: string }[] = [];
  availableFormats: { id: number; name: string; extension: string }[] = [];
  lastUpdated?: moment.Moment;

  @ViewChild("partnerModal") partnerModalTemplate!: TemplateRef<any>;
  @ViewChild("confirmOverrideModal")
  confirmOverrideModalTemplate!: TemplateRef<any>;

  selectedRequirement!: Requirement;
  allPartners: Partner[] = [];
  filteredPartners: Partner[] = [];
  initialVisibleIds: number[] = [];
  searchControl = new FormControl("");
  affiliationFilter = new FormControl("todos");
  allSelected = false;
  dialogRef!: NbDialogRef<any>;
  overrideDialogRef!: NbDialogRef<any>;

  constructor(
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private companyService: CompanyService,
    private documentService: DocumentService
  ) {}

  ngOnInit(): void {
    this.companyId = this.companyService.selectedCompany.id;
    this.documentService.getDocumentTypes().subscribe({
      next: (types) => (this.documentTypes = types),
      error: (err) => console.error("Error cargando tipos de documento", err),
    });

    this.documentService.getAvailableFormats().subscribe({
      next: (formats) => (this.availableFormats = formats),
      error: (err) => console.error("Error cargando formatos", err),
    });

    this.loadRequirements();
  }
  /*repuesta de la tabal de requisitos configurados (fecha) */

  // requirements-assignment.component.ts
  loadRequirements(): void {
    this.documentService.getCompanyRequirements(this.companyId).subscribe({
      next: (reqs) => {
        this.requirements = reqs.map((req) => ({
          ...req,
          startDate: new Date(req.startDate),
          endDate: req.endDate,
          // Mapear endDate
        }));
      },
      error: (err) => console.error("Error cargando requisitos", err),
    });
  }

  /*  Funciones para visibilidad de socios  */

  openPartnerModal(req: Requirement): void {
    this.selectedRequirement = req;

    const vis$ = this.documentService.getVisibilities(req.id);
    const bp$ = this.documentService.getBusinessPartners(this.companyId);

    forkJoin([bp$, vis$]).subscribe({
      next: ([partners, vis]) => {
        this.initialVisibleIds = vis
          .filter((v) => v.is_visible === 1)
          .map((v) => v.provider_id);

        this.allPartners = partners.map((p) => ({
          ...p,
          selected: this.initialVisibleIds.includes(p.id),
        }));
        this.filteredPartners = [...this.allPartners];
        this.updateAllSelected();

        this.dialogRef = this.dialogService.open(this.partnerModalTemplate, {
          context: { title: `Socios que pueden ver ${req.documentType}` },
          hasScroll: true,
        });
      },
      error: (err) =>
        console.error("Error cargando socios o visibilidades", err),
    });
  }

  filterPartners(): void {
    const term = this.searchControl.value?.toLowerCase() || "";
    const aff = this.affiliationFilter.value;
    this.filteredPartners = this.allPartners.filter(
      (p) =>
        p.name.toLowerCase().includes(term) &&
        (aff === "todos" || p.affiliation === aff)
    );
    this.updateAllSelected();
  }

  toggleAllSelected(checked: boolean): void {
    this.filteredPartners.forEach((p) => (p.selected = checked));
    this.allPartners.forEach((p) => {
      if (this.filteredPartners.some((fp) => fp.id === p.id)) {
        p.selected = checked;
      }
    });
    this.allSelected = checked;
  }

  updateAllSelected(): void {
    this.allSelected = this.filteredPartners.every((p) => p.selected);
  }

  someSelected(): boolean {
    return this.filteredPartners.some((p) => p.selected) && !this.allSelected;
  }

  savePartnersSelection(): void {
    const toAdd = this.allPartners.filter(
      (p) => p.selected && !this.initialVisibleIds.includes(p.id)
    );
    const toRemove = this.initialVisibleIds.filter(
      (id) => !this.allPartners.some((p) => p.id === id && p.selected)
    );

    toAdd.forEach((p) => {
      this.documentService
        .addVisibility(this.selectedRequirement.id, p.id)
        .subscribe();
    });

    toRemove.forEach((id) => {
      this.documentService
        .removeVisibility(this.selectedRequirement.id, id)
        .subscribe();
    });

    this.selectedRequirement.partnerCount = this.allPartners.filter(
      (p) => p.selected
    ).length;
    this.initialVisibleIds = this.allPartners
      .filter((p) => p.selected)
      .map((p) => p.id);

    this.dialogRef.close();
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  confirmOverrideAndSubmit(): void {
    this.overrideDialogRef?.close();
  }
}
