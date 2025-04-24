/*
  En esta parte se asignan los empleados a proyectos dia con dia, tiene un boton para trear asignaciones pasadas y
  Una lista de donde se van seleccionando los empleados en cierta fecha
*/

import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "../../../services/auth.service";
import * as moment from "moment";
import { AssignmentSummaryComponent } from "../assignment-summary/assignment-summary.component";
import { NbDialogService } from "@nebular/theme";
import { Router } from "@angular/router";
import { CompanyService } from "../../../services/company.service";
import { PeriodService } from "../../../services/period.service";
import { LoadingController } from "@ionic/angular";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "ngx-assign-projects",
  templateUrl: "./assign-projects.component.html",
  styleUrls: ["./assign-projects.component.scss"],
})
export class AssignProjectsComponent implements OnInit {
  pastAssignmentsInfo: { count: number; date: string } = null;
  lastAssignedEmployeeIds: number[] = [];

  semanas: any[] = [];
  selectedSemana: any;
  selectedDia: string = "";
  obras: any[] = [];
  filteredObras: any[] = [];
  selectedObra: any;
  empleados: any[] = [];
  selectedEmpleados: any[] = [];
  searchEmployee: string = "";
  filteredEmpleados: any[] = [];
  diasSemana: any[] = [];
  searchObra: string = "";

  constructor(
    private dialogService: NbDialogService,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    moment.locale("es");
    this.loadWeeks();
  }

  formatDate(date: string): string {
    return moment(date).format("DD MMM YYYY");
  }

