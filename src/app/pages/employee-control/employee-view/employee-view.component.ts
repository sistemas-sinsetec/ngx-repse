/*
  En esta parte se visualizan los empleados registrados en la empresa, tanto los que estan activos como los
  inactivos, pero esto se puede manejar por medio de un menu lateral, el cual cuenta con varios filtros
  adicional a eso se pueden ver los detalles del empleado o crear una cuenta de usuario a partir del empleado
*/
import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../../services/auth.service";
import { Router } from "@angular/router";
import { EmployeeDetailsComponent } from "../employee-details/employee-details.component";
import { NbDialogService } from "@nebular/theme";
import { CompanyService } from "../../../services/company.service";
import { take } from "rxjs/operators";
import { NbWindowService } from "@nebular/theme";
import { RegisterUserComponent } from "../register-user/register-user.component";
import { environment } from "../../../../environments/environment";

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
  employee_status: string;
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
  selector: "ngx-employee-view",
  templateUrl: "./employee-view.component.html",
  styleUrls: ["./employee-view.component.scss"],
})
export class EmployeeViewComponent implements OnInit {
  mostrarBusqueda: boolean = false;
  activeFilter: string | null = null; // 'A' para activos, 'B' para inactivos

  users: User[] = [];
  departamentos: Departamento[] = [];
  puestos: Puesto[] = [];
  displayedDepartamentos: Departamento[] = [];
  displayedPuestos: Puesto[] = [];
  departamentosPage: number = 1;
  puestosPage: number = 1;
  pageSize: number = 5;
  turnos: Turno[] = [];
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  searchQuery: string = "";

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
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    this.loadAllEmployees();
    this.loadDepartments();
    this.loadPositions();
    this.loadShifts();
    this.loadUsers();
  }

  // Método para cargar usuarios desde el backend
  loadUsers() {
    this.http
      .get<User[]>(`${environment.apiBaseUrl}/getUsuarios.php`)
      .subscribe(
        (data) => {
          this.users = data;
        },
        (error) => {
          console.error("Error al cargar usuarios:", error);
        }
      );
  }

  // Carga todos los empleados sin filtros
  loadAllEmployees() {
    const companyId = this.companyService.selectedCompany.id;
    this.http
      .get<Empleado[]>(
        `${environment.apiBaseUrl}/get_empleados.php?companyId=${companyId}`
      )

      .subscribe(
        (data) => {
          this.empleados = data;
          this.empleadosFiltrados = data;
          this.mostrarBusqueda = true;
        },
        (error) => {
          console.error("Error al cargar todos los empleados:", error);
        }
      );
  }

  applyFilters() {
    let filtered = this.empleados;

    // Filtrar por estado si se ha seleccionado uno
    if (this.activeFilter) {
      filtered = filtered.filter(
        (emp) => emp.employee_status === this.activeFilter
      );
    }

    // Filtrar por búsqueda (searchQuery)
    if (this.searchQuery && this.searchQuery.trim() !== "") {
      const searchLower = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.first_name.toLowerCase().includes(searchLower) ||
          (emp.middle_name &&
            emp.middle_name.toLowerCase().includes(searchLower)) ||
          emp.last_name.toLowerCase().includes(searchLower) ||
          emp.employee_code.toLowerCase().includes(searchLower)
      );
    }

    this.empleadosFiltrados = filtered;
  }

  // Método para alternar el filtro de estado
  toggleActiveFilter(filter: string) {
    if (this.activeFilter === filter) {
      this.activeFilter = null; // Se deselecciona si se hace clic dos veces
    } else {
      this.activeFilter = filter;
    }
    this.applyFilters();
  }

  addUser(empleado: any) {
    this.windowService
      .open(RegisterUserComponent, {
        title: "Registrar Usuario",
        context: {
          employee: empleado, // Pasamos el objeto empleado
        },
        buttons: { minimize: false, maximize: false },
        windowClass: "register-user-window",
      })
      .onClose.subscribe((result) => {
        if (result && result.success) {
          // Por ejemplo, recargar la lista de usuarios para refrescar la interfaz
          this.loadUsers();
        }
      });
  }

  // Método para verificar si el empleado ya tiene un usuario
  employeeHasUser(employee_id: number): boolean {
    return this.users.some((user) => user.employee_id === employee_id);
  }

  // Cargar departamentos sin dependencia
  loadDepartments() {
    const companyId = this.companyService.selectedCompany.id;
    this.http
      .get<Departamento[]>(
        `${environment.apiBaseUrl}/get_departments.php?company_id=${companyId}`
      )
      .subscribe(
        (data) => {
          this.departamentos = data;
          this.displayedDepartamentos = this.departamentos.slice(
            0,
            this.pageSize
          );
        },
        (error) => {
          console.error("Error al cargar los departamentos:", error);
        }
      );
  }

  // Método para cargar más departamentos
  loadMoreDepartments() {
    this.departamentosPage++;
    const itemsToShow = this.departamentosPage * this.pageSize;
    this.displayedDepartamentos = this.departamentos.slice(0, itemsToShow);
  }
  // Método para volver a mostrar solo los 5 primeros departamentos
  loadLessDepartments() {
    this.departamentosPage = 1;
    this.displayedDepartamentos = this.departamentos.slice(0, this.pageSize);
  }

  // Cargar puestos y preparar la vista inicial
  loadPositions() {
    const companyId = this.companyService.selectedCompany.id;
    this.http
      .get<Puesto[]>(
        `${environment.apiBaseUrl}/get_positions.php?company_id=${companyId}`
      )
      .subscribe(
        (data) => {
          // Filtrar puestos que NO se llamen "Empresa"
          this.puestos = data.filter(
            (puesto) => puesto.position_name !== "Empresa"
          );
          this.displayedPuestos = this.puestos.slice(0, this.pageSize);
        },
        (error) => {
          console.error("Error al cargar los puestos:", error);
        }
      );
  }

  // Método para cargar más puestos
  loadMorePositions() {
    this.puestosPage++;
    const itemsToShow = this.puestosPage * this.pageSize;
    this.displayedPuestos = this.puestos.slice(0, itemsToShow);
  }

  // Método para volver a mostrar solo los 5 primeros puestos
  loadLessPositions() {
    this.puestosPage = 1;
    this.displayedPuestos = this.puestos.slice(0, this.pageSize);
  }

  // Cargar turnos sin dependencia del puesto
  loadShifts() {
    const companyId = this.companyService.selectedCompany.id;

    this.http
      .get<Turno[]>(
        `${environment.apiBaseUrl}/get_shifts.php?company_id=${companyId}`
      )
      .subscribe(
        (data) => {
          this.turnos = data;
        },
        (error) => {
          console.error("Error al cargar los turnos:", error);
        }
      );
  }

  // Seleccionar y mostrar empleados por departamento (con toggle)
  selectDepartamento(departamento: Departamento) {
    // Resetear el filtro de estado al cambiar de filtro principal
    this.activeFilter = null;
    if (
      this.departamentoSeleccionado &&
      this.departamentoSeleccionado.department_id === departamento.department_id
    ) {
      // Si ya estaba seleccionado, se deselecciona y se carga la lista completa
      this.departamentoSeleccionado = null;
      this.loadAllEmployees();
    } else {
      this.departamentoSeleccionado = departamento;
      this.puestoSeleccionado = null; // Limpiar selección de puesto
      this.turnoSeleccionado = null; // Limpiar selección de turno
      const companyId = this.companyService.selectedCompany.id;
      this.http
        .get<{ success: boolean; employees: Empleado[] }>(
          `${environment.apiBaseUrl}/get_employees_by_department.php?company_id=${companyId}&department_id=${departamento.department_id}`
        )
        .subscribe(
          (response) => {
            if (response.success) {
              this.empleados = response.employees;
              this.empleadosFiltrados = response.employees;
              // Se aplica también el filtro de búsqueda (si lo hubiera)
              this.applyFilters();
            } else {
              console.error("Error al cargar los empleados del departamento");
            }
          },
          (error) => {
            console.error(
              "Error al cargar los empleados del departamento:",
              error
            );
          }
        );
    }
  }

  // Seleccionar y mostrar empleados por puesto (con toggle)
  selectPuesto(puesto: Puesto) {
    // Resetear el filtro de estado
    this.activeFilter = null;
    if (
      this.puestoSeleccionado &&
      this.puestoSeleccionado.position_id === puesto.position_id
    ) {
      this.puestoSeleccionado = null;
      this.loadAllEmployees();
    } else {
      this.puestoSeleccionado = puesto;
      this.departamentoSeleccionado = null; // Limpiar selección de departamento
      this.turnoSeleccionado = null;
      const companyId = this.companyService.selectedCompany.id;
      this.http
        .get<{ success: boolean; employees: Empleado[] }>(
          `${environment.apiBaseUrl}/get_employees_by_position.php?company_id=${companyId}&position_id=${puesto.position_id}`
        )
        .subscribe(
          (response) => {
            if (response.success) {
              this.empleados = response.employees;
              this.empleadosFiltrados = response.employees;
              this.applyFilters();
            } else {
              console.error("Error al cargar los empleados del puesto");
            }
          },
          (error) => {
            console.error("Error al cargar los empleados del puesto:", error);
          }
        );
    }
  }

  // Seleccionar y mostrar empleados por turno (con toggle)
  selectTurno(turno: Turno) {
    // Resetear el filtro de estado
    this.activeFilter = null;

    if (
      this.turnoSeleccionado &&
      this.turnoSeleccionado.shift_id === turno.shift_id
    ) {
      this.turnoSeleccionado = null;
      this.loadAllEmployees();
    } else {
      this.turnoSeleccionado = turno;
      this.departamentoSeleccionado = null; // Limpiar selección de departamento
      this.puestoSeleccionado = null;
      const companyId = this.companyService.selectedCompany.id;
      this.http
        .get<{ success: boolean; employees: Empleado[] }>(
          `${environment.apiBaseUrl}/get_employees_by_shifts.php?company_id=${companyId}&shift_id=${turno.shift_id}`
        )
        .subscribe(
          (response) => {
            if (response.success && response.employees.length > 0) {
              this.empleados = response.employees;
              this.empleadosFiltrados = response.employees;
              this.applyFilters();
            } else {
              this.empleados = [];
              this.empleadosFiltrados = [];
              console.error(
                "No se encontraron empleados para el turno seleccionado"
              );
            }
          },
          (error) => {
            this.empleados = [];
            this.empleadosFiltrados = [];
            console.error("Error al cargar los empleados del turno:", error);
          }
        );
    }
  }
  // Función para filtrar empleados en la búsqueda
  buscarEmpleados() {
    this.applyFilters();
  }

  // Método para ver detalles del empleado
  async viewEmployeeDetails(employeeId: number) {
    this.dialogService
      .open(EmployeeDetailsComponent, {
        context: { employeeId }, // Pasa datos al diálogo
        dialogClass: "custom-dialog-scroll", // Asigna una clase personalizada
        // Puedes agregar otras configuraciones si es necesario
      })
      .onClose.subscribe((result) => {
        if (result) {
          // Realiza acciones si el diálogo devuelve un resultado
          console.log("Resultado recibido del diálogo:", result);
        } else {
          // El usuario cerró el diálogo sin devolver ningún resultado
          console.log("El diálogo fue cerrado sin resultado.");
        }
      });
  }
}
