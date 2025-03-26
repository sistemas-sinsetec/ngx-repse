import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { LoadingController } from '@ionic/angular'; // Importar LoadingController de Ionic
import * as moment from 'moment'; // Importar moment.js para manejar fechas y tiempos
import { PeriodService } from '../../../../services/period.service';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

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
    private toastrService: CustomToastrService, // Inyectar NbToastrService
    private elementRef: ElementRef,
    private periodService: PeriodService
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
        this.toastrService.showError('Error al cargar los periodos', 'Error'); // Mostrar un toast de error
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
            this.toastrService.showSuccess('Cambios guardados correctamente', 'Éxito');
          } else {
            // Creación de nuevo periodo
            const periodTypeId = response.period_type_id;
            const periodTypeName = this.selectedPeriod.period_type_name;
            const periodData = [{ period_type_name: periodTypeName, period_type_id: periodTypeId }];
  
            // Crear los periodos de nómina
            await this.createPayrollPeriods(periodData, this.selectedPeriod);
            
            this.toastrService.showSuccess('Nuevo periodo creado correctamente', 'Éxito');
          }
  
          // Recargar los periodos después de guardar
          this.loadPeriods();
        },
        (error) => {
          console.error('Error en la petición:', error);
          loading.dismiss();
          this.toastrService.showError('Error al guardar los cambios', 'Error');
        }
      );
    } catch (error) {
      console.error('Error inesperado:', error);
      this.toastrService.showError('Ocurrió un error inesperado', 'Error');
    }
  }
  
  isValidPeriodName(): boolean {
    return /^[a-zA-ZÁÉÍÓÚáéíóúÑñ\s]+$/.test(this.selectedPeriod.period_type_name);
  }
  

  private getBimesterIndex(date: Date): number {
    // Devuelve 0 para Ene-Feb, 1 para Mar-Abr, 2 para May-Jun,
    // 3 para Jul-Ago, 4 para Sep-Oct, 5 para Nov-Dic
    const month = date.getMonth() + 1; // 1..12
    return Math.floor((month - 1) / 2);
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
    // Fecha de inicio configurada por el usuario
    const startDate = new Date(periodo.fiscal_year_start);
    startDate.setHours(0, 0, 0, 0); // Evitar desfases por zona horaria
  
    // Año fiscal (puedes ajustarlo si tu ejercicio no siempre coincide con el año calendario)
    const fiscalYear = startDate.getFullYear();
  
    // Arreglo temporal para almacenar los períodos generados
    const tempPeriods: any[] = [];
  
    // ==========================================================
    // FASE 1: Generar todos los períodos sin banderas
    // ==========================================================
    for (const periodTypeData of periodTypes) {
      const periodType = periodTypeData.period_type_name;
      const periodTypeId = periodTypeData.period_type_id;
  
      // ¿Cuántos períodos generamos?
      // Usar totalPeriods definido por el usuario o calcularlo
      const totalPeriods = periodo.totalPeriods || Math.floor(365 / periodo.period_days);
  
      // Fecha de inicio para cada período
      let currentStartDate = new Date(startDate);
  
      for (let i = 0; i < totalPeriods; i++) {
        const periodEndDate = new Date(currentStartDate);
  
        // Ajustar fecha fin según payment_frequency o reglas personalizadas
        if (periodo.payment_frequency === '02') { // Semanal
          periodEndDate.setDate(currentStartDate.getDate() + periodo.period_days - 1);
        } else if (periodo.payment_frequency === '04') { // Quincenal
          periodEndDate.setDate(currentStartDate.getDate() + 14 - 1);
        } else if (periodo.payment_frequency === '05') { // Mensual
          periodEndDate.setMonth(currentStartDate.getMonth() + 1);
          periodEndDate.setDate(0); // Último día del mes
        } else if (periodo.payment_frequency === '99') { // Personalizado
          if (periodo.custom_period_type === 'días') {
            periodEndDate.setDate(currentStartDate.getDate() + periodo.custom_period_length - 1);
          } else if (periodo.custom_period_type === 'semanas') {
            periodEndDate.setDate(currentStartDate.getDate() + (7 * periodo.custom_period_length) - 1);
          } else if (periodo.custom_period_type === 'meses') {
            periodEndDate.setMonth(currentStartDate.getMonth() + periodo.custom_period_length);
            periodEndDate.setDate(0); 
          } else {
            console.warn('No se especificó una longitud válida para el periodo personalizado');
            return;
          }
        } else {
          console.warn('Tipo de periodo desconocido');
          return;
        }
  
        // Creas el objeto con banderas en 0
        const payrollPeriod = {
          company_id: companyId,
          period_type_id: periodTypeId,
          period_number: i + 1,
          fiscal_year: fiscalYear,
          month: currentStartDate.getMonth() + 1,
          payment_days: periodo.payment_days,  // Ajusta si quieres que sea distinto
          rest_days: periodo.rest_days_position, // Tus días de descanso
          interface_check: 0,
          net_modification: 0,
          calculated: 0,
          affected: 0,
  
          start_date: currentStartDate.toISOString().split('T')[0],
          end_date: periodEndDate.toISOString().split('T')[0],
  
          // Banderas en 0 (las setearemos en Fase 2)
          fiscal_start: (i === 0) ? 1 : 0, // primer período => inicio ejercicio
          fiscal_end:   (i === totalPeriods - 1) ? 1 : 0, // último => fin ejercicio
          month_start: 0,
          month_end: 0,
          imss_bimonthly_start: 0,
          imss_bimonthly_end: 0,
  
          timestamp: new Date().toISOString().split('T')[0],
          payment_date: null // Ajustar si necesitas fecha de pago
        };
  
        // Agregamos al array temporal
        tempPeriods.push(payrollPeriod);
  
        // Avanzar la fecha de inicio para el siguiente período
        const nextStartDate = new Date(periodEndDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
        currentStartDate = nextStartDate;
      }
    }
  
    // ==========================================================
    // FASE 2: Marcar inicio/fin de mes y bimestre IMSS
    // (comparando end_date con la del siguiente período)
    // ==========================================================
    for (let i = 0; i < tempPeriods.length; i++) {
      const current = tempPeriods[i];
  
      // Si es el primer período, marcamos "inicio de mes" y "inicio de bimestre"
      if (i === 0) {
        current.month_start = 1;
        current.imss_bimonthly_start = 1;
      }
  
      if (i > 0) {
        const previous = tempPeriods[i - 1];
        const prevEnd = new Date(previous.end_date);
        const currEnd = new Date(current.end_date);
  
        // Detectar cambio de mes
        const prevEndMonth = prevEnd.getMonth(); 
        const currEndMonth = currEnd.getMonth();
        if (prevEndMonth !== currEndMonth) {
          // Fin de mes en el anterior, inicio en el actual
          previous.month_end = 1;
          current.month_start = 1;
        }
  
        // Detectar cambio de bimestre
        const prevBim = this.getBimesterIndex(prevEnd);
        const currBim = this.getBimesterIndex(currEnd);
        if (prevBim !== currBim) {
          previous.imss_bimonthly_end = 1;
          current.imss_bimonthly_start = 1;
        }
      }
  
      // Si es el último, lo marcamos como fin de mes y fin de bimestre
      if (i === tempPeriods.length - 1) {
        current.month_end = 1;
        current.imss_bimonthly_end = 1;
      }
    }
  
    // ==========================================================
    // FASE 3: Guardar cada período en la BD
    // ==========================================================
    for (let i = 0; i < tempPeriods.length; i++) {
      const payrollPeriod = tempPeriods[i];
      try {
        await this.http.post('https://siinad.mx/php/create-payroll-period.php', payrollPeriod).toPromise();
        console.log(`Periodo de nómina ${payrollPeriod.period_number} creado correctamente`);
      } catch (error) {
        console.error(`Error al crear el periodo de nómina ${payrollPeriod.period_number}`, error);
        this.toastrService.showError(`Error al crear el periodo #${payrollPeriod.period_number}`, 'Error');
        // Si quieres, puedes break para no seguir, o continuar creando los siguientes
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
      this.toastrService.showWarning('El nombre del periodo solo puede contener letras.', 'Validación');
      return false;
    }
  
    if (!this.selectedPeriod.period_days || isNaN(this.selectedPeriod.period_days)) {
      this.toastrService.showWarning('Los días del periodo deben ser un número válido.', 'Validación');
      return false;
    }
  
    if (!this.selectedPeriod.payment_frequency) {
      this.toastrService.showWarning('Debes seleccionar una periodicidad de pago.', 'Validación');
      return false;
    }
  
    if (!this.selectedPeriod.fiscal_year_start) {
      this.toastrService.showWarning('Debes seleccionar una fecha de inicio.', 'Validación');
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
          this.toastrService.showSuccess('Periodo eliminado correctamente', 'Éxito');
        }, error => {
          console.error('Error al eliminar el periodo', error);
          this.toastrService.showError('Error al eliminar el periodo', 'Error');
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