import { HttpClient } from "@angular/common/http";
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import * as moment from "moment";
import { DocumentService } from "../../../../services/repse/document.service";
import { NbDialogRef, NbDialogService, NbToastrService } from "@nebular/theme";

@Component({
  selector: "ngx-requirement-assignment-form",
  templateUrl: "./requirement-assignment-form.component.html",
  styleUrls: ["./requirement-assignment-form.component.scss"],
})
export class RequirementAssignmentFormComponent implements OnInit {
  @Input() isForCompany: boolean = true;
  @Input() providers: { id: number; name: string }[] = [];
  @Input() assignedByCompanyId!: number;
  @Input() documentTypes: { id: number; name: string }[] = [];
  @Input() availableFormats: { id: number; name: string; extension: string }[] =
    [];

  @Output() formSubmitted = new EventEmitter<void>();

  @ViewChild("overrideModal") overrideModal!: TemplateRef<any>;
  overrideRef!: NbDialogRef<any>;

  form: FormGroup;
  fileFormats: any[] = [];

  expiryUnits = ["días", "semanas", "meses", "años"];
  periodTypes = ["semanas", "meses", "años"];

  manualGeneration = {
    automatic: true,
    count: null as number | null,
  };

  previewGeneratedPeriods: { start: string; end: string }[] = [];
  manualValidationError: string | null = null;
  pendingPayload: any = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private documentService: DocumentService,
    private toastService: NbToastrService,
    private dialogService: NbDialogService
  ) {
    this.form = this.fb.group({
      provider: [null],
      documentType: [null, Validators.required],
      isPeriodic: [false],
      periodAmount: [null],
      periodType: ["semanas"],
      startDate: [null],
    });
  }

  ngOnInit(): void {
    if (!this.isForCompany) {
      this.form.get("provider")?.setValidators([Validators.required]);
    }

    this.form.get("isPeriodic")?.valueChanges.subscribe((isPeriodic) => {
      const periodAmount = this.form.get("periodAmount");
      const periodType = this.form.get("periodType");
      const startDate = this.form.get("startDate");

      if (isPeriodic) {
        periodAmount?.setValidators([Validators.required, Validators.min(1)]);
        periodType?.setValidators([Validators.required]);
        startDate?.setValidators([Validators.required]);
      } else {
        periodAmount?.clearValidators();
        periodType?.clearValidators();
        startDate?.clearValidators();

        this.form.patchValue({
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

  submit(): void {
    if (this.form.invalid || this.fileFormats.length === 0) return;

    for (const f of this.fileFormats) {
      if (!f.expiryVisible && (!f.expiryValue || !f.expiryUnit)) return;
    }

    if (!this.manualGeneration.automatic) {
      if (!this.manualGeneration.count || this.manualGeneration.count < 1) {
        this.manualValidationError = "Cantidad inválida de periodos.";
        return;
      }
    }

    const f = this.form.value;
    const payload: any = {
      company_id: this.isForCompany ? this.assignedByCompanyId : f.provider,
      assigned_by: this.assignedByCompanyId,
      file_type_id: f.documentType,
      is_periodic: f.isPeriodic,
      start_date: f.startDate || moment().format("YYYY-MM-DD"),
      file_formats: this.buildFormatPayload(),
    };

    if (f.isPeriodic) {
      payload.periodicity_type = f.periodType;
      payload.periodicity_count = f.periodAmount;

      if (!this.manualGeneration.automatic) {
        payload.manual_generation = true;
        payload.manual_range = {
          start_date: payload.start_date,
          period_count: this.manualGeneration.count,
        };
      }
    }

    // Verificar si ya hay una configuración previa
    this.documentService.getOwnRequiredFiles(payload.company_id).subscribe({
      next: (existing) => {
        const sameDoc = existing.find(
          (e) =>
            e.name ===
            this.documentTypes.find((d) => d.id === payload.file_type_id)?.name
        );

        if (sameDoc) {
          this.pendingPayload = payload;
          this.overrideRef = this.dialogService.open(this.overrideModal);
        } else {
          this.sendPayload(payload);
        }
      },
      error: () => {
        // Si falla la verificación, de todos modos intentamos guardar
        this.sendPayload(payload);
      },
    });
  }

  proceedWithOverride(): void {
    this.overrideRef.close();
    if (this.pendingPayload) {
      this.sendPayload(this.pendingPayload);
      this.pendingPayload = null;
    }
  }

  private sendPayload(payload: any): void {
    this.documentService.saveRequiredFile(payload).subscribe({
      next: () => {
        this.form.reset(); // Limpia el formulario
        this.fileFormats = []; // Vacía los formatos
        this.manualGeneration = { automatic: true, count: null }; // Reset manual
        this.previewGeneratedPeriods = []; // Limpia vista previa

        this.toast("Configuración guardada correctamente.", "success");
        this.formSubmitted.emit();
      },
      error: (err) => {
        const serverError = err?.error?.error;
        const lastDate = err?.error?.last_movement_date;

        let msg = serverError || "Error al guardar la configuración.";

        if (lastDate) {
          msg += ` Última fecha registrada: ${lastDate}`;
        }

        this.toast(msg, "danger");

        //const msg = err?.error?.error || "Error al guardar la configuración.";
        // this.toast(msg, "danger");
      },
    });
  }
  //correccion de la notificacion
  toast(message: string, status: "success" | "danger" | "info" | "warning") {
    const titleMap: { [key: string]: string } = {
      success: "Éxito",
      danger: "Error",
      info: "Información",
      warning: "Advertencia",
    };

    this.toastService.show(message, titleMap[status] || "Mensaje", {
      status,
      duration: 5000,
      icon: "alert-circle-outline",
    });
  }

  buildFormatPayload() {
    return this.fileFormats.map((f) => ({
      format_code: f.extension,
      min_quantity: f.minQuantity,
      expiry_visible: f.expiryVisible,
      expiry_value: f.expiryVisible ? null : f.expiryValue,
      expiry_unit: f.expiryVisible ? null : f.expiryUnit,
    }));
  }

  addFormat(): void {
    if (this.fileFormats.length >= this.availableFormats.length) return;
    this.fileFormats.push({
      extension: "",
      minQuantity: 1,
      expiryVisible: true,
      expiryValue: 1,
      expiryUnit: "días",
    });
  }

  removeFormat(index: number): void {
    this.fileFormats.splice(index, 1);
  }

  getAvailableOptions(currentIndex: number) {
    const selected = this.fileFormats
      .filter((_, i) => i !== currentIndex)
      .map((f) => f.extension);
    return this.availableFormats.filter((f) => !selected.includes(f.extension));
  }

  onExpiryVisibleChange(format: any): void {
    if (format.expiryVisible) {
      format.expiryValue = 1;
      format.expiryUnit = "días";
    } else {
      format.expiryValue = null;
      format.expiryUnit = null;
    }
  }

  isFormValid(): boolean {
    if (this.form.invalid || this.fileFormats.length === 0) return false;
    for (const format of this.fileFormats) {
      if (!format.extension) return false;
      if (!format.expiryVisible && (!format.expiryValue || !format.expiryUnit))
        return false;
    }
    return true;
  }

  onAutoGenerationChange(isAutomatic: boolean): void {
    this.manualGeneration.automatic = isAutomatic;
    if (isAutomatic) {
      this.manualGeneration.count = null;
      this.previewGeneratedPeriods = [];
    } else {
      this.generatePeriodPreview();
    }
  }

  generatePeriodPreview(): void {
    this.previewGeneratedPeriods = [];

    const f = this.form.value;
    const count = this.manualGeneration.count;
    if (!count || count < 1) return;

    const periodAmount = f.periodAmount;
    const periodType = f.periodType;
    const startRaw = f.startDate;

    if (!periodAmount || !periodType || !startRaw) return;

    const start = moment(startRaw).startOf("day");
    let interval: moment.Duration;

    switch (periodType.toLowerCase()) {
      case "días":
        interval = moment.duration(periodAmount, "days");
        break;
      case "semanas":
        interval = moment.duration(periodAmount * 7, "days");
        break;
      case "meses":
        interval = moment.duration(periodAmount, "months");
        break;
      case "años":
        interval = moment.duration(periodAmount, "years");
        break;
      default:
        return;
    }

    let currentStart = start.clone();
    for (let i = 0; i < count; i++) {
      const currentEnd = currentStart.clone().add(interval).subtract(1, "day");
      this.previewGeneratedPeriods.push({
        start: currentStart.format("YYYY/MM/DD"),
        end: currentEnd.format("YYYY/MM/DD"),
      });
      currentStart = currentEnd.clone().add(1, "day");
    }
  }

  showManualPeriodOptions(): boolean {
    const start = this.form.get("startDate")?.value;
    return !!start && moment(start).isBefore(moment(), "day");
  }

  forceDatePicker(event: Event): void {
    const input = event.target as HTMLInputElement;

    input.removeAttribute("readonly");
    input.showPicker?.(); // Solo navegadores compatibles

    input.addEventListener(
      "change",
      () => {
        input.setAttribute("readonly", "true");
        this.validateDate();
      },
      { once: true }
    );
  }

  preventManualInput(event: KeyboardEvent | ClipboardEvent): void {
    event.preventDefault();
  }

  validateDate(): void {
    // Por ahora no hacemos validaciones aquí
  }

  get periodSegments() {
    const periods = this.previewGeneratedPeriods;
    if (periods.length === 0) return { first: [], middle: [], last: null };

    if (periods.length <= 4) {
      return { first: periods, middle: [], last: null };
    }

    const first = periods.slice(0, 2);
    const middle = periods.slice(2, -1);
    const last = periods[periods.length - 1];

    return { first, middle, last };
  }

  get middlePeriodsTooltip(): string {
    return this.periodSegments.middle
      .map((p) => `(${p.start} al ${p.end})`)
      .join(", ");
  }
}
