import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { NbDialogRef, NbDialogService, NbToastrService } from "@nebular/theme";
import { HttpClient, HttpParams } from "@angular/common/http";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../../../environments/environment";
import { CompanyService } from "../../../../services/company.service";
import * as moment from "moment";
import { combineLatest } from "rxjs";

interface Requirement {
  id: number;
  documentType: string;
  isActive: boolean;
  isPeriodic: boolean;
  periodAmount?: number;
  periodType?: string;
  startDate?: moment.Moment;
  minQuantity: number;
  partners: string[];
  partnerCount: number;
  formats?: any[];
}

interface Partner {
  id: number;
  name: string;
  affiliation: string;
  selected: boolean;
}

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

  private fileTypesUrl = `${environment.apiBaseUrl}/file_types.php`;
  private reqFilesUrl = `${environment.apiBaseUrl}/company_required_files.php`;
  private visibUrl = `${environment.apiBaseUrl}/required_file_visibilities.php`;
  private bpUrl = `${environment.apiBaseUrl}/getBusinessPartner.php`;
  private fileFormatsUrl = `${environment.apiBaseUrl}/file_formats.php`;

  constructor(
    private http: HttpClient,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.companyId = this.companyService.selectedCompany.id;
    this.loadDocumentTypes();
    this.loadFileFormats();
    this.loadRequirements();
  }

  public loadRequirements(): void {
    const params = new HttpParams().set(
      "company_id",
      this.companyId.toString()
    );

    this.http.get<any[]>(this.reqFilesUrl, { params }).subscribe({
      next: (configs) => {
        this.requirements = configs.map((cfg) => ({
          id: cfg.required_file_id,
          documentType: cfg.name,
          isActive: true,
          isPeriodic: cfg.is_periodic === 1,
          periodAmount: cfg.periodicity_count,
          periodType: cfg.periodicity_type,
          startDate: cfg.current_period
            ? moment(cfg.current_period.start_date)
            : undefined,
          minQuantity: cfg.min_documents_needed,
          partners: [],
          partnerCount: cfg.partner_count,
          formats: cfg.formats,
        }));
      },
      error: (err) => console.error("Error cargando requisitos", err),
    });
  }

  private loadDocumentTypes(): void {
    this.http.get<any[]>(this.fileTypesUrl).subscribe({
      next: (types) => {
        this.documentTypes = types
          .filter((t) => Number(t.is_active) === 1)
          .map((t) => ({
            id: Number(t.file_type_id),
            name: t.name,
          }));
      },
      error: (err) => console.error("Error cargando tipos de documento", err),
    });
  }

  private loadFileFormats(): void {
    this.http
      .get<{ code: string; name: string; mime: string }[]>(this.fileFormatsUrl)
      .subscribe({
        next: (list) => {
          this.availableFormats = list.map((f, i) => ({
            id: i + 1,
            name: f.name,
            extension: f.code,
          }));
        },
        error: (err) => console.error("Error cargando formatos", err),
      });
  }

  /** ▼▼▼ Funciones para visibilidad de socios ▼▼▼ */

  openPartnerModal(req: Requirement): void {
    this.selectedRequirement = req;

    const vis$ = this.http.get<
      { visibility_id: number; provider_id: number; is_visible: number }[]
    >(this.visibUrl, {
      params: new HttpParams().set("required_file_id", req.id.toString()),
    });

    const bp$ = this.loadBusinessPartners();

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

  private loadBusinessPartners(): Observable<Partner[]> {
    const params = new HttpParams().set(
      "association_id",
      this.companyId.toString()
    );
    return this.http.get<any[]>(this.bpUrl, { params }).pipe(
      map((list) =>
        list.map((p) => ({
          id: +p.businessPartnerId,
          name: p.nameCompany,
          affiliation: p.roleName,
          selected: false,
        }))
      )
    );
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
      this.http
        .post(this.visibUrl, {
          required_file_id: this.selectedRequirement.id,
          provider_id: p.id,
          is_visible: 1,
        })
        .subscribe();
    });

    toRemove.forEach((id) => {
      const params = new HttpParams()
        .set("required_file_id", this.selectedRequirement.id.toString())
        .set("provider_id", id.toString());
      this.http.delete(this.visibUrl, { params }).subscribe();
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
