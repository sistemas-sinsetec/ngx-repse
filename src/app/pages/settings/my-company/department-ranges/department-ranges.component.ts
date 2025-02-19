import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService } from '@nebular/theme';
import { NbDialogService } from '@nebular/theme';
import { DepartmentRangesDialogComponent } from '../department-ranges-dialog/department-ranges-dialog.component';
import { FormBuilder, FormGroup } from '@angular/forms';  // Asegúrate de importar FormBuilder y FormGroup

@Component({
  selector: 'ngx-department-ranges',
  templateUrl: './department-ranges.component.html',
  styleUrls: ['./department-ranges.component.scss']
})
export class DepartmentRangesComponent implements OnInit {
  form: FormGroup;
  rangosEmpleados: any[] = [];
  userId: string = '';
  companyId: string = '';
  positions: any[] = []; // Lista de puestos
  departamentos: any[] = [];
  empleados: any[] = [];
  selectedDepartment: string = ''; // Departamento seleccionado
  rangos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  empleadosTodos: any[] = []; // Lista completa de empleados

  constructor(
    fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private toastrService: NbToastrService,
    private dialogService: NbDialogService,
  ) {}

  ngOnInit(): void {
  
    this.userId = this.authService.userId;
    this.companyId = this.companyService.selectedCompany?.id || '';

    if (this.userId && this.companyId) {
      this.obtenerDepartamentos();
      this.obtenerPuestos();
    } else {
      console.error('No se encontró userId o companyId.');
    }
  }

  obtenerNombrePuesto(positionId: number): string {
    const puesto = this.positions.find(pos => pos.id === positionId);
    return puesto ? puesto.name : "Sin puesto"; // Si no se encuentra, devolver "Sin puesto"
  }

  obtenerPuestos() {
    const url = `https://siinad.mx/php/get_positions.php?company_id=${this.companyId}`;
    this.http.get<any[]>(url).subscribe(data => {
      console.log("Puestos recibidos desde la API:", data); // 🔍 Verificar datos en consola
  
      this.positions = data.map(pos => ({
        id: pos.position_id,       // 🔹 Usamos "position_id"
        name: pos.position_name    // 🔹 Usamos "position_name"
      }));
  
      console.log("Puestos procesados en Angular:", this.positions);
    }, error => {
      console.error("Error al obtener puestos:", error);
      this.positions = [];
    });
  }
  
  getEmpleadosFiltrados(): any[] {
    if (!this.selectedDepartment) {
      return this.empleadosTodos; // Si no hay departamento seleccionado, mostrar todos
    }
    return this.empleadosTodos.filter(emp => emp.department_id == this.selectedDepartment);
  }
  
  obtenerDepartamentos() {
    const url = `https://siinad.mx/php/get_departments.php?company_id=${this.companyId}`;
    this.http.get<any[]>(url).subscribe(data => {
      console.log("Departamentos recibidos:", data); // 🔍 Verificar respuesta en consola
  
      if (data && Array.isArray(data)) {
        this.departamentos = data.map(depto => ({
          id: depto.department_id, // Corregir clave de ID
          nombre: depto.department_name // Corregir clave de nombre
        }));
      } else {
        console.error("La API no devolvió un array de departamentos:", data);
        this.departamentos = [];
      }
    }, error => {
      console.error("Error al obtener departamentos:", error);
      this.departamentos = [];
    });
  }
  
  onDepartamentoChange() {
    if (this.selectedDepartment) {
      this.obtenerRangos();
      this.obtenerEmpleados(); // 🔹 Cargar empleados
    }
  }
  
