import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class PeriodService {
  selectedPeriod: any = null;
  periodTypes: any[] = [];

  // BehaviorSubject para emitir cambios en el período seleccionado
  private periodChangeSubject = new BehaviorSubject<any>(null);
  periodChange$ = this.periodChangeSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadSelectedPeriod();
  }

  /**
   * Cargar tipos de periodos desde el backend
   * @param companyId ID de la empresa seleccionada
   * @returns Una promesa con la lista de períodos mapeados
   */
  loadPeriodTypes(companyId: string): Promise<any[]> {
    return this.http
      .get(`https://siinad.mx/php/get_period_types.php?company_id=${companyId}`)
      .toPromise()
      .then((data: any) => {
        const mapped = data.map((d: any) => ({
          id: d.period_type_id,
          name: d.period_type_name,
          year: d.fiscal_year,
          start: d.fiscal_year_start,
          rest_days_position: JSON.parse(d.rest_days_position), // Añadir esto
        }));
        this.periodTypes = mapped;
        return this.periodTypes;
      })
      .catch((error) => {
        console.error('Error al cargar los tipos de periodos:', error);
        return [];
      });
  }

  /**
   * Guardar el período seleccionado en memoria y localStorage,
   * y notificar a los suscriptores del cambio.
   * @param period Objeto con los datos del período seleccionado
   */
  setSelectedPeriod(period: any) {
    this.selectedPeriod = period;
    localStorage.setItem('selectedPeriod', JSON.stringify(period));
    console.log('Periodo seleccionado:', this.selectedPeriod);

    // Emitir el cambio a través del BehaviorSubject
    this.periodChangeSubject.next(this.selectedPeriod);
  }

  /**
   * Cargar el período seleccionado desde el localStorage y emitir el cambio.
   */
  loadSelectedPeriod() {
    const periodString = localStorage.getItem('selectedPeriod');
    console.log('Intentando cargar período desde localStorage:', periodString);

    if (periodString) {
      const storedPeriod = JSON.parse(periodString);
      this.selectedPeriod = storedPeriod;
      console.log('Período cargado desde localStorage:', this.selectedPeriod);

      this.periodChangeSubject.next(this.selectedPeriod);
    }
  }

  /**
   * Obtener el período actualmente seleccionado
   * @returns El período seleccionado o null si no hay ninguno
   */
  getSelectedPeriod(): any {
    return this.selectedPeriod;
  }

  /**
   * Generar los días de la semana entre dos fechas, marcando los días de descanso.
  * @param startDate Fecha inicial (YYYY-MM-DD)
   * @param endDate Fecha final (YYYY-MM-DD)
   * @param periodId ID del periodo
   * @param existingDiasSemana Arreglo con datos de días ya existentes (por ejemplo, para status, etc.)
   * @param selectedCompanyId ID de la compañía actual
   * @returns Retorna el arreglo de días generados con su información
   */
  public generarDiasDeSemana(
    startDate: string,
    endDate: string,
    periodId: string,
    existingDiasSemana: any[],  // corresponde a this.diasSemana en tu componente
    selectedCompanyId: string   // this.companyService.selectedCompany.id
  ): any[] {
    const start = moment(startDate);
    const end = moment(endDate);
    const dias = [];

    // Recuperamos el periodo actual (suponiendo que period.start y period.rest_days_position existen)
    const period = this.getSelectedPeriod();
    const periodStart = moment(period.start);
    const cycleLength = period.cycleLength || 7; // Por si en tu BD no hay un valor, usamos 7 como default
    const restDaysPositions = period.rest_days_position || [];

    // Calculamos las fechas base de descanso
    const baseRestDates: moment.Moment[] = [];
    restDaysPositions.forEach(pos => {
      const dayOfMonth = parseInt(pos, 10);
      const year = periodStart.year();
      const month = periodStart.month();
      // Creamos la fecha base a partir de ese día del mes
      const baseRestDate = moment([year, month, dayOfMonth]);
      baseRestDates.push(baseRestDate);
    });

    // Recorremos cada día entre startDate y endDate
    while (start.isSameOrBefore(end)) {
      const current = start.clone();
      const dateStr = current.format('YYYY-MM-DD');
      let isRestDay = false;

      // Verificamos si coincide con un "ciclo" de descanso
      for (const base of baseRestDates) {
        const diff = current.diff(base, 'days');
        if (diff >= 0 && diff % cycleLength === 0) {
          isRestDay = true;
          break;
        }
      }

      // Si en existingDiasSemana ya hay información para este día, la usamos (status, etc.)
      const dayData = existingDiasSemana.find(d => d.day_of_week === dateStr);

      dias.push({
        date: dateStr,
        dayLetter: this.getDayLetter(current),      // asignamos la letra del día
        status: dayData?.status || null,
        company_id: dayData?.company_id || selectedCompanyId,
        period_id: dayData?.period_id || periodId,
        isRestDay,
      });

      // Pasamos al siguiente día
      start.add(1, 'day');
    }


    return dias;

  }

  // Mapeo de índice del día de la semana a letra
  private dayLetters: { [key: number]: string } = {
    0: 'D',  // Domingo
    1: 'L',  // Lunes
    2: 'M',  // Martes
    3: 'M',  // Miércoles
    4: 'J',  // Jueves
    5: 'V',  // Viernes
    6: 'S',  // Sábado
  };

  /**
   * Obtiene la letra correspondiente al día de la semana.
   * @param date Objeto moment con la fecha actual
   * @returns Letra del día (D, L, M, M, J, V, S)
   */
  private getDayLetter(date: moment.Moment): string {

    const dayIndex = date.day();
    return this.dayLetters[dayIndex] || '';
  }
}