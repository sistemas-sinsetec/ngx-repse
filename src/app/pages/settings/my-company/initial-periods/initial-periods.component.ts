/*
  En esta parte se pueden crear periodos iniciales, es decir con una configuracion muy basica y solo esta disponible
  desde la seleccion de empresa y periodos 
*/
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbComponentStatus, NbDialogService } from '@nebular/theme';
import { LoadingController } from '@ionic/angular';
import { SelectCompanyPeriodDialogComponent } from '../../../../select-company-period-dialog/select-company-period-dialog.component';
import { Router } from '@angular/router';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
import { environment } from '../../../../../environments/environment';

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
  ejercicioSemanal: number;
  ejercicioQuincenal: number;
  ejercicioMensual: number;
  minDate: string;
  maxDate: string;
  posicionPagoSemanal: number;
  posicionPagoQuincenal: number;
  posicionPagoMensual: number;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private toastrService: CustomToastrService,
    private loadingController: LoadingController,
    private dialogService: NbDialogService,
    private router: Router
  ) {}

  onDateChange(event: any, tipo: string) {
    console.log('Fecha seleccionada:', event);
    const fecha = new Date(event);
    if (isNaN(fecha.getTime())) {
      console.error('Fecha inválida');
      return;
    }

    const añoFiscal = fecha.getFullYear();
    switch (tipo) {
      case 'semanal':
        this.ejercicioSemanal = añoFiscal;
        break;
      case 'quincenal':
        this.ejercicioQuincenal = añoFiscal;
        break;
      case 'mensual':
        this.ejercicioMensual = añoFiscal;
        break;
      default:
        console.error('Tipo de período no válido');
        break;
    }
  }

  private getFirstSunday(startDate: Date): number {
    // Clonar la fecha para no modificar la original
    const date = new Date(startDate);

    // Encontrar el primer domingo
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() + 1);
    }
    return date.getDate();
  }

  async guardarConfiguracion() {
    // Validar que se haya seleccionado al menos un período
    if (!this.periodoSemanal && !this.periodoQuincenal && !this.periodoMensual) {
      this.toastrService.showError("Debes seleccionar al menos un período", 'danger');
      return;
    }

    // Validar que se haya seleccionado una fecha para el período habilitado
    if (
      (this.periodoSemanal && !this.fechaSemanal) ||
      (this.periodoQuincenal && !this.fechaQuincenal) ||
      (this.periodoMensual && !this.fechaMensual)
    ) {
      this.toastrService.showError("Debes seleccionar una fecha para el período habilitado", 'danger');
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
      const firstSunday = this.getFirstSunday(new Date(this.fechaSemanal));
      periodos.push({
        nombretipoperiodo: 'Semanal',
        diasdelperiodo: 7,
        diasdepago: 6,
        periodotrabajo: 1,
        modificarhistoria: 1,
        ajustarperiodoscalendario: 0,
        numeroseptimos: 1,
        posicionseptimos:  JSON.stringify([firstSunday.toString()]),
        posicionpagonomina: this.posicionPagoSemanal || 0,
        fechainicioejercicio: this.fechaSemanal,
        ejercicio: this.ejercicioSemanal,
        ccalculomescalendario: 0,
        PeriodicidadPago: '02',
      });
      this.toastrService.showSuccess("Periodo semanal guardado correctamente", 'success');
    }

    if (this.periodoQuincenal) {
      const firstSunday = this.getFirstSunday(new Date(this.fechaQuincenal));
      periodos.push({
        nombretipoperiodo: 'Quincenal',
        diasdelperiodo: 14,
        diasdepago: 15,
        periodotrabajo: 1,
        modificarhistoria: 0,
        ajustarperiodoscalendario: 1,
        numeroseptimos: 0,
        posicionseptimos:  JSON.stringify([firstSunday.toString()]),
        posicionpagonomina: this.posicionPagoQuincenal || 0,
        fechainicioejercicio: this.fechaQuincenal,
        ejercicio: this.ejercicioQuincenal,
        ccalculomescalendario: 0,
        PeriodicidadPago: '04'
      });
      this.toastrService.showSuccess("Periodo quincenal guardado correctamente", 'success');
    }

    if (this.periodoMensual) {
      const firstSunday = this.getFirstSunday(new Date(this.fechaMensual));
      periodos.push({
        nombretipoperiodo: 'Mensual',
        diasdelperiodo: 28,
        diasdepago: 28,
        periodotrabajo: 1,
        modificarhistoria: 0,
        ajustarperiodoscalendario: 1,
        numeroseptimos: 0,
        posicionseptimos:  JSON.stringify([firstSunday.toString()]),
        posicionpagonomina: this.posicionPagoMensual || 0,
        fechainicioejercicio: this.fechaMensual,
        ejercicio: this.ejercicioMensual,
        ccalculomescalendario: 0,
        PeriodicidadPago: '05'
      });
      this.toastrService.showSuccess("Periodo mensual guardado correctamente", 'success');
    }

    const configuracion = {
      companyId: companyId,
      periodos: periodos
    };

    this.http.post(`${environment.apiBaseUrl}/save-periods.php`, configuracion)
      .subscribe(async (response: any) => {
        console.log('Configuración guardada correctamente', response);

        const periodTypesData = response.periods;
        const periodTypes = periodTypesData.map((p: any) => ({
          period_type_name: p.period_type_name,
          period_type_id: p.period_type_id
        }));

        // Crea los períodos en la BD
        await this.createPayrollPeriods(periodTypes, periodos[0]);

        localStorage.setItem('isFirstTime', 'false');
        this.resetForm(); // Limpiar el formulario después de guardar
        loading.dismiss(); // Ocultar el indicador de carga

        this.router.navigate(['/dashboard']);
        this.dialogService.open(SelectCompanyPeriodDialogComponent, {});
      }, error => {
        console.error('Error al guardar la configuración', error);
        loading.dismiss(); // Ocultar el indicador de carga en caso de error
      });
  }

  private getBimesterIndex(date: Date): number {
    // Devuelve 0 para Ene-Feb, 1 para Mar-Abr, 2 para May-Jun,
    // 3 para Jul-Ago, 4 para Sep-Oct, 5 para Nov-Dic
    const month = date.getMonth() + 1; // 1..12
    return Math.floor((month - 1) / 2); 
  }

  /**
   * Ajusta la fecha `referenceDate` para que coincida con el día de la semana `targetDayOfWeek`
   * (0=Domingo, ..., 6=Sábado) más cercano. Si está equidistante, tomará la fecha anterior (por convención).
   */
  private getClosestDayOfWeek(referenceDate: Date, targetDayOfWeek: number): Date {
    const dateBefore = new Date(referenceDate);
    const dateAfter = new Date(referenceDate);

    // Retrocede hasta que coincida con targetDayOfWeek
    while (dateBefore.getDay() !== targetDayOfWeek) {
      dateBefore.setDate(dateBefore.getDate() - 1);
    }

    // Avanza hasta que coincida con targetDayOfWeek
    while (dateAfter.getDay() !== targetDayOfWeek) {
      dateAfter.setDate(dateAfter.getDate() + 1);
    }

    // Calcula qué tan lejos están
    const diffBefore = Math.abs(referenceDate.getTime() - dateBefore.getTime());
    const diffAfter = Math.abs(dateAfter.getTime() - referenceDate.getTime());

    return (diffBefore <= diffAfter) ? dateBefore : dateAfter;
  }

  async createPayrollPeriods(
    periodTypes: { period_type_name: string, period_type_id: number }[],
    periodo: Periodo
  ) {
    if (!Array.isArray(periodTypes) || periodTypes.length === 0) {
      console.warn('No se seleccionaron tipos de períodos o no es un array');
      return;
    }

    const companyId = this.companyService.selectedCompany.id;
    const startDate = new Date(periodo.fechainicioejercicio);

    const tempPeriods: any[] = [];

    for (const periodTypeData of periodTypes) {
      const periodType = periodTypeData.period_type_name;
      const periodTypeId = periodTypeData.period_type_id;

      if (!['Semanal', 'Quincenal', 'Mensual'].includes(periodType)) {
        console.error(`Tipo de período no válido: ${periodType}`);
        continue;
      }

      const totalPeriods = (periodType === 'Semanal') ? 52
                          : (periodType === 'Quincenal') ? 24
                          : 12; // Mensual

      // Año fiscal según el período
      const fiscalYear = (periodType === 'Semanal') ? this.ejercicioSemanal
                       : (periodType === 'Quincenal') ? this.ejercicioQuincenal
                       : this.ejercicioMensual;

      let currentStartDate = new Date(startDate);

      // Para almacenar el "día de la semana preferido" (sacado de la primera quincena)
      let preferedDayOfWeek: number | null = null;

      for (let i = 0; i < totalPeriods; i++) {
        let periodEndDate: Date;

        // ===============================
        // 1) Fecha fin (periodEndDate)
        // ===============================
        if (periodType === 'Semanal') {
          // Suma 6 días al startDate
          periodEndDate = new Date(currentStartDate);
          periodEndDate.setDate(currentStartDate.getDate() + 6);

        } else if (periodType === 'Quincenal') {
          const year = currentStartDate.getFullYear();
          const month = currentStartDate.getMonth();
          const day = currentStartDate.getDate();

          if (day === 1) {
            // Quincena del 1 al 15
            periodEndDate = new Date(year, month, 15);
          } else {
            // Quincena del 16 a fin de mes
            periodEndDate = new Date(year, month + 1, 0);
          }

        } else { // Mensual
          const year = currentStartDate.getFullYear();
          const month = currentStartDate.getMonth();
          // Día 0 del siguiente mes => último día del mes actual
          periodEndDate = new Date(year, month + 1, 0);
        }

        // Evitamos pasar el año fiscal (opcional)
        if (periodEndDate.getFullYear() > fiscalYear) {
          break;
        }

        // ===============================
        // 2) Calcular fecha de pago (offset)
        // ===============================
        const paymentDate = new Date(periodEndDate);
        const offsetPago = parseInt(String(periodo.posicionpagonomina), 10) || 0;
        paymentDate.setDate(paymentDate.getDate() + offsetPago);

        // La primera vez (i=0) guardamos el dayOfWeek
        if (i === 0) {
          preferedDayOfWeek = paymentDate.getDay();
        } else {
          // Para i > 0, ajustamos al día de la semana más cercano
          if (preferedDayOfWeek !== null) {
            const adjusted = this.getClosestDayOfWeek(paymentDate, preferedDayOfWeek);
            paymentDate.setTime(adjusted.getTime());
          }
        }

        // ===============================
        // 3) Crear objeto del período
        // ===============================
        const payrollPeriod = {
          company_id: companyId,
          period_type_id: periodTypeId,
          period_number: i + 1,
          fiscal_year: fiscalYear,
          month: currentStartDate.getMonth() + 1,
          payment_days: (periodType === 'Mensual')
            ? periodEndDate.getDate()
            : (periodType === 'Quincenal')
              ? (periodEndDate.getDate() - currentStartDate.getDate() + 1)
              : 7, // Semanal => 7 días

          rest_days: periodo.numeroseptimos,
          interface_check: 0,
          net_modification: 0,
          calculated: 0,
          affected: 0,

          start_date: currentStartDate.toISOString().split('T')[0],
          end_date: periodEndDate.toISOString().split('T')[0],
          payment_date: paymentDate.toISOString().split('T')[0],

          // Banderas iniciales
          month_start: 0,
          month_end: 0,
          imss_bimonthly_start: 0,
          imss_bimonthly_end: 0,

          // Ejercicio
          fiscal_start: (i === 0) ? 1 : 0,
          fiscal_end:   (i === totalPeriods - 1) ? 1 : 0,

          timestamp: new Date().toISOString().split('T')[0],
        };

        tempPeriods.push(payrollPeriod);

        // ===============================
        // 4) Avanzar la fecha de inicio
        // ===============================
        const nextStartDate = new Date(periodEndDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
        currentStartDate = nextStartDate;

        if (currentStartDate.getFullYear() > fiscalYear) {
          break;
        }
      }
    }

    // =================================
    // Asignar banderas de inicio/fin de mes y bimestre
    // =================================
    for (let i = 0; i < tempPeriods.length; i++) {
      const current = tempPeriods[i];

      if (i === 0) {
        current.month_start = 1;
        current.imss_bimonthly_start = 1;
      }

      if (i > 0) {
        const previous = tempPeriods[i - 1];
        const prevEnd = new Date(previous.end_date);
        const currEnd = new Date(current.end_date);

        const prevEndMonth = prevEnd.getMonth();
        const currEndMonth = currEnd.getMonth();

        // Cambio de mes => fin en anterior, inicio en actual
        if (currEndMonth !== prevEndMonth) {
          previous.month_end = 1;
          current.month_start = 1;
        }

        // Cambio de bimestre
        const prevBim = this.getBimesterIndex(prevEnd);
        const currBim = this.getBimesterIndex(currEnd);
        if (currBim !== prevBim) {
          previous.imss_bimonthly_end = 1;
          current.imss_bimonthly_start = 1;
        }
      }

      // Último período => marcar fin de mes y bimestre
      if (i === tempPeriods.length - 1) {
        current.month_end = 1;
        current.imss_bimonthly_end = 1;
      }
    }

    // =================================
    // Guardar en la BD
    // =================================
    try {
      await this.http.post(`${environment.apiBaseUrl}/create-payroll-period.php`, { periods: tempPeriods })
        .toPromise();
      console.log('Periodos creados correctamente');
    } catch (error) {
      console.error('Error al crear periodos:', error);
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
  posicionseptimos: string;
  posicionpagonomina: number;
  fechainicioejercicio: string;
  ejercicio: number;
  ccalculomescalendario: number;
  PeriodicidadPago: string;
}
