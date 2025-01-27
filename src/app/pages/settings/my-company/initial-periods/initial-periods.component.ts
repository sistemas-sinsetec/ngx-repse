import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService } from '@nebular/theme';
import { NbComponentStatus } from '@nebular/theme';
import { error } from 'console';
@Component({
  selector: 'ngx-initial-periods',
  templateUrl: './initial-periods.component.html',
  styleUrls: ['./initial-periods.component.scss']
})
export class InitialPeriodsComponent {
 // Variables para manejar la selección de periodos
 periodoSemanal: boolean = false;
 periodoQuincenal: boolean = false;
 periodoMensual: boolean = false;

 // Variables para manejar las fechas de inicio de cada periodo
 fechaSemanal: string;
 fechaQuincenal: string;
 fechaMensual: string;

  // Variables para manejar el rango de fechas (solo enero)
  minDate: string;
  maxDate: string;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private toastrService: NbToastrService,

  ) {}

    // Función para mostrar notificaciones
    private showToast(message: string, status: NbComponentStatus) {
      this.toastrService.show(
        message,
        'Información', // Título
        {
          status: status,
          duration: 3000,
        }
      );
    }

    async guardarConfiguracion() {
      const companyId = this.companyService.selectedCompany.id;
    
      const periodos: Periodo[] = []; // Define el tipo de la variable periodos como un array de Periodo
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
      } else if (this.periodoQuincenal) {
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
      } else if (this.periodoMensual) {
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
      } else {
        this.showToast("No se pudo guardar el periodo", 'danger');
        console.log("No se guardó porque no hay información que guardar");
        return; // Salir de la función si no hay nada que guardar
      }
    
      const configuracion = {
        companyId: companyId,
        periodos: periodos
      };
    
      this.http.post('https://siinad.mx/php/save-periods.php', configuracion)
        .subscribe(async (response: any) => {
          console.log('Configuración guardada correctamente', response);
    
          // Extraer los period_type_ids de la respuesta
          const periodTypesData = response.periods;
          const periodTypes = periodTypesData.map((p: any) => ({
            period_type_name: p.period_type_name,
            period_type_id: p.period_type_id
          }));
    
          // Llamar a createPayrollPeriods pasando los periodTypes
          await this.createPayrollPeriods(periodTypes, periodos[0]);
    
          localStorage.setItem('isFirstTime', 'false'); // Actualizar el valor en localStorage
    
          // Limpiar los campos del formulario
          this.resetForm();
        }, error => {
          console.error('Error al guardar la configuración', error);
        });
    }
    
    // Función para limpiar los campos del formulario
    resetForm() {
      this.periodoSemanal = false;
      this.periodoQuincenal = false;
      this.periodoMensual = false;
      this.fechaSemanal = null;
      this.fechaQuincenal = null;
      this.fechaMensual = null;
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
          periodEndDate.setDate(0); // Establece el último día del mes
        }

        const month = currentStartDate.getMonth() + 1;
        const isMonthStart = currentStartDate.getDate() === 1;
        const isMonthEnd = periodEndDate.getDate() === new Date(periodEndDate.getFullYear(), periodEndDate.getMonth() + 1, 0).getDate();
        const isFiscalStart = i === 0;
        const isFiscalEnd = i === totalPeriods - 1;

        const payrollPeriod = {
          company_id: companyId,
          period_type_id: periodTypeId, // Usar el period_type_id recibido en la respuesta
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
          payment_date: null // Establece la fecha de pago si es necesario
        };

        try {
          // Esperar a que se complete la solicitud HTTP antes de proceder
          await this.http.post('https://siinad.mx/php/create-payroll-period.php', payrollPeriod).toPromise();
          console.log(`Periodo de nómina ${i + 1} creado correctamente para ${periodType}`);
        } catch (error) {
          console.error(`Error al crear el periodo de nómina ${i + 1} para ${periodType}`, error);
          break; // Si hay un error, detener el proceso para este tipo de periodo
        }

        // Actualiza la fecha de inicio para el siguiente periodo
        currentStartDate = new Date(periodEndDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      }
    }
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
