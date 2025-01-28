import { Component, OnInit } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
import { CompanyService } from '../services/company.service';
import { PeriodService } from '../services/period.service';
import { SharedService } from '../services/shared.service'; // <-- Importamos SharedService

@Component({
  selector: 'app-select-company-period-dialog',
  templateUrl: './select-company-period-dialog.component.html',
  styleUrls: ['./select-company-period-dialog.component.scss'],
})
export class SelectCompanyPeriodDialogComponent implements OnInit {
  // Listas a mostrar en la interfaz
  companies: any[] = [];
  title: string = '';
  // Lista de periodos según la empresa seleccionada
  periods: any[] = [];

  // Selecciones del usuario
  selectedCompanyId: string | null = null;
  selectedPeriodId: string | null = null;

  constructor(
    protected dialogRef: NbDialogRef<SelectCompanyPeriodDialogComponent>,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private sharedService: SharedService, // <-- Añadimos SharedService
  ) {}

  ngOnInit(): void {
    // Copiar empresas desde CompanyService
    this.companies = this.companyService.principalCompanies;

    // Preseleccionar la empresa si ya existe
    if (this.companyService.selectedCompany && this.companyService.selectedCompany.id) {
      this.selectedCompanyId = this.companyService.selectedCompany.id;
      this.loadPeriodsForCompany(this.selectedCompanyId);
    }

    // Preseleccionar período si ya existe
    if (this.periodService.selectedPeriod) {
      this.selectedPeriodId = this.periodService.selectedPeriod.id;
    }
  }

  /**
   * Cargar los períodos cuando cambia la empresa seleccionada.
   */
  async onCompanyChange() {
    if (this.selectedCompanyId) {
      await this.loadPeriodsForCompany(this.selectedCompanyId);
    } else {
      this.periods = [];
      this.selectedPeriodId = null;
    }
  }

  /**
   * Obtener períodos para la empresa seleccionada.
   */
  async loadPeriodsForCompany(companyId: string) {
    try {
      const data = await this.periodService.loadPeriodTypes(companyId);
      this.periods = data;      // Actualiza los períodos
      this.selectedPeriodId = null;  // Reinicia la selección
    } catch (error) {
      console.error('Error al cargar periodos:', error);
      this.periods = [];
      this.selectedPeriodId = null;
    }
  }

  /**
   * Confirmar selección de empresa y período.
   */
 /**
 * Confirmar selección de empresa y período.
 */
async confirm(): Promise<void> {
  if (this.selectedCompanyId && this.selectedPeriodId) {
    const selectedCompany = this.companies.find(
      (company) => company.id === this.selectedCompanyId,
    );
    if (selectedCompany) {
      await this.companyService.selectAndLoadCompany(selectedCompany);
    }

    const selectedPeriod = this.periods.find(
      (period) => period.id === this.selectedPeriodId,
    );
    if (selectedPeriod) {
      this.periodService.setSelectedPeriod(selectedPeriod);
    }

    // Cargar permisos (ejemplo)
    this.sharedService.loadPermissions().subscribe(
      (response: any) => {
        this.sharedService.permissions = response.permissions || [];
        console.log('Permisos actualizados:', this.sharedService.permissions);
      },
      (error) => {
        console.error('Error al cargar permisos:', error);
      },
    );

    // Cerrar el diálogo y devolver valores
    this.dialogRef.close({
      companyId: this.selectedCompanyId,
      periodId: this.selectedPeriodId,
    });

    // Aquí recargas la página por completo
    window.location.reload();
  } else {
    alert('Por favor, selecciona una empresa y un período antes de confirmar.');
  }
}


  /**
   * Cerrar el diálogo sin aplicar cambios.
   */
  close(): void {
    this.dialogRef.close();
  }
}
