// app/services/employee.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface SolicitudesResponse {
  success: boolean;
  solicitudes: any[]; 
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private baseUrl: string = 'https://siinad.mx/php'; // URL base de la API

  constructor(private http: HttpClient) {}

  // Obtener los departamentos
  fetchDepartamentos(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get_departments.php`, {
      params: new HttpParams().set('company_id', companyId.toString()),
    });
  }

  // Obtener los puestos
  fetchPuestos(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get_positions.php`, {
      params: new HttpParams().set('company_id', companyId.toString()),
    });
  }

  // Obtener los turnos
  fetchTurnos(companyId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get_shifts.php`, {
      params: new HttpParams().set('company_id', companyId.toString()),
    });
  }

  // Obtener los géneros
  fetchGenders(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get_genders.php`);
  }

  // Obtener los estados civiles
  fetchMaritalStatuses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/get_marital_statuses.php`);
  }

  // Registrar un nuevo empleado
  registerEmployee(employeeData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/submit_employee.php`, employeeData);
  }

  // Subir archivos relacionados con el empleado
  uploadFiles(employeeId: number, files: { [key: string]: File }): Observable<any> {
    const formData = new FormData();
    formData.append('employee_id', employeeId.toString());

    Object.keys(files).forEach(fileType => {
      formData.append(fileType, files[fileType]);
    });

    return this.http.post<any>(`${this.baseUrl}/upload_employee_files.php`, formData);
  }
}
