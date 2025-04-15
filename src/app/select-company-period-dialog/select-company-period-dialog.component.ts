import { Component, OnInit } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
import { CompanyService } from '../services/company.service';
import { PeriodService } from '../services/period.service';
import { SharedService } from '../services/shared.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-select-company-period-dialog',
  templateUrl: './select-company-period-dialog.component.html',
  styleUrls: ['./select-company-period-dialog.component.scss'],
})
export class SelectCompanyPeriodDialogComponent implements OnInit {
  companies: any[] = [];
  title: string = '';
  periods: any[] = [];
  selectedCompanyId: string | null = null;
  selectedPeriodId: string | null = null;

  // Getter para verificar el rol del usuario
  get isAllowedUser(): boolean {
    const allowedLevels = ['adminE', 'adminEE', 'adminS'];
    if (!this.selectedCompanyId) return false;
    
    const selectedCompany = this.companies.find(company => 
      company.id === this.selectedCompanyId
    );
    
    return selectedCompany ? 
      allowedLevels.includes(selectedCompany.levelUser) : 
      false;
  }

  constructor(
    protected dialogRef: NbDialogRef<SelectCompanyPeriodDialogComponent>,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private sharedService: SharedService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.companies = this.companyService.principalCompanies;

    if (this.companyService.selectedCompany?.id) {
      this.selectedCompanyId = this.companyService.selectedCompany.id;
      this.loadPeriodsForCompany(this.selectedCompanyId);
    }

    if (this.periodService.selectedPeriod) {
      this.selectedPeriodId = this.periodService.selectedPeriod.id;
    }
  }

  // Resto de tus métodos existentes sin cambios...
  async onCompanyChange() {
    if (this.selectedCompanyId) {
      await this.loadPeriodsForCompany(this.selectedCompanyId);
    } else {
      this.periods = [];
      this.selectedPeriodId = null;
    }
  }

  async loadPeriodsForCompany(companyId: string) {
    try {
      const data = await this.periodService.loadPeriodTypes(companyId);
      this.periods = data;
      this.selectedPeriodId = null;
    } catch (error) {
      console.error('Error al cargar periodos:', error);
      this.periods = [];
      this.selectedPeriodId = null;
    }
  }

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

      this.sharedService.loadPermissions().subscribe(
        (response: any) => {
          this.sharedService.permissions = response.permissions || [];
        },
        (error) => {
          console.error('Error al cargar permisos:', error);
        },
      );

      this.dialogRef.close({
        companyId: this.selectedCompanyId,
        periodId: this.selectedPeriodId,
      });

      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/pages/dashboard']);
      });
    } else {
      alert('Por favor, selecciona una empresa y un período antes de confirmar.');
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  navigateToNewPeriodPage(): void {
    this.periodService.setSelectedPeriod({ id: 'temp', name: 'Sin período', year: null });
    this.dialogRef.close({
      companyId: this.selectedCompanyId,
      periodId: 'temp',
    });
    this.router.navigate(['/pages/settings/my-company/initial-periods']);
  }
}