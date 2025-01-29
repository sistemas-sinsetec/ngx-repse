import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService } from '@nebular/theme';
import { NbComponentStatus } from '@nebular/theme';
import { LoadingController } from '@ionic/angular'; // Importar LoadingController
import { SelectCompanyPeriodDialogComponent } from '../../../../select-company-period-dialog/select-company-period-dialog.component';
import { NbDialogService } from '@nebular/theme';
import { Router } from '@angular/router';
@Component({
  selector: 'ngx-initial-periods',
  templateUrl: './initial-periods.component.html',
  styleUrls: ['./initial-periods.component.scss']
})
export class InitialPeriodsComponent {
  periodoSemanal: boolean = false;
  periodoQuincenal: boolean = false;
  periodoMensual: boolean = false;
  fechaSemanal: string;
  fechaQuincenal: string;
  fechaMensual: string;
  minDate: string;
  maxDate: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private toastrService: NbToastrService,
    private loadingController: LoadingController, // Inyectar LoadingController
    private dialogService: NbDialogService,
    private router: Router
  ) {}

  private showToast(message: string, status: NbComponentStatus) {
    this.toastrService.show(
      message,
      'Información',
      {
        status: status,
        duration: 3000,
      }
    );
  }

  async guardarConfiguracion() {
    // Validar que se haya seleccionado al menos un período
    if (!this.periodoSemanal && !this.periodoQuincenal && !this.periodoMensual) {
      this.showToast("Debes seleccionar al menos un período", 'danger');
      return;
    }
  
    // Validar que se haya seleccionado una fecha para el período habilitado
    if (
      (this.periodoSemanal && !this.fechaSemanal) ||
      (this.periodoQuincenal && !this.fechaQuincenal) ||
      (this.periodoMensual && !this.fechaMensual)
    ) {
      this.showToast("Debes seleccionar una fecha para el período habilitado", 'danger');
      return;
    }
  
    // Mostrar el indicador de carga
    const loading = await this.loadingController.create({
      message: 'Guardando configuración...',
    });
    await loading.present();
  
    const companyId = this.companyService.selectedCompany.id;
    const periodos: Periodo[] = [];
  
    if (this.periodoSemanal) {
      const ejercicio = new Date(this.fechaSemanal).getFullYear();
      periodos.push({
        nombretipoperiodo: 'Semanal',
        diasdelperiodo: 7,
        diasdepago: 6,
        periodotrabajo: 1,
        modificarhistoria: 1,
        ajustarperiodoscalendario: 0,
        numeroseptimos: 1,
        posicionseptimos: 7,
        posicionpagonomina: 6,
        fechainicioejercicio: this.fechaSemanal,
        ejercicio: ejercicio,
        ccalculomescalendario: 0,
        PeriodicidadPago: '02'
      });
      this.showToast("Periodo semanal guardado correctamente", 'success');
    }
  
    if (this.periodoQuincenal) {
      const ejercicio = new Date(this.fechaQuincenal).getFullYear();
      periodos.push({
        nombretipoperiodo: 'Quincenal',
        diasdelperiodo: 15,
        diasdepago: 15,
        periodotrabajo: 1,
        modificarhistoria: 0,
        ajustarperiodoscalendario: 1,
        numeroseptimos: 0,
        posicionseptimos: null,
        posicionpagonomina: 15,
        fechainicioejercicio: this.fechaQuincenal,
        ejercicio: ejercicio,
        ccalculomescalendario: 0,
        PeriodicidadPago: '04'
      });
      this.showToast("Periodo quincenal guardado correctamente", 'success');
    }
  
    if (this.periodoMensual) {
      const ejercicio = new Date(this.fechaMensual).getFullYear();
      periodos.push({
        nombretipoperiodo: 'Mensual',
        diasdelperiodo: 30,
        diasdepago: 30,
        periodotrabajo: 1,
        modificarhistoria: 0,
        ajustarperiodoscalendario: 1,
        numeroseptimos: 0,
        posicionseptimos: null,
        posicionpagonomina: 30,
        fechainicioejercicio: this.fechaMensual,
        ejercicio: ejercicio,
        ccalculomescalendario: 0,
        PeriodicidadPago: '05'
      });
      this.showToast("Periodo mensual guardado correctamente", 'success');
    }
  
    const configuracion = {
      companyId: companyId,
      periodos: periodos
    };
  
    this.http.post('https://siinad.mx/php/save-periods.php', configuracion)
      .subscribe(async (response: any) => {
        console.log('Configuración guardada correctamente', response);
  
        const periodTypesData = response.periods;
        const periodTypes = periodTypesData.map((p: any) => ({
          period_type_name: p.period_type_name,
          period_type_id: p.period_type_id
        }));
  
        await this.createPayrollPeriods(periodTypes, periodos[0]);
  
        localStorage.setItem('isFirstTime', 'false');
        this.resetForm(); // Limpiar el formulario después de guardar
        loading.dismiss(); // Ocultar el indicador de carga

        this.router.navigate(['/dashboard']);

        this.dialogService.open(SelectCompanyPeriodDialogComponent, {
       
        });
      }, error => {
        console.error('Error al guardar la configuración', error);
        loading.dismiss(); // Ocultar el indicador de carga en caso de error
      });
  }


  async createPayrollPeriods(periodTypes: { period_type_name: string, period_type_id: number }[], periodo: Periodo) {
    if (!Array.isArray(periodTypes)) {
      console.error('periodTypes debe ser un array');
      return;
    }

    if (periodTypes.length === 0) {
      console.warn('No se seleccionaron tipos de periodos');
      return;
    }

    const companyId = this.companyService.selectedCompany.id;
    const startDate = new Date(periodo.fechainicioejercicio);
    const fiscalYear = startDate.getFullYear();

    for (const periodTypeData of periodTypes) {
      const periodType = periodTypeData.period_type_name;
      const periodTypeId = periodTypeData.period_type_id;

      const totalPeriods = periodType === 'Semanal' ? 52 :
        periodType === 'Quincenal' ? 24 :
          12;

      let currentStartDate = startDate;

      for (let i = 0; i < totalPeriods; i++) {
        let periodEndDate: Date = new Date(currentStartDate);

        if (periodType === 'Semanal' || periodType === 'Quincenal') {
          periodEndDate.setDate(currentStartDate.getDate() + periodo.diasdelperiodo - 1);
        } else if (periodType === 'Mensual') {
          periodEndDate.setMonth(currentStartDate.getMonth() + 1);
          periodEndDate.setDate(0);
        }

        const month = currentStartDate.getMonth() + 1;
        const isMonthStart = currentStartDate.getDate() === 1;
        const isMonthEnd = periodEndDate.getDate() === new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() + 1, 0).getDate();
        const isFiscalStart = i === 0;
        const isFiscalEnd = i === totalPeriods - 1;

        const payrollPeriod = {
          company_id: companyId,
          period_type_id: periodTypeId,
          period_number: i + 1,
          fiscal_year: fiscalYear,
          month: month,
          payment_days: periodo.diasdelperiodo,
          rest_days: periodo.numeroseptimos,
          interface_check: 0,
          net_modification: 0,
          calculated: 0,
          affected: 0,
          start_date: currentStartDate.toISOString().split('T')[0],
          end_date: periodEndDate.toISOString().split('T')[0],
          fiscal_start: isFiscalStart ? 1 : 0,
          month_start: isMonthStart ? 1 : 0,
          month_end: isMonthEnd ? 1 : 0,
          fiscal_end: isFiscalEnd ? 1 : 0,
          timestamp: new Date().toISOString().split('T')[0],
          imss_bimonthly_start: 0,
          imss_bimonthly_end: 0,
          payment_date: null
        };

        try {
          await this.http.post('https://siinad.mx/php/create-payroll-period.php', payrollPeriod).toPromise();
          console.log(`Periodo de nómina ${i + 1} creado correctamente para ${periodType}`);
        } catch (error) {
          console.error(`Error al crear el periodo de nómina ${i + 1} para ${periodType}`, error);
          break;
        }

        currentStartDate = new Date(periodEndDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      }
    }
  }


  resetForm() {
    this.periodoSemanal = false;
    this.periodoQuincenal = false;
    this.periodoMensual = false;
    this.fechaSemanal = null;
    this.fechaQuincenal = null;
    this.fechaMensual = null;
  }

}

interface Periodo {
  nombretipoperiodo: string;
  diasdelperiodo: number;
  diasdepago: number;
  periodotrabajo: number;
  modificarhistoria: number;
  ajustarperiodoscalendario: number;
  numeroseptimos: number | null;
  posicionseptimos: number | null;
  posicionpagonomina: number;
  fechainicioejercicio: string;
  ejercicio: number;
  ccalculomescalendario: number;
  PeriodicidadPago: string;
}