  obtenerEmpleados() {
    if (!this.companyId) {
      console.error("Error: companyId no está definido antes de llamar la API");
      return;
    }
  
    const url = `https://siinad.mx/php/get_empleados.php?companyId=${encodeURIComponent(this.companyId)}`;
    console.log("Llamando a la API con URL:", url);
  
    this.http.get<any>(url).subscribe(data => {
      console.log("Respuesta de la API:", data);
  
      if (data && Array.isArray(data)) {
        this.empleadosTodos = data.map(emp => {
          let rangoEmpleado = this.obtenerRangoEmpleado(emp.employee_id);
          console.log(`Empleado: ${emp.full_name}, Rango encontrado: ${rangoEmpleado}`);
          
          return {
            user_id: emp.employee_id,
            nombre: emp.full_name,
            department_id: emp.department_id,
            position_id: emp.position_id,
            position_name: this.obtenerNombrePuesto(emp.position_id),
            department_range: rangoEmpleado // 🔹 Si no hay rango, usar 0
          };
        });
  
        console.log("Empleados procesados:", this.empleadosTodos);
      } else {
        console.error("La API no devolvió un array:", data);
        this.empleadosTodos = [];
      }
    }, error => {
      console.error("Error al obtener empleados:", error);
      this.empleadosTodos = [];
    });
  }
  
  obtenerRangoEmpleado(employeeId: number): number {
    const rango = this.rangosEmpleados.find(r => r.user_id == employeeId);
    return rango ? rango.department_range : 0; // 🔹 Si no hay rango, devolver 0
  }

  obtenerRangos() {
    if (!this.companyId || !this.userId) {
      console.error("Error: companyId o userId no están definidos antes de llamar la API");
      return;
    }
  
    const url = `https://siinad.mx/php/get_departments_range.php?company_id=${encodeURIComponent(this.companyId)}&user_id=${encodeURIComponent(this.userId)}`;
    console.log("Llamando a la API para obtener rangos:", url);
  
    this.http.get<any[]>(url).subscribe(data => {
      console.log("Rangos recibidos:", data);
      if (data && Array.isArray(data)) {
        this.rangosEmpleados = data.map(rango => ({
          user_id: rango.user_id,
          department_range: parseInt(rango.department_range),
        }));
        console.log("Rangos procesados:", this.rangosEmpleados);
      } else {
        console.error("La API no devolvió un array de rangos:", data);
        this.rangosEmpleados = [];
      }
    }, error => {
      console.error("Error al obtener rangos:", error);
    });
  }

  actualizarRango(empleado: any) {
    if (empleado.department_range === 0 || !empleado.department_range) {
      this.toastrService.danger('El rango debe ser mayor que 0', 'Error');
      return; // Si el rango es 0 o no está definido, no hacer nada
    }
  
    this.dialogService.open(DepartmentRangesDialogComponent, {
      context: {
        title: 'Confirmar actualización',
        message: `¿Seguro que quieres actualizar el rango de ${empleado.nombre} a ${empleado.department_range}?`
      }
    }).onClose.subscribe(confirmed => {
      if (confirmed) {
        // Comprobar si ya existe un rango para este empleado y departamento
        const rangoExistente = this.rangosEmpleados.find(r => r.user_id === empleado.user_id && r.department_id === empleado.department_id);
  
        if (rangoExistente) {
          // Si ya existe un rango para este empleado y departamento, hacemos un PUT
          this.http.put('https://siinad.mx/php/get_departments_range.php', {
            id: rangoExistente.id, // Usar el ID del rango existente
            user_id: empleado.user_id,
            department_id: empleado.department_id,
            department_range: empleado.department_range
          }).subscribe(() => {
            this.toastrService.success('Rango actualizado con éxito', 'Éxito');
          }, error => {
            this.toastrService.danger('Error al actualizar el rango', 'Error');
          });
        } else {
          // Si no existe un rango para este empleado y departamento, hacemos un POST para crear uno nuevo
          this.http.post('https://siinad.mx/php/get_departments_range.php', {
            user_id: empleado.user_id,
            department_id: empleado.department_id,
            department_range: empleado.department_range
          }).subscribe(() => {
            this.toastrService.success('Rango registrado con éxito', 'Éxito');
          }, error => {
            this.toastrService.danger('Error al registrar el rango', 'Error');
          });
        }
      }
    });
  }
  
}