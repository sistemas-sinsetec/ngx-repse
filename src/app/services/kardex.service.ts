import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class KardexService {

  
  constructor(private http: HttpClient) {}

  getEmpleados(companyId: string): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/get_empleados.php?companyId=${companyId}`);
  }

  getKardex(empleadoId: string): Observable<any> {
    return this.http.get(`${environment.apiBaseUrl}/get_kardex.php?empleadoId=${empleadoId}`);
  }

  actualizarVacaciones(empleadoId: string, dias: number): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/actualizar_vacaciones.php`, { empleadoId, dias });
  }

}
