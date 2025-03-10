import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { LoadingController } from '@ionic/angular'; // Importar LoadingController de Ionic
import { NbToastrService } from '@nebular/theme'; // Importar NbToastrService de Nebular
import * as moment from 'moment'; // Importar moment.js para manejar fechas y tiempos

@Component({
  selector: 'ngx-period-configuration',
  templateUrl: './period-configuration.component.html',
  styleUrls: ['./period-configuration.component.scss']
})
export class PeriodConfigurationComponent {

  periods: any[] = [];  // Array para almacenar los periodos cargados desde la base de datos
  selectedPeriod: any = {};  // Objeto para almacenar el periodo seleccionado o nuevo

  currentMonth: number = new Date().getMonth();
  currentYear: number = new Date().getFullYear();
  daysInMonth: number[] = [];
  selectedDates: Set<string> = new Set();
  isCalendarOpen: boolean = false; // Controla si el calendario está abierto

  minDate: string = ''; // Mínima fecha seleccionable
  maxDate: string = ''; // Máxima fecha seleccionable

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private loadingController: LoadingController, // Inyectar LoadingController
    private toastrService: NbToastrService, // Inyectar NbToastrService
    private elementRef: ElementRef,
  ) { this.generateDays(); }

  ngOnInit() {
    this.loadPeriods();
    this.updateSelectableDates(); // Actualizar las fechas seleccionables al iniciar la página
  }


  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.isCalendarOpen) return; // Solo actúa si el calendario está abierto
    
    const calendarContainer = this.elementRef.nativeElement.querySelector('.calendar-container');
    const input = this.elementRef.nativeElement.querySelector('input[type="text"]');
  
    if (!input.contains(event.target) && !calendarContainer.contains(event.target)) {
      this.isCalendarOpen = false;
    }
  }
  generateDays() {
    const firstDayOfMonth = new Date(Date.UTC(this.currentYear, this.currentMonth, 1));
    const offset = (firstDayOfMonth.getUTCDay() + 6) % 7; // Ajuste para lunes como primer día

    const emptyDays = Array(offset).fill(null);
    const daysInMonth = new Date(Date.UTC(this.currentYear, this.currentMonth + 1, 0)).getUTCDate();

    this.daysInMonth = [...emptyDays, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }

  // Formatea la fecha en YYYY-MM-DD
  getFormattedDate(day: number): string {
    const utcDate = new Date(Date.UTC(this.currentYear, this.currentMonth, day));
    return utcDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }
  // Agrega o elimina una fecha seleccionadaxd
  toggleDate(day: number) {
    const formattedDate = moment.utc()
      .year(this.currentYear)
      .month(this.currentMonth)
      .date(day)
      .format('YYYY-MM-DD'); // Formato crítico

    if (this.isDateSelectable(day)) {
      this.selectedDates.has(formattedDate)
        ? this.selectedDates.delete(formattedDate)
        : this.selectedDates.add(formattedDate);
    }
    
  }


  // Verifica si una fecha está seleccionada
  isSelected(day: number): boolean {
    const formattedDate = moment.utc()
      .year(this.currentYear)
      .month(this.currentMonth)
      .date(day)
      .format('YYYY-MM-DD');

    return this.selectedDates.has(formattedDate);
  }

  isDateSelectable(day: number): boolean {
    const formattedDate = this.getFormattedDate(day);
    const minDateUTC = new Date(this.minDate + 'T00:00:00Z').toISOString().split('T')[0];
    const maxDateUTC = new Date(this.maxDate + 'T23:59:59Z').toISOString().split('T')[0];

    return formattedDate >= minDateUTC && formattedDate <= maxDateUTC;
  }
  // Cambia al mes anterior
  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateDays();
  }

  // Cambia al mes siguiente
  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateDays();
  }

  // Abre o cierra el calendario al hacer clic en el input
  toggleCalendar(event: MouseEvent) {
    event.stopPropagation(); // Detiene la propagación del clic
    this.isCalendarOpen = !this.isCalendarOpen;
  }
  // Obtener las fechas seleccionadas como una cadena para mostrar en el input
  getSelectedDatesString(): string {
    console.log('Fechas seleccionadas:', Array.from(this.selectedDates)); // Verificar las fechas seleccionadas

    const days = Array.from(this.selectedDates).map(dateStr => {
      return moment.utc(dateStr).format('DD'); // Mostrar día UTC
    });

    console.log('Días formateados:', days); // Verificar los días formateados
    return days.join(', '); // Unir los días con comas
  }
  // Actualiza el valor en el modelo ngModel
  updateRestDays() {
    // Convertimos el Set a un array para pasarlo a selectedPeriod.rest_days_position
    this.selectedPeriod.rest_days_position = Array.from(this.selectedDates);
  }


  async loadPeriods() {
    const loading = await this.loadingController.create({
      message: 'Cargando periodos...'
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    this.http.get(`https://siinad.mx/php/get-periods.php?company_id=${companyId}`)
      .subscribe((response: any) => {
        this.periods = response.map((period: any) => ({
          ...period,
          rest_days_position: JSON.parse(period.rest_days_position) // Convertir a array
        }));

        loading.dismiss(); // Ocultar el spinner de carga
      }, error => {
        console.error('Error al cargar los periodos', error);
        loading.dismiss(); // Ocultar el spinner de carga en caso de error
        this.toastrService.danger('Error al cargar los periodos', 'Error'); // Mostrar un toast de error
      });
  }

  selectPeriod(period: any) {
    this.selectedPeriod = { ...period };

    // 1. Actualiza el mes/año al del periodo seleccionado
    const [year, month, day] = period.fiscal_year_start.split('-');
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    this.currentMonth = utcDate.getUTCMonth();
    this.currentYear = utcDate.getUTCFullYear();
    this.generateDays(); // Regenera los días del mes

    // 2. Convierte los días de descanso a fechas completas YYYY-MM-DD
    this.selectedDates = new Set(
      period.rest_days_position.map(dateStr => {
        return moment.utc(dateStr, 'DD').set({
          year: this.currentYear,
          month: this.currentMonth
        }).format('YYYY-MM-DD');
      })
    );

    this.updateSelectableDates();
  }
  createNewPeriod() {
    // Crear un nuevo objeto vacío para un nuevo periodo
    this.selectedPeriod = {
      period_type_name: '',
      period_days: null,
      payment_days: null,
      work_period: null,
      adjust_calendar_periods: null,
      rest_days_position: [],
      payroll_position: null,
      fiscal_year_start: '',
      payment_frequency: '',
      totalPeriods: null,
      custom_period_length: null,
      custom_period_type: '',
    };

    // Limitar la fecha seleccionable al mes de enero
    const currentYear = new Date().getFullYear();
    this.minDate = `${currentYear}-01-01`;
    this.maxDate = `${currentYear}-01-31`;

    this.updateSelectableDates(); // Actualizar las fechas seleccionables para el nuevo periodo
    this.calculateRestDays(); // Calcular los días de descanso automáticamente
  }

  async savePeriodConfig() {
    try {
      // Validar los datos antes de procesar
      if (!this.validateForm()) {
        return;
      }
  
      // Convertir los días seleccionados a un array de strings (Ejemplo: ["08", "09"])
      const restDaysArray = Array.from(this.selectedDates).map(date => {
        return moment.utc(date).format('DD'); // Devuelve el día en dos dígitos (Ej: "08")
      });
  
      // Crear el objeto de configuración del periodo
      const periodConfig = {
        ...this.selectedPeriod,
        company_id: this.companyService.selectedCompany.id,
        rest_days_position: restDaysArray, // Enviar solo los días como un array
      };
  
      console.log('Period Config:', periodConfig);
  
      // Mostrar el loading
      const loading = await this.loadingController.create({
        message: 'Guardando configuración del periodo...',
      });
      await loading.present();
  
      let apiUrl = periodConfig.period_type_id 
        ? 'https://siinad.mx/php/update-period.php' 
        : 'https://siinad.mx/php/create-period.php';
  
      // Guardar o actualizar el periodo
      this.http.post(apiUrl, periodConfig).subscribe(
        async (response: any) => {
          console.log('Respuesta del servidor:', response);
          loading.dismiss();
  
          if (periodConfig.period_type_id) {
            // Actualización de periodo
            this.toastrService.success('Cambios guardados correctamente', 'Éxito');
          } else {
            // Creación de nuevo periodo
            const periodTypeId = response.period_type_id;
            const periodTypeName = this.selectedPeriod.period_type_name;
            const periodData = [{ period_type_name: periodTypeName, period_type_id: periodTypeId }];
  
            // Crear los periodos de nómina
            await this.createPayrollPeriods(periodData, this.selectedPeriod);
            
            this.toastrService.success('Nuevo periodo creado correctamente', 'Éxito');
          }
  
          // Recargar los periodos después de guardar
          this.loadPeriods();
        },
        (error) => {
          console.error('Error en la petición:', error);
          loading.dismiss();
          this.toastrService.danger('Error al guardar los cambios', 'Error');
        }
      );
    } catch (error) {
      console.error('Error inesperado:', error);
      this.toastrService.danger('Ocurrió un error inesperado', 'Error');
    }
  }
  
  isValidPeriodName(): boolean {
    return /^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/.test(this.selectedPeriod.period_type_name);
  }
  

  async createPayrollPeriods(periodTypes: { period_type_name: string, period_type_id: number }[], periodo: any) {
    if (!Array.isArray(periodTypes)) {
      console.error('periodTypes debe ser un array');
      return;
    }

    if (periodTypes.length === 0) {
      console.warn('No se seleccionaron tipos de periodos');
      return;
    }

    const companyId = this.companyService.selectedCompany.id;
    const startDate = new Date(periodo.fiscal_year_start);
    startDate.setHours(0, 0, 0, 0); // Aseguramos que la fecha de inicio no cambie por la zona horaria
    const fiscalYear = startDate.getFullYear();

    let currentStartDate = new Date(startDate);

    for (const periodTypeData of periodTypes) {
      const periodType = periodTypeData.period_type_name;
      const periodTypeId = periodTypeData.period_type_id;

      // Usar totalPeriods definido por el usuario, o calcularlo automáticamente
      const totalPeriods = periodo.totalPeriods || Math.floor(365 / periodo.period_days);

      for (let i = 0; i < totalPeriods; i++) {
        let periodEndDate: Date = new Date(currentStartDate);

        if (periodo.payment_frequency === '02') { // Semanal
          periodEndDate.setDate(currentStartDate.getDate() + periodo.period_days - 1);
        } else if (periodo.payment_frequency === '04') { // Quincenal
          periodEndDate.setDate(currentStartDate.getDate() + 14 - 1);
        } else if (periodo.payment_frequency === '05') { // Mensual
          periodEndDate.setMonth(currentStartDate.getMonth() + 1);
          periodEndDate.setDate(0); // Establece el último día del mes
        } else if (periodo.payment_frequency === '99') { // Personalizado
          if (periodo.custom_period_type === 'días') {
            periodEndDate.setDate(currentStartDate.getDate() + periodo.custom_period_length - 1);
          } else if (periodo.custom_period_type === 'semanas') {
            periodEndDate.setDate(currentStartDate.getDate() + (7 * periodo.custom_period_length) - 1);
          } else if (periodo.custom_period_type === 'meses') {
            periodEndDate.setMonth(currentStartDate.getMonth() + periodo.custom_period_length);
            periodEndDate.setDate(0); // Establece el último día del mes resultante
          } else {
            console.warn('No se especificó una longitud válida para el periodo personalizado');
            return;
          }
        } else {
          console.warn('Tipo de periodo desconocido');
          return;
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
          payment_days: periodo.payment_days,
          rest_days: periodo.rest_days_position,
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
          this.toastrService.danger(`Error al crear el periodo de nómina ${i + 1}`, 'Error');
          break; // Si hay un error, detener el proceso para este tipo de periodo
        }

        // Actualiza la fecha de inicio para el siguiente periodo
        currentStartDate = new Date(periodEndDate);
        currentStartDate.setDate(currentStartDate.getDate() + 1);
      }
    }
  }

  updatePayrollPosition() {
    // Rellena el valor si está vacío, pero permite que el usuario lo modifique manualmente.
    if (!this.selectedPeriod.payroll_position) {
      if (this.selectedPeriod.payment_frequency === '99') {
        this.selectedPeriod.payroll_position = this.selectedPeriod.custom_period_length;
      } else {
        this.selectedPeriod.payroll_position = this.selectedPeriod.period_days;
      }
    }
  }

  validateForm(): boolean {
    if (!this.selectedPeriod.period_type_name.match(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)) {
      this.toastrService.warning('El nombre del periodo solo puede contener letras.', 'Validación');
      return false;
    }
  
    if (!this.selectedPeriod.period_days || isNaN(this.selectedPeriod.period_days)) {
      this.toastrService.warning('Los días del periodo deben ser un número válido.', 'Validación');
      return false;
    }
  
    if (!this.selectedPeriod.payment_frequency) {
      this.toastrService.warning('Debes seleccionar una periodicidad de pago.', 'Validación');
      return false;
    }
  
    if (!this.selectedPeriod.fiscal_year_start) {
      this.toastrService.warning('Debes seleccionar una fecha de inicio.', 'Validación');
      return false;
    }
  
    return true;
  }
  

  deletePeriod() {
    const periodTypeId = this.selectedPeriod.period_type_id;
    if (periodTypeId) {
      this.http.post('https://siinad.mx/php/delete-period.php', { period_type_id: periodTypeId })
        .subscribe(response => {
          console.log('Periodo eliminado correctamente', response);
          this.loadPeriods();  // Recargar los periodos después de eliminar uno
          this.selectedPeriod = {};  // Limpiar el periodo seleccionado
          this.toastrService.success('Periodo eliminado correctamente', 'Éxito');
        }, error => {
          console.error('Error al eliminar el periodo', error);
          this.toastrService.danger('Error al eliminar el periodo', 'Error');
        });
    }
  }

  updateSelectableDates() {
    if (!this.selectedPeriod.fiscal_year_start) return;

    const startDate = new Date(this.selectedPeriod.fiscal_year_start + 'T00:00:00Z');
    this.minDate = startDate.toISOString().split('T')[0];

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + (this.selectedPeriod.period_days - 1));
    this.maxDate = endDate.toISOString().split('T')[0];
  }

  // Función para agregar días a una fecha en formato de cadena
  addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }


  

  calculateRestDays() {
    // Verifica que haya una fecha de inicio y un número de días definido
    if (!this.selectedPeriod.fiscal_year_start || !this.selectedPeriod.period_days) {
      console.warn('No se puede calcular los séptimos días sin la fecha de inicio o los días del periodo.');
      return;
    }

    const startDate = new Date(this.selectedPeriod.fiscal_year_start);
    const periodDays = this.selectedPeriod.period_days;

    let restDays = []; // Array para almacenar los días de descanso

    // Calcula el séptimo día para cada semana dentro del periodo
    for (let i = 6; i < periodDays; i += 7) { // Inicia en 6 para seleccionar el séptimo día
      const restDay = new Date(startDate);
      restDay.setDate(startDate.getDate() + i);
      restDays.push(restDay.toISOString().split('T')[0]); // Añade la fecha al array
    }

    // Establece la posición de los días de descanso en el formato "01,02,03"
    this.selectedPeriod.rest_days_position = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  }
}