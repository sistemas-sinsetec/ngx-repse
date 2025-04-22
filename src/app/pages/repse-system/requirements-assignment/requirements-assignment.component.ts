import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { NbDialogRef, NbDialogService } from "@nebular/theme";

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
  documentTypes = [
    "RFC",
    "Constancia de Situación Fiscal",
    "Identificación Oficial",
    "Comprobante de Domicilio",
    "Acta Constitutiva",
  ];
  periodTypes = ["semanas", "meses", "años"];
  private allPartners: any[] = [];

  constructor(private fb: FormBuilder, private dialogService: NbDialogService) {
    this.requirementsForm = this.fb.group({
      documentType: ["", Validators.required],
      isPeriodic: [false],
      periodAmount: [null],
      periodType: ["semanas"],
      startDate: [null],
      minQuantity: [1, [Validators.required, Validators.min(1)]],
    });

    // Resetear valores cuando se desactiva periodicidad
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
    // Cargar datos existentes
    this.loadRequirements();
  }

  loadRequirements(): void {
    // Aquí iría la llamada a la API
    this.requirements = [
      {
        id: 1,
        documentType: "RFC",
        isActive: true,
        isPeriodic: true,
        periodAmount: 6,
        periodType: "meses",
        startDate: new Date("2023-01-01"),
        minQuantity: 1,
        partners: ["Socio 1", "Socio 3"],
      },
    ];
  }

  onSubmit(): void {
    if (this.requirementsForm.valid) {
      const formValue = this.requirementsForm.value;
      const newRequirement: Requirement = {
        id: this.requirements.length + 1,
        documentType: formValue.documentType,
        isActive: true,
        isPeriodic: formValue.isPeriodic,
        periodAmount: formValue.isPeriodic ? formValue.periodAmount : null,
        periodType: formValue.isPeriodic ? formValue.periodType : null,
        startDate: formValue.isPeriodic ? formValue.startDate : null,
        minQuantity: formValue.minQuantity,
        partners: [],
      };

      this.requirements.push(newRequirement);
      this.requirementsForm.reset({
        isPeriodic: false,
        periodType: "meses",
        minQuantity: 1,
      });
    }
  }

  toggleActive(requirement: Requirement): void {
    requirement.isActive = !requirement.isActive;
    // Aquí iría la llamada para actualizar en el backend
  }

  private getAvailablePartners(): any[] {
    // Esto debería venir de la API
    return [
      { id: 1, name: "Socio 1", affiliation: "proveedor" },
      { id: 2, name: "Socio 2", affiliation: "cliente" },
      { id: 3, name: "Socio 3", affiliation: "proveedor/cliente" },
      { id: 2, name: "Socio 4", affiliation: "cliente" },
    ];
  }

  @ViewChild("partnerModal") partnerModalTemplate!: TemplateRef<any>;

  selectedRequirement!: Requirement;
  filteredPartners: any[] = [];
  searchControl = new FormControl("");
  affiliationFilter = new FormControl("todos");
  allSelected = false;
  private dialogRef!: NbDialogRef<any>;

  openPartnerModal(requirement: Requirement): void {
    this.selectedRequirement = requirement;
    const allPartners = this.getAvailablePartners();

    // Mapear todos los socios con su estado actual
    this.filteredPartners = allPartners.map((partner) => ({
      ...partner,
      selected: requirement.partners.includes(partner.name),
    }));

    // Guardar una copia de todos los socios con su estado
    this.allPartners = [...this.filteredPartners];

    this.dialogRef = this.dialogService.open(this.partnerModalTemplate, {
      context: {
        title: `Socios que pueden ver ${requirement.documentType}`,
      },
      hasScroll: true,
    });
  }

  filterPartners(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || "";
    const filter = this.affiliationFilter.value;

    // Filtrar los socios pero mantener el estado de selección
    this.filteredPartners = this.allPartners.filter(
      (partner) =>
        partner.name.toLowerCase().includes(searchTerm) &&
        (filter === "todos" || partner.affiliation === filter)
    );

    this.updateAllSelected();
  }

  toggleAllSelected(checked: boolean): void {
    // Actualizar solo los socios visibles
    this.filteredPartners.forEach((partner) => {
      partner.selected = checked;
      // Actualizar también en allPartners para mantener consistencia
      const originalPartner = this.allPartners.find((p) => p.id === partner.id);
      if (originalPartner) {
        originalPartner.selected = checked;
      }
    });

    this.allSelected = checked;
  }

  updateAllSelected(): void {
    this.allSelected = this.filteredPartners.every(
      (partner) => partner.selected
    );
  }

  someSelected(): boolean {
    return (
      this.filteredPartners.some((partner) => partner.selected) &&
      !this.allSelected
    );
  }

  savePartnersSelection(): void {
    // Guardar todos los socios que estén seleccionados (no solo los visibles)
    this.selectedRequirement.partners = this.allPartners
      .filter((partner) => partner.selected)
      .map((partner) => partner.name);

    this.dialogRef.close();
    // Aquí añadir la llamada para guardar en el backend
  }

  closeModal(): void {
    this.dialogRef.close();
  }
}
