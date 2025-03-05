import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'ngx-employee-hierarchy',
  templateUrl: './employee-hierarchy.component.html',
  styleUrls: ['./employee-hierarchy.component.scss']
})
export class EmployeeHierarchyComponent implements OnInit {
  hierarchies: any[] = []; // Almacena la lista de jerarquías
  selectedEmployeeId: number | null = null; // Almacena el ID del empleado seleccionado
  loggedEmployeeId: number = 1; // Simula el ID del empleado autenticado (deberías obtenerlo de tu sistema de autenticación)
  loggedCompanyId: number = 1; // Simula el ID de la compañía (deberías obtenerlo de tu sistema de autenticación)

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadHierarchies(); // Carga las jerarquías al iniciar el componente
  }

  // Carga todas las jerarquías de la compañía
  loadHierarchies(): void {
    const url = `http://tudominio.com/api/hierarchy?employee_id=${this.loggedEmployeeId}`;
    this.http.get<any[]>(url).subscribe(
      (data) => {
        this.hierarchies = data; // Asigna los datos recibidos a la variable hierarchies
      },
      (error) => {
        console.error('Error al cargar las jerarquías:', error);
      }
    );
  }

  // Carga la jerarquía de un empleado específico
  loadEmployeeHierarchy(employeeId: number): void {
    const url = `http://tudominio.com/api/hierarchy?target_employee_id=${employeeId}&employee_id=${this.loggedEmployeeId}`;
    this.http.get<any[]>(url).subscribe(
      (data) => {
        console.log('Jerarquía del empleado:', data);
      },
      (error) => {
        console.error('Error al cargar la jerarquía del empleado:', error);
      }
    );
  }

  // Añade una nueva jerarquía
  addHierarchy(hierarchyData: any): void {
    const url = `http://tudominio.com/api/hierarchy`;
    this.http.post(url, hierarchyData).subscribe(
      (response) => {
        console.log('Jerarquía añadida:', response);
        this.loadHierarchies(); // Recarga las jerarquías después de añadir una nueva
      },
      (error) => {
        console.error('Error al añadir la jerarquía:', error);
      }
    );
  }

  // Actualiza una jerarquía existente
  updateHierarchy(hierarchyData: any): void {
    const url = `http://tudominio.com/api/hierarchy`;
    this.http.put(url, hierarchyData).subscribe(
      (response) => {
        console.log('Jerarquía actualizada:', response);
        this.loadHierarchies(); // Recarga las jerarquías después de actualizar
      },
      (error) => {
        console.error('Error al actualizar la jerarquía:', error);
      }
    );
  }

  // Elimina una jerarquía
  deleteHierarchy(hierarchyId: number): void {
    const url = `http://tudominio.com/api/hierarchy?id=${hierarchyId}`;
    this.http.delete(url).subscribe(
      (response) => {
        console.log('Jerarquía eliminada:', response);
        this.loadHierarchies(); // Recarga las jerarquías después de eliminar
      },
      (error) => {
        console.error('Error al eliminar la jerarquía:', error);
      }
    );
  }
}