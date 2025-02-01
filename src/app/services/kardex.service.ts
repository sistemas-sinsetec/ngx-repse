import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class KardexService {
  private apiUrl = 'https://siinad.mx/php';
  
  constructor(private http: HttpClient) {}

  getEmpleados(companyId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/get_empleados.php?companyId=${companyId}`);
  }

  getKardex(empleadoId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/get_kardex.php?empleadoId=${empleadoId}`);
  }

  actualizarVacaciones(empleadoId: string, dias: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/actualizar_vacaciones.php`, { empleadoId, dias });
  }

}
