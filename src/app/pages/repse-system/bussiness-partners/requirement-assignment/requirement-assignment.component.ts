import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HttpClient, HttpParams } from "@angular/common/http";
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
  company_name?: string;
  status?: string;
}

interface FileFormat {
  id: number;
  name: string;
  extension: string;
  selected: boolean;
  minQuantity: number;
}
interface Partner {
  id: number;
  name: string;
  affiliation: string;
  selected: boolean;
}

@Component({
  selector: "ngx-requirement-assignment",
  templateUrl: "./requirement-assignment.component.html",
  styleUrls: ["./requirement-assignment.component.scss"],
})
export class RequirementAssignmentComponent implements OnInit {
  requirementsForm: FormGroup;
  requirements: Requirement[] = [];
  minDate: moment.Moment;
  fileFormats: FileFormat[] = [];
  businessPartners: Partner[] = [];

  documentTypes: { id: number; name: string }[] = [];
  periodTypes = ["semanas", "meses", "años"];

  private fileTypesUrl = `${environment.apiBaseUrl}/file_types.php`;
  private assignedRequirementsUrl = `${environment.apiBaseUrl}/company_assigned_requirements.php`;
  private bpUrl = `${environment.apiBaseUrl}/getBusinessPartner.php`;
  private fileFormatsUrl = `${environment.apiBaseUrl}/file_formats.php`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private companyService: CompanyService
  ) {
    this.minDate = moment();

    this.requirementsForm = this.fb.group({
      provider: [null, Validators.required],
      documentType: [null, Validators.required],
      isPeriodic: [false],
      periodAmount: [null],
      periodType: ["semanas"],
      startDate: [null as moment.Moment | null],
    });

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
    this.loadAssignedRequirements();
    this.loadFileFormats();
    this.loadBusinessPartners();
  }

  private loadFileFormats(): void {
    this.http
      .get<{ code: string; name: string; mime: string }[]>(this.fileFormatsUrl)
      .subscribe({
        next: (list) => {
          this.fileFormats = list.map((f, i) => ({
            id: i + 1, // o cualquier otra lógica
            name: f.name,
            extension: f.code,
            selected: false,
            minQuantity: 1,
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

  private loadAssignedRequirements(): void {
    const assignedBy = this.companyService.selectedCompany.id;
    const params = new HttpParams().set("assigned_by", assignedBy.toString());

    this.http.get<any[]>(this.assignedRequirementsUrl, { params }).subscribe({
      next: (configs) => {
        this.requirements = configs.map((cfg) => ({
          id: cfg.required_file_id,
          documentType: cfg.document_name, // Cambiado de 'name' a 'document_name'
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
          company_name: cfg.company_name,
          status: cfg.status,
        }));
      },
      error: (err) => console.error("Error cargando requisitos", err),
    });
  }

  onSubmit(): void {
    if (this.requirementsForm.invalid) return;

    const formValue = this.requirementsForm.value;

    // Asegúrate que los valores numéricos sean números
    const payload: any = {
      company_id: Number(formValue.provider),
      assigned_by: Number(this.companyService.selectedCompany.id),
      file_type_id: Number(formValue.documentType),
      is_periodic: Boolean(formValue.isPeriodic),
      file_formats: this.fileFormats
        .filter((f) => f.selected)
        .map((f) => ({
          format_code: f.extension,
          min_quantity: Number(f.minQuantity),
        })),
      start_date: formValue.startDate || moment().format("YYYY-MM-DD"),
    };

    if (formValue.isPeriodic) {
      payload.periodicity_type = formValue.periodType;
      payload.periodicity_count = Number(formValue.periodAmount);
    }

    // Verifica que los formatos estén seleccionados
    if (payload.file_formats.length === 0) {
      console.error("Debe seleccionar al menos un formato de archivo");
      return;
    }

    this.http.post(this.assignedRequirementsUrl, payload).subscribe({
      next: (response: any) => {
        // Actualizar la lista después de guardar
        this.loadAssignedRequirements();
        this.resetForm();
      },
      error: (err) => {
        console.error("Error guardando configuración:", err);
        // Mostrar mensaje de error al usuario
      },
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
    this.http.put(this.assignedRequirementsUrl, payload).subscribe({
      next: () => (req.isActive = !req.isActive),
      error: (err) => console.error("Error toggle active", err),
    });
  }

  private loadBusinessPartners(): void {
    const params = new HttpParams().set(
      "association_id",
      this.companyService.selectedCompany.id.toString()
    );

    this.http
      .get<any[]>(this.bpUrl, { params })
      .pipe(
        map((list) =>
          list
            .filter((p) => p.roleName.toLowerCase() === "proveedor") // Filtrar solo proveedores
            .map((p) => ({
              id: +p.businessPartnerId,
              name: p.nameCompany,
              affiliation: p.roleName,
              selected: false,
            }))
        )
      )
      .subscribe({
        next: (filteredPartners) => {
          this.businessPartners = filteredPartners;
        },
        error: (err) => console.error("Error cargando proveedores", err),
      });
  }

  private resetForm(): void {
    this.requirementsForm.reset({
      isPeriodic: false,
      periodType: "semanas",
    });

    this.fileFormats.forEach((format) => {
      format.selected = false;
      format.minQuantity = 1;
    });
  }

  getStatusColor(status: string): string {
    return (
      {
        complete: "success",
        partial: "warning",
        pending: "info",
        overdue: "danger",
      }[status] || "basic"
    );
  }

  getStatusLabel(status: string): string {
    return (
      {
        complete: "Completo",
        partial: "Parcial",
        pending: "Pendiente",
        overdue: "Atrasado",
      }[status] || status
    );
  }
}
