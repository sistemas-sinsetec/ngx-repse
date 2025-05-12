import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { NbDialogRef, NbDialogService } from "@nebular/theme";
import { HttpClient, HttpParams } from "@angular/common/http";
import { forkJoin, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "../../../../../environments/environment";
import { CompanyService } from "../../../../services/company.service";
import * as moment from "moment";

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
}

interface FileFormat {
  id: number;
  name: string;
  extension: string;
  selected: boolean;
  minQuantity: number;
  expiryVisible: boolean;
  expiryValue?: number | null;
  expiryUnit?: string | null;
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
  minDate: moment.Moment;
  fileFormats: FileFormat[] = [];

  documentTypes: { id: number; name: string }[] = [];
  periodTypes = ["semanas", "meses", "años"];

  private fileTypesUrl = `${environment.apiBaseUrl}/file_types.php`;
  private reqFilesUrl = `${environment.apiBaseUrl}/company_required_files.php`;
  private visibUrl = `${environment.apiBaseUrl}/required_file_visibilities.php`;
  private bpUrl = `${environment.apiBaseUrl}/getBusinessPartner.php`;
  private fileFormatsUrl = `${environment.apiBaseUrl}/file_formats.php`;

  @ViewChild("partnerModal") partnerModalTemplate!: TemplateRef<any>;
  selectedRequirement!: Requirement;
  allPartners: Partner[] = [];
  filteredPartners: Partner[] = [];
  initialVisibleIds: number[] = [];
  searchControl = new FormControl("");
  affiliationFilter = new FormControl("todos");
  allSelected = false;
  private dialogRef!: NbDialogRef<any>;
  expiryUnits = ["días", "semanas", "meses", "años"];

  constructor(
    private fb: FormBuilder,
    private dialogService: NbDialogService,
    private http: HttpClient,
    private companyService: CompanyService
  ) {
    this.minDate = moment();

    this.requirementsForm = this.fb.group({
      documentType: [null, Validators.required],
      isPeriodic: [false],
      periodAmount: [null],
      periodType: ["semanas"],
      startDate: [null as moment.Moment | null],
    });

    // Si es periódico, agregamos validadores requeridos
    this.requirementsForm
      .get("isPeriodic")
      ?.valueChanges.subscribe((isPeriodic) => {
        const periodAmount = this.requirementsForm.get("periodAmount");
        const periodType = this.requirementsForm.get("periodType");
        const startDate = this.requirementsForm.get("startDate");

        if (isPeriodic) {
          periodAmount?.setValidators([Validators.required, Validators.min(1)]);
          periodType?.setValidators([Validators.required]);
          startDate?.setValidators([Validators.required]);
        } else {
          periodAmount?.clearValidators();
          periodType?.clearValidators();
          startDate?.clearValidators();

          this.requirementsForm.patchValue({
            periodAmount: null,
            periodType: "semanas",
            startDate: null,
          });
        }

        periodAmount?.updateValueAndValidity();
        periodType?.updateValueAndValidity();
        startDate?.updateValueAndValidity();
      });
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadRequirements();
    this.loadFileFormats();
    // Podrías cargar los formatos desde el servicio si los tienes allí
    // this.loadFileFormats();
  }

  availableFormats: { id: number; name: string; extension: string }[] = [];

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

  onFormatToggle(idx: number): void {
    const fmt = this.fileFormats[idx];
    fmt.selected = !fmt.selected;
    if (!fmt.selected) {
      fmt.minQuantity = 1;
    }
  }