  // Nuevo método para solo actualizar la info sin seleccionar empleados
  async updatePastAssignmentsInfo(): Promise<void> {
    if (!this.selectedObra || !this.selectedDia) {
      console.error("Debe seleccionarse un día y una obra.");
      return;
    }

    const loading = await this.loadingController.create({
      message: "Actualizando info de asignaciones...",
      spinner: "circles",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const projectId = this.selectedObra.project_id;
    const dayOfWeek = this.selectedDia;

    this.http
      .get(
        `${environment.apiBaseUrl}/get_previous_assigned.php?company_id=${companyId}&day_of_week=${dayOfWeek}&project_id=${projectId}`
      )
      .subscribe(
        (data: any) => {
          if (Array.isArray(data)) {
            this.pastAssignmentsInfo = {
              count: data.length,
              date: data.length ? data[0].day_of_week : null,
            };
          } else {
            this.pastAssignmentsInfo = null;
          }
        },
        (error) => {
          console.error("Error al actualizar asignaciones pasadas", error);
          loading.dismiss();
        },
        () => {
          loading.dismiss();
        }
      );
  }

  async loadWeeks() {
    const companyId = this.companyService.selectedCompany.id;
    const selectedPeriod = this.periodService.selectedPeriod.id;

    if (!selectedPeriod) {
      console.error("No se ha seleccionado un tipo de periodo");
      return;
    }

    let loading = await this.loadingController.create({
      message: "Cargando semanas...",
      spinner: "circles",
    });

    try {
      await loading.present();

      this.http
        .get(
          `${environment.apiBaseUrl}/get_weekly_periods.php?company_id=${companyId}&period_type_id=${selectedPeriod}`
        )
        .subscribe(
          (data: any) => {
            this.semanas = data || [];

            if (this.semanas.length > 0) {
              const currentWeek = this.semanas.find((week) =>
                this.isCurrentWeek(week)
              );

              this.selectedSemana = currentWeek || this.semanas[0];

              this.onSemanaChange(this.selectedSemana);

              if (!currentWeek) {
                console.error(
                  "No se encontró la semana actual en los registros."
                );
              }
            }

            // Encontrar la semana actual
          },
          (error) => {
            console.error("Error al cargar las semanas", error);
          },
          () => {
            loading.dismiss();
          }
        );
    } catch (e) {
      console.error("Error al presentar el loading", e);
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  isCurrentWeek(semana: any): boolean {
    const today = moment();
    const start = moment(semana.start_date).startOf("day");
    const end = moment(semana.end_date).endOf("day");

    return today.isBetween(start, end, null, "[]");
  }

  resetFields(): void {
    this.selectedSemana = null;
    this.selectedDia = "";
    this.selectedObra = null;
    this.selectedEmpleados = [];
    this.searchEmployee = "";
    this.filteredEmpleados = [];
    this.diasSemana = [];
    this.searchObra = "";
    this.filteredObras = [];
  }

  onSemanaChange(semana: any): void {
    this.resetFields(); // Este método ya reinicia varias variables
    this.selectedSemana = semana;
    this.generateDiasSemana(semana.start_date, semana.end_date);
    this.loadObras(semana.start_date, semana.end_date);
    // Reinicia el contador de empleados seleccionados y la info de asignaciones pasadas
    this.selectedEmpleados = [];
    this.pastAssignmentsInfo = null;
  }

  generateDiasSemana(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    let day = start;
    while (day <= end) {
      this.diasSemana.push({
        date: day.format("YYYY-MM-DD"),
        display: day.format("dddd"),
      });
      day = day.add(1, "day");
    }
  }

  onDiaChange(dia: string): void {
    this.selectedDia = dia;

    // Resetear el contador de empleados seleccionados
    this.selectedEmpleados = [];
    // Desmarcar la selección en la lista de empleados (si ya han sido cargados)
    if (this.empleados && this.empleados.length) {
      this.empleados.forEach((empleado) => (empleado.selected = false));
    }

    // Cargar empleados sin marcar asignaciones automáticas
    this.loadEmpleados(this.selectedSemana, dia, this.selectedObra);

    // Actualiza solo la información global de asignaciones pasadas sin seleccionar empleados
    if (this.selectedObra) {
      this.updatePastAssignmentsInfo();
    }
  }

  async loadObras(startDate: string, endDate: string) {
    let loading = await this.loadingController.create({
      message: "Cargando obras...",
      spinner: "circles",
    });

    try {
      await loading.present();

      const companyId = this.companyService.selectedCompany.id; // Obtener el companyId desde AuthService

      this.http
        .get(
          `${environment.apiBaseUrl}/get_projects_by_date.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}`
        )
        .subscribe(
          (data: any) => {
            this.obras = data.sort((a, b) =>
              a.project_name.localeCompare(b.project_name, "es")
            );
            this.filterObrasByDate(startDate, endDate);
            this.filterObras(); // Inicializar la lista filtrada
          },
          (error) => {
            console.error("Error al cargar las obras", error);
          },
          () => {
            loading.dismiss();
          }
        );
    } catch (e) {
      console.error("Error al presentar el loading", e);
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  filterObrasByDate(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);

    this.filteredObras = this.obras.filter((obra) => {
      const obraStartDate = moment(obra.start_date);
      const obraEndDate = moment(obra.end_date);
      return (
        obraStartDate.isBetween(start, end, "day", "[]") ||
        obraEndDate.isBetween(start, end, "day", "[]")
      );
    });
  }

  async loadEmpleados(semana: any, dia: string, obra: any) {
    let loading = await this.loadingController.create({
      message: "Cargando empleados...",
      spinner: "circles",
    });

    try {
      await loading.present();

      if (semana && dia && obra) {
        const companyId = this.companyService.selectedCompany.id;
        const userId = this.authService.userId; // Agregado: Obtener el user_id del usuario autenticado
        const startDate = this.selectedSemana?.start_date;
        const endDate = this.selectedSemana?.end_date;
        const weekNumber = this.selectedSemana?.week_number;
        const dayOfWeek = this.selectedDia;

        // Obtener empleados activos con filtro de department_range
        this.http
          .get(
            `${environment.apiBaseUrl}/get_active_employees_by_date.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}&user_id=${userId}`
          )
          .subscribe(
            (data: any) => {
              this.empleados = Array.isArray(data) ? data : [];
              this.filterEmpleados();

              // Obtener empleados ya asignados con el filtro de department_range
              this.http
                .get(
                  `${environment.apiBaseUrl}/get_assigned_employees.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}&week_number=${weekNumber}&day_of_week=${dayOfWeek}&user_id=${userId}`
                )
                .subscribe(
                  (assignedData: any) => {
                    this.markAssignedEmployees(assignedData);
                  },
                  (error) => {
                    console.error("Error al cargar empleados asignados", error);
                  },
                  () => {
                    loading.dismiss();
                  }
                );
            },
            (error) => {
              console.error("Error al cargar los empleados", error);
            },
            () => {
              loading.dismiss();
            }
          );
      } else {
        loading.dismiss();
      }
    } catch (e) {
      console.error("Error al presentar el loading", e);
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  markAssignedEmployees(assignedEmployees: any) {
    const assignedIds = assignedEmployees.map((id) => Number(id));

    this.empleados.forEach((empleado) => {
      // Verificar si el ID existe en la lista de asignados
      empleado.isAssigned = assignedIds.includes(empleado.employee_id);

      // Si está asignado, quitar selección si existe
      if (empleado.isAssigned && empleado.selected) {
        empleado.selected = false;
        const index = this.selectedEmpleados.indexOf(empleado);
        if (index > -1) {
          this.selectedEmpleados.splice(index, 1);
        }
      }
    });

    this.filterEmpleados();
  }

  filterObras() {
    const searchTerm = this.searchObra.toLowerCase();
    this.filteredObras = this.obras
      .filter((obra) => obra.project_name.toLowerCase().includes(searchTerm))
      .sort((a, b) => a.project_name.localeCompare(b.project_name, "es")); // Orden adicional
  }
  async loadLastAssignedEmployees(): Promise<void> {
    if (!this.selectedObra || !this.selectedDia) {
      console.error("Debe seleccionarse un día y una obra.");
      return;
    }

    const loading = await this.loadingController.create({
      message: "Cargando asignaciones...",
      spinner: "circles",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const projectId = this.selectedObra.project_id;
    const dayOfWeek = this.selectedDia;

    this.http
      .get(
        `${environment.apiBaseUrl}/get_previous_assigned.php?company_id=${companyId}&day_of_week=${dayOfWeek}&project_id=${projectId}`
      )
      .subscribe(
        (data: any) => {
          if (Array.isArray(data)) {
            // Guardamos los IDs de los empleados obtenidos
            this.lastAssignedEmployeeIds = data.map((emp) =>
              Number(emp.employee_id)
            );

            this.pastAssignmentsInfo = {
              count: data.length,
              date: data.length ? data[0].day_of_week : null,
            };

            data.forEach((emp) => {
              const found = this.empleados.find(
                (e) => Number(e.employee_id) === Number(emp.employee_id)
              );
              if (found && !found.selected && !found.isAssigned) {
                found.selected = true;
                this.selectedEmpleados.push(found);
              }
            });
            this.filterEmpleados();
          } else {
            this.pastAssignmentsInfo = null;
          }
        },
        (error) => {
          console.error("Error al cargar asignaciones pasadas", error);
          loading.dismiss();
        },
        () => {
          loading.dismiss();
        }
      );
  }

  filterEmpleados() {
    const searchTerm = this.searchEmployee.toLowerCase();
    this.filteredEmpleados = this.empleados
      .filter((empleado) => {
        const fullName =
          `${empleado.last_name} ${empleado.middle_name} ${empleado.first_name}`.toLowerCase();
        // Se filtra por el término de búsqueda y se excluyen los empleados confirmados
        return fullName.includes(searchTerm) && !empleado.isAssigned;
      })
      .sort((a, b) => {
        // Los seleccionados se muestran primero
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        // Si ambos tienen el mismo estado, se ordena alfabéticamente (por apellido, por ejemplo)
        return a.last_name.localeCompare(b.last_name, "es");
      });
  }

  get allLastAssignedAlreadySelected(): boolean {
    if (
      !this.lastAssignedEmployeeIds ||
      this.lastAssignedEmployeeIds.length === 0
    ) {
      return false;
    }
    return this.lastAssignedEmployeeIds.every((id) => {
      const emp = this.empleados.find((e) => Number(e.employee_id) === id);
      return emp ? emp.selected : false;
    });
  }

  toggleUnassignedEmployeesSelection(): void {
    // Filtra los empleados que no están asignados
    const unassignedEmployees = this.filteredEmpleados.filter(
      (empleado) => !empleado.isAssigned
    );

    // Verifica si todos los empleados no asignados ya están seleccionados
    const areAllSelected = unassignedEmployees.every(
      (empleado) => empleado.selected
    );

    if (areAllSelected) {
      // Si están todos seleccionados, se deseleccionan
      unassignedEmployees.forEach((empleado) => {
        empleado.selected = false;
        const index = this.selectedEmpleados.indexOf(empleado);
        if (index > -1) {
          this.selectedEmpleados.splice(index, 1);
        }
      });
    } else {
      // Si no todos están seleccionados, se seleccionan los que aún no lo están
      unassignedEmployees.forEach((empleado) => {
        if (!empleado.selected) {
          empleado.selected = true;
          this.selectedEmpleados.push(empleado);
        }
      });
    }
  }

  get toggleButtonLabel(): string {
    const unassignedEmployees = this.filteredEmpleados.filter(
      (empleado) => !empleado.isAssigned
    );
    // Si no hay empleados no asignados, retorna un texto adecuado (opcional)
    if (unassignedEmployees.length === 0) {
      return "No hay empleados no asignados";
    }
    // Si todos los empleados no asignados están seleccionados, el botón mostrará "Desmarcar..."
    return unassignedEmployees.every((empleado) => empleado.selected)
      ? "Desmarcar Todos No Asignados"
      : "Marcar Todos No Asignados";
  }

  toggleEmpleadoSelection(empleado: any): void {
    if (empleado.isAssigned) return; // No hacer nada si está asignado

    empleado.selected = !empleado.selected;

    const index = this.selectedEmpleados.indexOf(empleado);
    if (empleado.selected && index === -1) {
      // Agregar empleado a la lista seleccionada
      this.selectedEmpleados.push(empleado);
    } else if (!empleado.selected && index > -1) {
      // Remover empleado de la lista seleccionada
      this.selectedEmpleados.splice(index, 1);
    }

    // Reordenar la lista para que los seleccionados aparezcan arriba
    this.filterEmpleados();
  }

  async assignEmployees() {
    const dialogRef = this.dialogService.open(AssignmentSummaryComponent, {
      context: {
        selectedSemana: this.selectedSemana,
        selectedDia: this.selectedDia,
        selectedObra: this.selectedObra,
        selectedEmpleados: this.selectedEmpleados,
        authService: this.authService,
      },
      closeOnBackdropClick: true,
      autoFocus: true,
      closeOnEsc: true,
      hasScroll: true,
    });

    dialogRef.onClose.subscribe((data) => {
      if (data?.confirmed) {
        this.sendAssignment();
      }
    });
  }

  async sendAssignment() {
    // Crear el spinner de carga
    const loading = await this.loadingController.create({
      message: "Asignando empleados...",
      spinner: "circles",
    });

    // Mostrar el spinner de carga
    await loading.present();

    try {
      const data = {
        weekNumber: this.selectedSemana?.week_number,
        startDate: this.selectedSemana?.start_date,
        endDate: this.selectedSemana?.end_date,
        dayOfWeek: this.selectedDia,
        dayText: moment(this.selectedDia).format("dddd"),
        obraId: this.selectedObra?.project_id,
        employeeIds: this.selectedEmpleados.map((e) => Number(e.employee_id)),
        companyId: this.companyService.selectedCompany.id,
        fiscalYear: this.periodService.selectedPeriod.year,
        periodTypeId: this.periodService.selectedPeriod.id,
        periodNumber: this.selectedSemana?.period_number,
        periodId: this.selectedSemana?.period_id,
      };

      // Realizar la solicitud HTTP
      await this.http
        .post(`${environment.apiBaseUrl}/assign-employees.php`, data)
        .toPromise();
      console.log("Empleados asignados correctamente");

      // Marcar empleados como asignados y limpiar la lista de seleccionados
      this.selectedEmpleados.forEach((empleado) => {
        empleado.isAssigned = true;
      });
      this.selectedEmpleados = [];

      // Recargar la lista de empleados para que ya no aparezcan los confirmados
      this.loadEmpleados(
        this.selectedSemana,
        this.selectedDia,
        this.selectedObra
      );
    } catch (error) {
      console.error("Error al asignar empleados", error);
    } finally {
      // Cerrar el spinner de carga
      loading.dismiss();
    }
  }

  onObraChange(obra: any): void {
    this.selectedObra = obra;

    // Resetear el contador de empleados seleccionados
    this.selectedEmpleados = [];
    // Desmarcar la selección en la lista de empleados
    if (this.empleados && this.empleados.length) {
      this.empleados.forEach((empleado) => (empleado.selected = false));
    }

    // Cargar empleados según la obra y el día seleccionados
    this.loadEmpleados(this.selectedSemana, this.selectedDia, obra);

    // Actualiza la información global de asignaciones pasadas (sin seleccionar empleados) si el día ya ha sido seleccionado
    if (this.selectedDia) {
      this.updatePastAssignmentsInfo();
    }
  }

  onSearchChange() {
    this.filterEmpleados();
  }

  isFormValid(): boolean {
    return (
      this.selectedSemana &&
      this.selectedDia &&
      this.selectedObra &&
      this.selectedEmpleados.length > 0
    );
  }

  selectAllUnassignedEmployees(): void {
    this.filteredEmpleados.forEach((empleado) => {
      if (!empleado.isAssigned && !empleado.selected) {
        empleado.selected = true; // Marcar el empleado como seleccionado
        this.selectedEmpleados.push(empleado); // Añadir a la lista de seleccionados
      }
    });
  }

  // Mostrar selectedDia formateado
  get formattedSelectedDia(): string {
    return this.selectedDia
      ? moment(this.selectedDia).format("LL")
      : "No disponible";
  }
}
