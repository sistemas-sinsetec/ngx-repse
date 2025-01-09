import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

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
        // Mapear los períodos a un formato más consistente
        const mapped = data.map((d: any) => ({
          id: d.period_type_id,
          name: d.period_type_name,
          year: d.fiscal_year,
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
    if (periodString) {
      this.selectedPeriod = JSON.parse(periodString);
      console.log('Periodo cargado desde localStorage:', this.selectedPeriod);

      // Emitir el período cargado
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
}