  private loadDocumentTypes(): void {
    this.http.get<any[]>(this.fileTypesUrl).subscribe({
      next: (types) => {
        this.documentTypes = types
          // primero filtramos los activos (si viene como "1" o como número 1)
          .filter((t) => Number(t.is_active) === 1)
          // luego mapeamos al formato usado
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

    this.http.get<any[]>(this.reqFilesUrl, { params }).subscribe({
      next: (configs) => {
        this.requirements = configs.map((cfg) => ({
          id: cfg.required_file_id,
          documentType: cfg.name,
          isActive: true, // en tu PHP sólo envías activos
          isPeriodic: cfg.is_periodic === 1,
          periodAmount: cfg.periodicity_count,
          periodType: cfg.periodicity_type,
          startDate: cfg.current_period
            ? moment(cfg.current_period.start_date)
            : undefined,
          minQuantity: cfg.min_documents_needed,
          partners: [], // aquí pones lo que necesites
          partnerCount: cfg.partner_count,
          formats: cfg.formats,
        }));
      },
      error: (err) => console.error("Error cargando requisitos", err),
    });
  }

  onSubmit(): void {
    if (this.requirementsForm.invalid) return;

    if (this.fileFormats.length === 0) {
      console.error("Debe agregar al menos un formato.");
      return;
    }

    for (const f of this.fileFormats) {
      if (!f.expiryVisible && (!f.expiryValue || !f.expiryUnit)) {
        console.error(
          `Formato ${f.name} requiere cantidad y unidad de vigencia.`
        );
        return;
      }
    }

    const f = this.requirementsForm.value;
    const companyId = this.companyService.selectedCompany.id;
    const assigned_by = this.companyService.selectedCompany.id;
    const startDate = f.startDate || "";

    // Obtener formatos seleccionados
    const selectedFormats = this.fileFormats.map((f) => {
      const found = this.availableFormats.find(
        (af) => af.extension === f.extension
      );
      return {
        format_code: f.extension,
        min_quantity: f.minQuantity,
        expiry_visible: f.expiryVisible,
        expiry_value: f.expiryValue,
        expiry_unit: f.expiryUnit,
        name: found ? found.name : "",
      };
    });

    const payload = {
      company_id: companyId,
      assigned_by: assigned_by,
      file_type_id: f.documentType,
      is_periodic: f.isPeriodic,
      periodicity_type: f.periodType,
      periodicity_count: f.periodAmount,
      file_formats: selectedFormats,
      start_date: startDate,
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
            startDate: f.isPeriodic ? moment(f.startDate) : undefined,
            minQuantity: selectedFormats.reduce(
              (sum, fmt) => sum + fmt.min_quantity,
              0
            ),
            partners: [],
            partnerCount: 0,
          });
          this.requirementsForm.reset({
            documentType: null,
            isPeriodic: false,
            periodType: "semanas",
          });

          // Resetear los formatos
          this.fileFormats.forEach((format) => {
            format.selected = false;
            format.minQuantity = 1;
          });
        },
        error: (err) => console.error("Error guardando configuración", err),
      });
  }

  logSelectedDate(): void {
    const selectedDate = this.requirementsForm.get("startDate")?.value;
    const isPeriodic = this.requirementsForm.get("isPeriodic")?.value;

    console.log("--- Información de fecha ---");
    console.log("Fecha cruda:", selectedDate);

    if (selectedDate) {
      const date = moment(selectedDate);
      console.log("Fecha formateada (DD/MM/YYYY):", date.format("DD/MM/YYYY"));
      console.log("Día de la semana:", date.format("dddd"));
      console.log("Es periódico:", isPeriodic ? "Sí" : "No");

      if (isPeriodic) {
        const periodAmount = this.requirementsForm.get("periodAmount")?.value;
        const periodType = this.requirementsForm.get("periodType")?.value;
        console.log(`Periodicidad: Cada ${periodAmount} ${periodType}`);
      }
    } else {
      console.log("No hay fecha seleccionada");
    }
  }

  forceDatePicker(event: Event): void {
    const input = event.target as HTMLInputElement;

    input.removeAttribute("readonly");
    // Abre el datepicker nativo
    input.showPicker();

    // Restaura el estado 'readonly' después de seleccionar
    input.addEventListener(
      "change",
      () => {
        input.setAttribute("readonly", "true");
        this.validateDate(); // Validación adicional
      },
      { once: true }
    );
  }

  preventManualInput(event: KeyboardEvent | ClipboardEvent): void {
    event.preventDefault(); // Bloquea cualquier entrada manual
  }

  validateDate(): void {
    const selectedDate = this.requirementsForm.get("startDate")?.value;
    const minDate = this.minDate.format("YYYY-MM-DD");

    if (selectedDate && selectedDate < minDate) {
      // Si la fecha es menor al mínimo, la resetea
      this.requirementsForm.get("startDate")?.setValue(minDate);
      console.warn("Fecha no válida. Se ajustó al mínimo permitido.");
    }
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
          id: +p.businessPartnerId,
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

  addFormat(): void {
    if (this.fileFormats.length >= this.availableFormats.length) {
      return;
    }

    this.fileFormats.push({
      id: Date.now(),
      name: "",
      extension: "",
      selected: true,
      minQuantity: 1,
      expiryVisible: true,
      expiryValue: null,
      expiryUnit: null,
    });
  }

  removeFormat(index: number): void {
    this.fileFormats.splice(index, 1);
  }

  getAvailableOptions(currentIndex: number) {
    const selectedExtensions = this.fileFormats
      .filter((_, idx) => idx !== currentIndex)
      .map((f) => f.extension);

    return this.availableFormats.filter(
      (opt) => !selectedExtensions.includes(opt.extension)
    );
  }
}
