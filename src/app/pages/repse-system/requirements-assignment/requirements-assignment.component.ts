import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { NbDialogRef, NbDialogService } from "@nebular/theme";
import { HttpClient, HttpParams } from "@angular/common/http";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../../environments/environment";
import { CompanyService } from "../../../services/company.service";

interface Requirement {
  id: number;
  documentType: string;
  isActive: boolean;
  isPeriodic: boolean;
  periodAmount?: number;
  periodType?: string;
  startDate?: Date;
  minQuantity: number;
  partners: string[];
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
  requirementsForm: FormGroup;
  requirements: Requirement[] = [];
  minDate: Date;

  documentTypes: { id: number; name: string }[] = [];
  periodTypes = ["semanas", "meses", "años"];

  private fileTypesUrl = `${environment.apiBaseUrl}/file_types.php`;
  private reqFilesUrl = `${environment.apiBaseUrl}/company_required_files.php`;
  private visibUrl = `${environment.apiBaseUrl}/required_file_visibilities.php`;
  private bpUrl = `${environment.apiBaseUrl}/getBusinessPartner.php`;

  @ViewChild("partnerModal") partnerModalTemplate!: TemplateRef<any>;
  selectedRequirement!: Requirement;
  allPartners: Partner[] = [];
  filteredPartners: Partner[] = [];
  initialVisibleIds: number[] = [];
  searchControl = new FormControl("");
  affiliationFilter = new FormControl("todos");
  allSelected = false;
  private dialogRef!: NbDialogRef<any>;

  constructor(
    private fb: FormBuilder,
    private dialogService: NbDialogService,
    private http: HttpClient,
    private companyService: CompanyService
  ) {
    this.minDate = new Date();
    this.minDate.setHours(0, 0, 0, 0);

    this.requirementsForm = this.fb.group({
      documentType: [null, Validators.required],
      isPeriodic: [false],
      periodAmount: [null],
      periodType: ["semanas"],
      startDate: [null, [this.validateDate.bind(this)]],
      minQuantity: [1, [Validators.required, Validators.min(1)]],
    });

    this.requirementsForm
      .get("isPeriodic")
      ?.valueChanges.subscribe((isPeriodic) => {
        if (!isPeriodic) {
          this.requirementsForm.patchValue({
            periodAmount: null,
            periodType: "semanas",
            startDate: null,
          });
        }
      });
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadRequirements();
  }

  validateDate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return { invalidDate: true };
    }
    return null;
  }

  private loadDocumentTypes(): void {
    this.http.get<any[]>(this.fileTypesUrl).subscribe({
      next: (types) => {
        this.documentTypes = types
          // primero filtramos los activos (si viene como "1" o como número 1)
          .filter((t) => Number(t.is_active) === 1)
          // luego mapeamos al formato que usas
          .map((t) => ({
            id: Number(t.file_type_id),
            name: t.name,
          }));
      },
      error: (err) => console.error("Error cargando tipos de documento", err),
    });
  }

  private loadRequirements(): void {
    const companyId = this.companyService.selectedCompany.id;
    const params = new HttpParams().set("company_id", companyId.toString());

    this.http
      .get<{ file_types: any[]; configs: any[] }>(this.reqFilesUrl, { params })
      .subscribe({
        next: (res) => {
          this.requirements = res.configs.map((cfg) => ({
            id: cfg.id,
            documentType: cfg.file_type_name,
            isActive: cfg.is_active === 1,
            isPeriodic: cfg.is_periodic === 1,
            periodAmount: cfg.periodicity_count,
            periodType: cfg.periodicity_type,
            startDate: new Date(cfg.start_date),
            minQuantity: cfg.min_documents_needed,
            // Rellenamos un array de longitud partner_count
            partners: Array(cfg.partner_count).fill(""),
          }));
        },
        error: (err) => console.error("Error cargando requisitos", err),
      });
  }

  onSubmit(): void {
    if (this.requirementsForm.invalid) return;

    const f = this.requirementsForm.value;
    const companyId = this.companyService.selectedCompany.id;
    const payload = {
      company_id: companyId,
      file_type_id: f.documentType,
      is_periodic: f.isPeriodic,
      periodicity_type: f.periodType,
      periodicity_count: f.periodAmount,
      min_documents_needed: f.minQuantity,
      start_date: f.startDate || "",
      end_date: "",
    };

    this.http
      .post<{ success: boolean; required_file_id: number }>(
        this.reqFilesUrl,
        payload
      )
      .subscribe({
        next: (resp) => {
          const dt = this.documentTypes.find((d) => d.id === f.documentType);
          this.requirements.push({
            id: resp.required_file_id,
            documentType: dt?.name || "",
            isActive: true,
            isPeriodic: f.isPeriodic,
            periodAmount: f.isPeriodic ? f.periodAmount : undefined,
            periodType: f.isPeriodic ? f.periodType : undefined,
            startDate: f.isPeriodic ? f.startDate : undefined,
            minQuantity: f.minQuantity,
            partners: [],
          });
          this.requirementsForm.reset({
            documentType: null,
            isPeriodic: false,
            periodType: "semanas",
            minQuantity: 1,
          });
        },
        error: (err) => console.error("Error guardando configuración", err),
      });
  }

  toggleActive(req: Requirement): void {
    const payload = {
      required_file_id: req.id,
      is_active: req.isActive ? 0 : 1,
    };
    this.http.put(this.reqFilesUrl, payload).subscribe({
      next: () => (req.isActive = !req.isActive),
      error: (err) => console.error("Error toggle active", err),
    });
  }

  private loadBusinessPartners(): Observable<Partner[]> {
    const params = new HttpParams().set(
      "association_id",
      this.companyService.selectedCompany.id.toString()
    );
    return this.http.get<any[]>(this.bpUrl, { params }).pipe(
      map((list) =>
        list.map((p) => ({
          id: +p.businessPartnerId, // <-- el + fuerza número
          name: p.nameCompany,
          affiliation: p.roleName,
          selected: false,
        }))
      )
    );
  }

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

    this.selectedRequirement.partners = this.allPartners
      .filter((p) => p.selected)
      .map((p) => p.name);
    this.initialVisibleIds = this.allPartners
      .filter((p) => p.selected)
      .map((p) => p.id);

    this.dialogRef.close();
  }

  closeModal(): void {
    this.dialogRef.close();
  }

  dateFilter = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };
}
