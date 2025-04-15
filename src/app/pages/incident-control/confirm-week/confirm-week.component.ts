import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { NbSpinnerService, NbDialogService } from "@nebular/theme";
import { AuthService } from "../../../services/auth.service";
import { CompanyService } from "../../../services/company.service";
import { PeriodService } from "../../../services/period.service";
import { DialogComponent } from "../../modal-overlays/dialog/dialog.component";
import * as moment from "moment";
import { LoadingController, AlertController } from "@ionic/angular";
import { CustomToastrService } from "../../../services/custom-toastr.service";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "ngx-confirm-week",
  templateUrl: "./confirm-week.component.html",
  styleUrls: ["./confirm-week.component.scss"],
})
export class ConfirmWeekComponent {
  diasSemana: any[] = [];
  filteredEmployees: any[] = [];
  currentSemana: string = "";
  periodStartDate: string = "";
  periodEndDate: string = "";
  selectedDia: any; // Día seleccionado por el usuario
  empleadosDia: any[] = []; // Lista de empleados para el día seleccionado
  currentPeriodId: string = "";
  isWeekConfirmed: boolean = false; // Verificar si la semana está confirmada
  empleadosIncidencias: any[] = [];

  filteredEmpleadosDia: any[] = []; // Lista filtrada de empleados asignados
  filteredEmpleadosIncidencias: any[] = []; // Lista filtrada de empleados con incidencias
  searchTerm: string = ""; // Término de búsqueda

  restDays: string[] = []; // Días de descanso del periodo seleccionado

