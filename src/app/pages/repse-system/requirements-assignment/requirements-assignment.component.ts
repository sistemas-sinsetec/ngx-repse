import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { NbDialogRef, NbDialogService } from "@nebular/theme";
import { HttpClient, HttpParams } from "@angular/common/http";
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

@Component({
  selector: "ngx-requirements-assignment",
  templateUrl: "./requirements-assignment.component.html",
  styleUrls: ["./requirements-assignment.component.scss"],
})
export class RequirementsAssignmentComponent implements OnInit {
  requirementsForm: FormGroup;
  requirements: Requirement[] = [];

  documentTypes: { id: number; name: string }[] = [];
  periodTypes = ["semanas", "meses", "años"];

  private fileTypesUrl = `${environment.apiBaseUrl}/file_types.php`;
  private reqFilesUrl = `${environment.apiBaseUrl}/company_required_files.php`;

  // Modal partners
  @ViewChild("partnerModal") partnerModalTemplate!: TemplateRef<any>;
  selectedRequirement!: Requirement;
  allPartners: any[] = [];
  filteredPartners: any[] = [];
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
    this.requirementsForm = this.fb.group({
      documentType: [null, Validators.required],
      isPeriodic: [false],
      periodAmount: [null],
      periodType: ["semanas"],
      startDate: [null],
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

  private loadDocumentTypes(): void {
    this.http.get<any[]>(this.fileTypesUrl).subscribe({
      next: (types) => {
        this.documentTypes = types.map((t) => ({
          id: t.file_type_id,
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
            partners: [],
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
    req.isActive = !req.isActive;
    // Aquí podrías hacer PUT a reqFilesUrl para guardar el cambio
  }

  private getAvailablePartners(): any[] {
    return [
      { id: 1, name: "Socio 1", affiliation: "proveedor" },
      { id: 2, name: "Socio 2", affiliation: "cliente" },
      { id: 3, name: "Socio 3", affiliation: "proveedor/cliente" },
      { id: 4, name: "Socio 4", affiliation: "cliente" },
    ];
  }

  openPartnerModal(req: Requirement): void {
    this.selectedRequirement = req;
    this.allPartners = this.getAvailablePartners().map((p) => ({
      ...p,
      selected: req.partners.includes(p.name),
    }));
    this.filteredPartners = [...this.allPartners];
    this.updateAllSelected();

    this.dialogRef = this.dialogService.open(this.partnerModalTemplate, {
      context: { title: `Socios que pueden ver ${req.documentType}` },
      hasScroll: true,
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
      if (this.filteredPartners.some((fp) => fp.id === p.id))
        p.selected = checked;
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
    this.selectedRequirement.partners = this.allPartners
      .filter((p) => p.selected)
      .map((p) => p.name);
    this.dialogRef.close();
    // Aquí guardas la visibilidad en el backend
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
