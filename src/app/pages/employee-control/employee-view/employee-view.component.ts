import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { EmployeeDetailsComponent } from '../employee-details/employee-details.component';
import { NbDialogService } from '@nebular/theme';
import { CompanyService } from '../../../services/company.service';
import { take } from 'rxjs/operators';
import { NbWindowService } from '@nebular/theme';
import { RegisterUserComponent } from '../register-user/register-user.component';

interface Empleado {
  employee_id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  employee_code: string;
  curp: string;
  social_security_number: string;
  rfc: string;
  email: string;
  phone_number: string;
  start_date: string;
}

interface User {
  id: number;
  name: string;
  employee_id: number;
}

interface Turno {
  shift_id: number;
  shift_name: string;
}

interface Puesto {
  position_id: number;
  position_name: string;
}

interface Departamento {
  department_id: number;
  department_name: string;
}

@Component({
  selector: 'ngx-employee-view',
  templateUrl: './employee-view.component.html',
  styleUrls: ['./employee-view.component.scss']
})

export class EmployeeViewComponent implements OnInit {
  mostrarBusqueda: boolean = false;

  users: User[] = [];
  departamentos: Departamento[] = [];
  puestos: Puesto[] = [];
  turnos: Turno[] = [];
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  searchQuery: string = '';

  // Variables para las selecciones
  departamentoSeleccionado: Departamento | null = null;
  puestoSeleccionado: Puesto | null = null;
  turnoSeleccionado: Turno | null = null;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private router: Router,
    private dialogService: NbDialogService,
    private windowService: NbWindowService,
    private companyService: CompanyService,
  ) { }

  ngOnInit() {
    this.loadDepartments();
    this.loadPositions();
    this.loadShifts();
    this.loadUsers();
  }

   // Método para cargar usuarios desde el backend
   loadUsers() {
    this.http.get<User[]>('https://siinad.mx/php/getUsuarios.php')
      .subscribe(
        data => {
          this.users = data;
        },
        error => {
          console.error('Error al cargar usuarios:', error);
        }
      );
  }

  addUser(empleado: any) {
    this.windowService.open(RegisterUserComponent, {
      title: 'Registrar Usuario',
      context: {
        employee: empleado  // Pasamos el objeto empleado
      },
      buttons: { minimize: false, maximize: false },
      windowClass: 'register-user-window'
    }).onClose.subscribe(result => {
      if (result && result.success) {
        // Por ejemplo, recargar la lista de usuarios para refrescar la interfaz
        this.loadUsers();
      }
    });
  }

  // Método para verificar si el empleado ya tiene un usuario
  employeeHasUser(employee_id: number): boolean {
    return this.users.some(user => user.employee_id === employee_id);
  }

   // Cargar departamentos sin dependencia
   loadDepartments() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<Departamento[]>(`https://siinad.mx/php/get_departments.php?company_id=${companyId}`).subscribe(
      data => {
        this.departamentos = data;
      },
      error => {
        console.error('Error al cargar los departamentos:', error);
      }
    );
  }

  // Cargar puestos sin dependencia del departamento
  loadPositions() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<Puesto[]>(`https://siinad.mx/php/get_positions.php?company_id=${companyId}`).subscribe(
      data => {
        this.puestos = data;
      },
      error => {
        console.error('Error al cargar los puestos:', error);
      }
    );
  }

  // Cargar turnos sin dependencia del puesto
  loadShifts() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<Turno[]>(`https://siinad.mx/php/get_shifts.php?company_id=${companyId}`).subscribe(
      data => {
        this.turnos = data;
      },
      error => {
        console.error('Error al cargar los turnos:', error);
      }
    );
  }

  // Seleccionar y mostrar empleados por departamento
  selectDepartamento(departamento: Departamento) {
    this.departamentoSeleccionado = departamento;
    this.puestoSeleccionado = null;  // Limpiar selección de puesto
    this.turnoSeleccionado = null;   // Limpiar selección de turno
    this.mostrarBusqueda = true;
    const companyId = this.companyService.selectedCompany.id;

    this.http.get<{ success: boolean, employees: Empleado[] }>(
      `https://siinad.mx/php/get_employees_by_department.php?company_id=${companyId}&department_id=${departamento.department_id}`
    ).subscribe(
      response => {
        if (response.success) {
          this.empleados = response.employees;
          this.empleadosFiltrados = this.empleados;
        } else {
          console.error('Error al cargar los empleados del departamento');
        }
      },
      error => {
        console.error('Error al cargar los empleados del departamento:', error);
      }
    );
  }

  // Seleccionar y mostrar empleados por puesto
  selectPuesto(puesto: Puesto) {
    this.puestoSeleccionado = puesto;
    this.departamentoSeleccionado = null;  // Limpiar selección de departamento
    this.turnoSeleccionado = null;
    this.mostrarBusqueda = true;         // Limpiar selección de turno
    const companyId = this.companyService.selectedCompany.id;

    this.http.get<{ success: boolean, employees: Empleado[] }>(
      `https://siinad.mx/php/get_employees_by_position.php?company_id=${companyId}&position_id=${puesto.position_id}`
    ).subscribe(
      response => {
        if (response.success) {
          this.empleados = response.employees;
          this.empleadosFiltrados = this.empleados;
        } else {
          console.error('Error al cargar los empleados del puesto');
        }
      },
      error => {
        console.error('Error al cargar los empleados del puesto:', error);
      }
    );
  }

  // Seleccionar y mostrar empleados por turno
  selectTurno(turno: Turno) {
    this.turnoSeleccionado = turno;
    this.departamentoSeleccionado = null; // Limpiar selección de departamento
    this.puestoSeleccionado = null;  
    this.mostrarBusqueda = true;      // Limpiar selección de puesto
    const companyId = this.companyService.selectedCompany.id;

    this.http.get<{ success: boolean, employees: Empleado[] }>(
      `https://siinad.mx/php/get_employees_by_shifts.php?company_id=${companyId}&shift_id=${turno.shift_id}`
    ).subscribe(
      response => {
        if (response.success) {
          this.empleados = response.employees;
          this.empleadosFiltrados = this.empleados;
        } else {
          console.error('Error al cargar los empleados del turno');
        }
      },
      error => {
        console.error('Error al cargar los empleados del turno:', error);
      }
    );
  }


  // Función para filtrar empleados en la búsqueda
  buscarEmpleados() {
    const searchLower = this.searchQuery.toLowerCase();
    this.empleadosFiltrados = this.empleados.filter(empleado =>
      empleado.first_name.toLowerCase().includes(searchLower) ||
      (empleado.middle_name && empleado.middle_name.toLowerCase().includes(searchLower)) ||
      empleado.last_name.toLowerCase().includes(searchLower) ||
      empleado.employee_code.toLowerCase().includes(searchLower)
    );
  }
  
// Método para ver detalles del empleado
async viewEmployeeDetails(employeeId: number) {
  this.dialogService.open(EmployeeDetailsComponent, {
    context: { employeeId }, // Pasa datos al diálogo
    dialogClass: 'custom-dialog-scroll', // Asigna una clase personalizada
    // Puedes agregar otras configuraciones si es necesario
  })
  .onClose.subscribe(result => {
    if (result) {
      // Realiza acciones si el diálogo devuelve un resultado
      console.log('Resultado recibido del diálogo:', result);
    } else {
      // El usuario cerró el diálogo sin devolver ningún resultado
      console.log('El diálogo fue cerrado sin resultado.');
    }
  });
}



}