  constructor(
    private authService: AuthService,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private toastrService: CustomToastrService,
    private dialogService: NbDialogService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {
    this.restDays =
      this.periodService.getSelectedPeriod()?.rest_days_position || [];
  }

  ngOnInit() {
    moment.locale("es-mx");
    this.loadWeekData();
  }

  // Cargar los datos de la semana
  async loadWeekData() {
    const loading = await this.loadingController.create({
      message: "Cargando datos de la semana...",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;

    if (!companyId || !periodTypeId) {
      console.error("No se proporcionaron company_id o period_type_id");
      loading.dismiss();
      return;
    }

    const url = `${environment.apiBaseUrl}/get-week-data.php?company_id=${companyId}&period_type_id=${periodTypeId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        if (data && data.length > 0 && !data.error) {
          this.diasSemana = data;
          this.filteredEmployees = [...this.diasSemana];

          const semanaActual = this.diasSemana[0];
          this.currentSemana = semanaActual.week_number;
          this.periodStartDate = semanaActual.period_start_date;
          this.periodEndDate = semanaActual.period_end_date;
          this.currentPeriodId = semanaActual.period_id;

          // Usar el servicio para generar los días de la semana
          this.diasSemana = this.periodService.generarDiasDeSemana(
            this.periodStartDate,
            this.periodEndDate,
            this.currentPeriodId,
            this.diasSemana, // El arreglo original que obtuviste de la API
            this.companyService.selectedCompany.id
          );

          this.verificarConfirmacionSemana(companyId, this.currentPeriodId);
        } else {
          console.error("No se encontraron días confirmados para la semana.");
          this.toastrService.showWarning(
            "No se encontraron días confirmados para la semana.",
            "Aviso"
          );
        }
        loading.dismiss();
      },
      (error) => {
        console.error("Error al cargar los datos de la semana", error);
        loading.dismiss();
      }
    );
  }

  // Verificar si la semana está confirmada
  verificarConfirmacionSemana(companyId: string, periodId: string) {
    const confirmUrl = `${environment.apiBaseUrl}/get-week-confirmations.php?company_id=${companyId}&period_id=${periodId}`;

    this.http.get(confirmUrl).subscribe(
      (response: any) => {
        this.isWeekConfirmed = response && response.length > 0;
      },
      (error) => {
        console.error("Error al verificar la confirmación de la semana", error);
      }
    );
  }
  // Generar los días de la semana

  // Cargar los empleados para un día específico
  async cargarEmpleadosDia(dia: any) {
    const loading = await this.loadingController.create({
      message: "Cargando empleados para el día seleccionado...",
    });
    await loading.present();
    // Limpiar listas de empleados asignados e incidencias antes de cargar los nuevos datos
    this.empleadosDia = []; // Lista de empleados asignados
    this.empleadosIncidencias = []; // Lista de empleados con incidencias

    const companyId = dia.company_id;
    const periodId = dia.period_id;
    const date = dia.date;

    const url = `${environment.apiBaseUrl}/get-employee-assignments-days.php?company_id=${companyId}&period_id=${periodId}&date=${date}`;

    try {
      const data: any = await this.http.get(url).toPromise();

      if (data) {
        // Asignar los empleados asignados y con incidencias
        this.empleadosDia = data.empleados_asignados || [];
        this.empleadosIncidencias = data.empleados_incidencias || [];

        // Crear una lista de empleados combinados
        this.empleadosDia = this.empleadosDia.map((empAsignado) => {
          // Verificar si el empleado también tiene una incidencia
          const incidencia = this.empleadosIncidencias.find(
            (inc) => inc.employee_id === empAsignado.employee_id
          );

          // Si el empleado tiene una incidencia, combinar los datos
          if (incidencia) {
            return {
              ...empAsignado,
              incident_type: incidencia.incident_type,
              description: incidencia.description,
              hasIncidencia: true, // Bandera para indicar que tiene una incidencia
            };
          }

          // Si no tiene incidencia, devolver el empleado tal cual
          return empAsignado;
        });

        // Filtrar empleados con incidencias que no están en `empleadosDia`
        this.empleadosIncidencias = this.empleadosIncidencias.filter(
          (inc) =>
            !this.empleadosDia.some(
              (emp) => emp.employee_id === inc.employee_id
            )
        );

        // Inicializar las listas filtradas con los datos recién cargados
        this.filteredEmpleadosDia = [...this.empleadosDia];
        this.filteredEmpleadosIncidencias = [...this.empleadosIncidencias];

        if (
          this.empleadosDia.length === 0 &&
          this.empleadosIncidencias.length === 0
        ) {
          console.error(
            "No se encontraron empleados para el día seleccionado."
          );
        }
      } else {
        console.error("No se encontraron empleados para el día seleccionado.");
      }
    } catch (error) {
      console.error(
        "Error al cargar los empleados para el día seleccionado",
        error
      );
    } finally {
      loading.dismiss();
    }
  }

  async mostrarInfoDia(dia: any) {
    this.selectedDia = dia;
    await this.cargarEmpleadosDia(dia); // Cargar empleados del día

    // Si es día de descanso pero tiene empleados asignados, permitir confirmar
    if (
      dia.isRestDay &&
      (this.empleadosDia.length > 0 || this.empleadosIncidencias.length > 0)
    ) {
      this.toastrService.showWarning(
        "Este es un día de descanso, pero hay empleados asignados.",
        `Información del Día: ${dia.date}`
      );
    }
    // Si no hay empleados, mostrar mensaje normal
    else if (
      this.empleadosDia.length === 0 &&
      this.empleadosIncidencias.length === 0
    ) {
      this.toastrService.showInfo(
        "No hay empleados asignados ni con incidencias para este día.",
        `Información del Día: ${dia.date}`
      );
    }
  }

  // Confirmar toda la semana
  async confirmarSemana() {
    const alert = await this.alertController.create({
      header: "Confirmar Semana",
      message: "¿Estás seguro de que quieres confirmar toda la semana?",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
          handler: () => {
            console.log("Confirmación de semana cancelada");
          },
        },
        {
          text: "Confirmar",
          handler: () => {
            this.confirmarSemanaCompleta();
          },
        },
      ],
    });
    await alert.present();
  }

  // Confirmar la semana completa
  async confirmarSemanaCompleta() {
    const loading = await this.loadingController.create({
      message: "Confirmando semana...",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodId = this.currentPeriodId;
    const periodTypeId = this.periodService.selectedPeriod.id;
    const weekNumber = this.currentSemana;

    if (!companyId || !periodId || !periodTypeId || !weekNumber) {
      console.error("Faltan datos para confirmar la semana");
      await loading.dismiss();
      return;
    }

    const body = {
      company_id: companyId,
      period_id: periodId,
      period_type_id: periodTypeId,
      week_number: weekNumber,
    };

    const url = `${environment.apiBaseUrl}/confirm-week.php`;

    try {
      const response: any = await this.http.post(url, body).toPromise();
      if (response && response.success) {
        console.log("Semana confirmada correctamente");
        this.isWeekConfirmed = true;
        await this.toastrService.showSuccess(
          "La semana se ha confirmado exitosamente."
        );
      } else {
        console.error("Error al confirmar la semana:", response.message);
        await this.toastrService.showError(
          "Hubo un problema al confirmar la semana. Inténtalo de nuevo."
        );
      }
    } catch (error) {
      console.error(
        "Error en la solicitud de confirmación de la semana:",
        error
      );
      await this.toastrService.showError(
        "Hubo un problema al conectar con el servidor. Inténtalo de nuevo."
      );
    } finally {
      // Asegúrate de cerrar el loading en cualquier caso
      await loading.dismiss();
    }
  }

  // Método para mostrar alertas con Nebular Toastr
  async mostrarAlerta(header: string, message: string) {
    this.toastrService.showError(message, header);
  }

  filterEmployees() {
    const searchTermLower = this.searchTerm.toLowerCase();

    // Filtrar empleados asignados
    this.filteredEmpleadosDia = this.empleadosDia.filter(
      (emp) =>
        emp.employee_code.toLowerCase().includes(searchTermLower) ||
        emp.first_name.toLowerCase().includes(searchTermLower) ||
        emp.last_name.toLowerCase().includes(searchTermLower) ||
        (emp.middle_name &&
          emp.middle_name.toLowerCase().includes(searchTermLower))
    );

    // Filtrar empleados con incidencias
    this.filteredEmpleadosIncidencias = this.empleadosIncidencias.filter(
      (emp) =>
        emp.employee_code.toLowerCase().includes(searchTermLower) ||
        emp.first_name.toLowerCase().includes(searchTermLower) ||
        emp.last_name.toLowerCase().includes(searchTermLower) ||
        (emp.middle_name &&
          emp.middle_name.toLowerCase().includes(searchTermLower))
    );
  }

  async eliminarEmpleadoDelDia(employeeId: string) {
    const alert = await this.alertController.create({
      header: "Confirmar eliminación",
      message:
        "¿Estás seguro de que deseas eliminar este empleado asignado del día y su incidencia (si existe)?",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
        },
        {
          text: "Eliminar",
          handler: async () => {
            const loading = await this.loadingController.create({
              message: "Eliminando empleado asignado...",
            });
            await loading.present();
            const url = `${environment.apiBaseUrl}/delete-employee-assignment-incident.php`;
            const body = {
              employee_id: employeeId,
              date: this.selectedDia.date,
            };
            this.http.post(url, body).subscribe(
              async (response: any) => {
                if (response && response.success) {
                  // Actualizar las listas eliminando el empleado correspondiente
                  this.empleadosDia = this.empleadosDia.filter(
                    (emp) => emp.employee_id !== employeeId
                  );
                  this.filteredEmpleadosDia = this.filteredEmpleadosDia.filter(
                    (emp) => emp.employee_id !== employeeId
                  );

                  this.empleadosIncidencias = this.empleadosIncidencias.filter(
                    (emp) => emp.employee_id !== employeeId
                  );
                  this.filteredEmpleadosIncidencias =
                    this.filteredEmpleadosIncidencias.filter(
                      (emp) => emp.employee_id !== employeeId
                    );

                  await this.mostrarAlerta(
                    "Eliminado",
                    "El empleado y su incidencia han sido eliminados correctamente."
                  );
                } else {
                  console.error(
                    "Error al eliminar el empleado:",
                    response.error
                  );
                  await this.mostrarAlerta(
                    "Error",
                    response.error ||
                      "Hubo un problema al eliminar el empleado."
                  );
                }
                loading.dismiss();
              },
              async (error) => {
                console.error(
                  "Error en la solicitud de eliminación del empleado:",
                  error
                );
                await this.mostrarAlerta(
                  "Error",
                  "Hubo un problema al conectar con el servidor. Inténtalo de nuevo."
                );
                loading.dismiss();
              }
            );
          },
        },
      ],
    });

    await alert.present();
  }

  canConfirmWeek(): boolean {
    const laborDays = this.diasSemana.filter((dia) => !dia.isRestDay);
    const allLaborDaysConfirmed = laborDays.every(
      (dia) => dia.status === "confirmed"
    );
    const hasEmployeesOrIncidences =
      this.filteredEmpleadosDia.length > 0 ||
      this.filteredEmpleadosIncidencias.length > 0;
    return (
      allLaborDaysConfirmed && hasEmployeesOrIncidences && !this.isWeekConfirmed
    );
  }

  async toggleConfirmacionDia(dia: any) {
    const newStatus = dia.status === "confirmed" ? "pending" : "confirmed";
    const loading = await this.loadingController.create({
      message:
        newStatus === "confirmed"
          ? "Confirmando día..."
          : "Desconfirmando día...",
    });
    await loading.present();

    const body = {
      company_id: dia.company_id,
      period_id: dia.period_id,
      period_type_id: this.periodService.selectedPeriod.id,
      day_of_week: dia.date, // Asegúrate de que dia tenga este campo
      confirmation_date: new Date().toISOString().split("T")[0],
      week_number: this.currentSemana,
      status: newStatus,
    };
    this.http.post(`${environment.apiBaseUrl}/confirm-day.php`, body).subscribe(
      (response: any) => {
        if (response?.success) {
          dia.status = newStatus; // Actualizar estado en el frontend
          this.toastrService.showSuccess(
            `Día ${
              newStatus === "confirmed" ? "confirmado" : "desconfirmado"
            } correctamente.`,
            "Éxito"
          );
          this.cargarEmpleadosDia(dia); // Recargar datos del día
        } else {
          this.toastrService.showError(
            response?.error || "Error en el servidor",
            "Error"
          );
        }
        loading.dismiss();
      },
      (error) => {
        this.toastrService.showError("Error de conexión", "Error");
        loading.dismiss();
      }
    );
  }
  private formatDate(dateString: string): string {
    return moment(dateString).format("DD/MM/YYYY");
  }

  private handleError(error: any): void {
    console.error("Error:", error);
    this.toastrService.showError(
      "Ocurrió un error al procesar la solicitud. Intenta nuevamente.",
      "Error"
    );
  }

  // Mostrar periodStartDate formateado
  get formattedPeriodStartDate(): string {
    return this.periodStartDate
      ? moment(this.periodStartDate).format("LL")
      : "No disponible";
  }

  // Mostrar periodEndDate formateado
  get formattedPeriodEndDate(): string {
    return this.periodEndDate
      ? moment(this.periodEndDate).format("LL")
      : "No disponible";
  }
}
