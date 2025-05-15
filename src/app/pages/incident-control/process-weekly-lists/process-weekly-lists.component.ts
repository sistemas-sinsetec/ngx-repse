/*
  En este codigo se procesan las semanas para mandarlas al siguiente estado de revision, tambien se visualiza
  una tabla en la que tenemos los datos de la lista de asistencia
*/

import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  NbSpinnerService,
  NbAlertModule,
  NbDialogService,
} from "@nebular/theme";
import { AuthService } from "../../../services/auth.service";
import { CompanyService } from "../../../services/company.service";
import { PeriodService } from "../../../services/period.service";
import { ProcessedListDialogComponent } from "../processed-list-dialog/processed-list-dialog.component";
import { LoadingController, AlertController } from "@ionic/angular";
import { CustomToastrService } from "../../../services/custom-toastr.service";
import { environment } from "../../../../environments/environment";

import jsPDF from "jspdf";
import * as moment from "moment";
import autoTable from "jspdf-autotable";

@Component({
  selector: "ngx-process-weekly-lists",
  templateUrl: "./process-weekly-lists.component.html",
  styleUrls: ["./process-weekly-lists.component.scss"],
})
export class ProcessWeeklyListsComponent {
  confirmedWeeks: any[] = []; // Lista de semanas confirmadas
  selectedWeek: any; // Semana confirmada seleccionada
  diasSemana: any[] = []; // Días de la semana seleccionada
  empleadosSemana: any[] = []; // Lista de empleados con sus horarios y incidencias

  isButtonDisabled: boolean = false;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertModule: NbAlertModule,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private toastrService: CustomToastrService,
    private dialogService: NbDialogService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    moment.locale("es"); // Configurar moment.js para usar el idioma español
    this.loadConfirmedWeeks(); // Cargar las semanas confirmadas al iniciar la página
  }

  // Cargar las semanas confirmadas
  async loadConfirmedWeeks() {
    const loading = await this.loadingController.create({
      message: "Cargando semanas confirmadas...",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;

    if (!companyId || !periodTypeId) {
      console.error("No se proporcionaron company_id o period_type_id");
      loading.dismiss();
      return;
    }

    const url = `${environment.apiBaseUrl}/get-confirmations-week.php?company_id=${companyId}&period_type_id=${periodTypeId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        loading.dismiss();
        if (Array.isArray(data) && data.length > 0) {
          this.confirmedWeeks = data;
        } else {
          // Si data está vacío o no es un array, muestra el toast
          this.confirmedWeeks = [];
          this.toastrService.showWarning(
            "No hay semanas confirmadas por el momento. Inténtalo más tarde.",
            "Aviso"
          );
        }
      },
      (error) => {
        console.error("Error al cargar semanas confirmadas", error);
        loading.dismiss();
      }
    );
  }

  // Cargar los días de la semana y los empleados al seleccionar una semana
  async onWeekChange(week: any) {
    this.isButtonDisabled = false; // Habilitar el botón
    if (
      week &&
      week.payroll_period &&
      week.payroll_period.start_date &&
      week.payroll_period.end_date
    ) {
      this.selectedWeek = week;
      this.generateWeekDays(
        week.payroll_period.start_date,
        week.payroll_period.end_date
      );
      await this.loadEmployeesForWeek();
    } else {
      console.error(
        "La semana seleccionada no contiene información de payroll_period o las fechas no están definidas"
      );
    }
  }

  // Generar los días de la semana en un rango de fechas
  generateWeekDays(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    while (start.isSameOrBefore(end)) {
      this.diasSemana.push({
        date: start.format("YYYY-MM-DD"),
        display: start.format("dddd"),
      });
      start.add(1, "days");
    }
  }

  // Cargar los empleados y sus horas de trabajo para la semana seleccionada
  async loadEmployeesForWeek() {
    if (!this.selectedWeek || !this.companyService.selectedCompany) return;

    const loading = await this.loadingController.create({
      message: "Cargando datos de empleados...",
    });
    await loading.present();

    // Obtener el ID de la compañía
    const companyId = this.companyService.selectedCompany.id;

    // Incluir el ID de la compañía como parámetro en la URL
    const url = `${environment.apiBaseUrl}/get-employees-weekly-data.php?week_number=${this.selectedWeek.week_number}&company_id=${companyId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        const processedData = this.processEmployeeData(data);
        this.empleadosSemana = processedData;
        loading.dismiss();
      },
      (error) => {
        console.error("Error al cargar datos de empleados", error);
        loading.dismiss();
      }
    );
  }

  // Procesar los datos de los empleados para organizar por fecha y evitar repetición
  processEmployeeData(data: any[]): any[] {
    const employeesMap: any = {};

    data.forEach((record) => {
      const employeeId = record.employee_id;
      const date = record.day_of_week;

      if (!employeesMap[employeeId]) {
        employeesMap[employeeId] = {
          employee_code: record.employee_code,
          first_name: record.first_name,
          middle_name: record.middle_name,
          last_name: record.last_name,
          work_hours: {},
        };
      }

      employeesMap[employeeId].work_hours[date] = {
        entry_time: record.entry_time,
        lunch_start_time: record.lunch_start_time,
        lunch_end_time: record.lunch_end_time,
        second_lunch_start_time: record.second_lunch_start_time,
        second_lunch_end_time: record.second_lunch_end_time,
        exit_time: record.exit_time,
        incident: record.incident_type,
        project_name: record.project_name,
        description: record.description,
      };
    });

    return Object.values(employeesMap);
  }

  // Procesar la semana seleccionada
  async processSelectedWeek() {
    if (!this.selectedWeek) return;

    const loading = await this.loadingController.create({
      message: "Procesando semana seleccionada...",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;
    const startDate = this.selectedWeek.payroll_period?.start_date;
    const endDate = this.selectedWeek.payroll_period?.end_date;

    const url = `${environment.apiBaseUrl}/process-week.php`;
    const data = {
      week_number: this.selectedWeek.week_number,
      company_id: companyId,
      period_type_id: periodTypeId,
      start_date: startDate,
      end_date: endDate,
    };

    this.http.post(url, data).subscribe(
      async (response: any) => {
        loading.dismiss();
        this.isButtonDisabled = true;

        // Eliminar la semana procesada del arreglo
        this.confirmedWeeks = this.confirmedWeeks.filter(
          (week) => week.week_number !== this.selectedWeek.week_number
        );

        // Limpiar los datos visuales
        this.selectedWeek = null;
        this.diasSemana = [];
        this.empleadosSemana = [];

        // Mostrar alertas
        const alert = await this.alertController.create({
          header: "Éxito",
          message: "La semana ha sido procesada exitosamente.",
          buttons: ["OK"],
        });
        await alert.present();

        this.toastrService.showSuccess(
          "La semana ha sido procesada exitosamente.",
          "Éxito"
        );
      },
      async (error) => {
        loading.dismiss();
        this.toastrService.showError(
          "Hubo un error al procesar la semana. Por favor, intente nuevamente.",
          "Error"
        );
        console.error("Error al procesar la semana", error);
      }
    );
  }

  generatePDF(): void {
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginLeft = 5;
    const marginRight = 5;
    const tableWidth = pageWidth - (marginLeft + marginRight);
    let currentY = 5;

    for (const dia of this.diasSemana) {
      const showSecondMeal = this.empleadosSemana.some((emp) => {
        const wh = emp.work_hours[dia.date] || {};
        return wh.second_lunch_start_time || wh.second_lunch_end_time;
      });

      const headerRow: any[] = [
        { content: "Código", styles: { fontSize: 6 } },
        { content: "Empleado", styles: { fontSize: 6 } },
        { content: "Entrada", styles: { fontSize: 6 } },
        { content: "Entrada C", styles: { fontSize: 6 } },
        { content: "Salida C", styles: { fontSize: 6 } },
      ];

      if (showSecondMeal) {
        headerRow.push(
          { content: "Entrada 2da C", styles: { fontSize: 6 } },
          { content: "Salida 2da C", styles: { fontSize: 6 } }
        );
      }

      headerRow.push(
        { content: "Salida", styles: { fontSize: 6 } },
        { content: "Incidencia", styles: { fontSize: 6 } },
        { content: "Descripción", styles: { fontSize: 6 } },
        { content: "Empresa y Obra", styles: { fontSize: 6 } },
        { content: "Firma", styles: { fontSize: 6 } }
      );

      const tableHeader = [
        [
          {
            content: `Lista de Asistencia para ${dia.display} (${dia.date})`,
            colSpan: headerRow.length,
            styles: {
              halign: "center",
              fontSize: 7,
              fillColor: [220, 220, 220],
            },
          },
        ],
        headerRow,
      ];

      const dataRows = this.empleadosSemana.map((emp) => {
        const wh = emp.work_hours[dia.date] || {};
        const entry = this.formatHour(wh.entry_time) || "--:--";
        const lunchStart = this.formatHour(wh.lunch_start_time) || "--:--";
        const lunchEnd = this.formatHour(wh.lunch_end_time) || "--:--";
        const secondLunchStart =
          this.formatHour(wh.second_lunch_start_time) || "--:--";
        const secondLunchEnd =
          this.formatHour(wh.second_lunch_end_time) || "--:--";
        const exit = this.formatHour(wh.exit_time) || "--:--";

        let finalEntry = entry,
          finalLunchStart = lunchStart,
          finalLunchEnd = lunchEnd,
          finalSecondLunchStart = secondLunchStart,
          finalSecondLunchEnd = secondLunchEnd,
          finalExit = exit;

        if (
          wh.incident &&
          wh.incident !== "Asistencia sin proyecto" &&
          wh.incident !== "N/A"
        ) {
          finalEntry =
            finalLunchStart =
            finalLunchEnd =
            finalSecondLunchStart =
            finalSecondLunchEnd =
            finalExit =
              "";
        }

        return [
          emp.employee_code?.toString() || "",
          `${emp.first_name} ${emp.last_name} ${emp.middle_name || ""}`,
          finalEntry,
          finalLunchStart,
          finalLunchEnd,
          ...(showSecondMeal
            ? [finalSecondLunchStart, finalSecondLunchEnd]
            : []),
          finalExit,
          wh.incident || "N/A",
          wh.description || "Sin descripción",
          wh.project_name || "No Asignado",
          "",
        ];
      });

      const baseCols = [
        0.035,
        0.2,
        0.05,
        0.05,
        0.05,
        ...(showSecondMeal ? [0.06, 0.06] : []),
        0.05,
        0.08,
        0.1,
        0.18,
        0.1,
      ];
      const colWidths = baseCols.map((ratio) => tableWidth * ratio);

      if (currentY + 10 > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
        currentY = 5;
      }

      autoTable(pdf, {
        head: tableHeader,
        body: dataRows,
        startY: currentY,
        margin: { left: marginLeft, right: marginRight },
        styles: { fontSize: 5, cellPadding: 1, textColor: 0 },
        headStyles: {
          fillColor: [220, 220, 220],
          halign: "center",
          cellPadding: 1,
          textColor: 0,
        },
        theme: "grid",
        columnStyles: colWidths.reduce((acc, width, i) => {
          acc[i] = { cellWidth: width };
          return acc;
        }, {}),
      });

      currentY = (pdf as any).lastAutoTable.finalY + 2;
    }

    pdf.save(`asistencia-semana-${this.selectedWeek?.week_number || "X"}.pdf`);
  }

  formatHour(hour: string): string | null {
    if (!hour || hour === "00:00:00") {
      return null; // Devuelve null si la hora es '00:00:00' o está vacía
    }
    return moment(hour, "HH:mm:ss").format("hh:mm A"); // Convierte a formato 12 horas con AM/PM
  }

  async deshacerConfirmacionSemanal() {
    if (!this.selectedWeek) {
      this.toastrService.showWarning(
        "Debes seleccionar una semana para deshacer la confirmación.",
        "Aviso"
      );
      return;
    }

    const alert = await this.alertController.create({
      header: "Confirmación",
      message:
        "¿Estás seguro que deseas deshacer la confirmación de esta semana?",
      buttons: [
        {
          text: "Cancelar",
          role: "cancel",
        },
        {
          text: "Aceptar",
          handler: async () => {
            const loading = await this.loadingController.create({
              message: "Deshaciendo confirmación de la semana...",
            });
            await loading.present();

            const companyId = this.companyService.selectedCompany.id;
            const periodTypeId = this.periodService.selectedPeriod.id;
            const startDate = this.selectedWeek.payroll_period?.start_date;
            const endDate = this.selectedWeek.payroll_period?.end_date;

            const url = `${environment.apiBaseUrl}/unconfirm-week.php`; // Asegúrate que este endpoint exista
            const data = {
              week_number: this.selectedWeek.week_number,
              company_id: companyId,
              period_type_id: periodTypeId,
              start_date: startDate,
              end_date: endDate,
            };

            this.http.post(url, data).subscribe(
              async (response: any) => {
                loading.dismiss();
                this.toastrService.showSuccess(
                  "Se ha deshecho la confirmación de la semana.",
                  "Éxito"
                );
                this.loadConfirmedWeeks(); // Refrescar las semanas
                this.selectedWeek = null;
                this.diasSemana = [];
                this.empleadosSemana = [];
              },
              async (error) => {
                loading.dismiss();
                this.toastrService.showError(
                  "Error al deshacer la confirmación de la semana.",
                  "Error"
                );
                console.error("Error al deshacer confirmación:", error);
              }
            );
          },
        },
      ],
    });

    await alert.present();
  }

  // Mostrar periodStartDate formateado
  get formattedStartDate(): string {
    return this.selectedWeek.payroll_period?.start_date
      ? moment(this.selectedWeek.payroll_period?.start_date).format("LL")
      : "No disponible";
  }

  // Mostrar periodEndDate formateado
  get formattedEndDate(): string {
    return this.selectedWeek.payroll_period?.end_date
      ? moment(this.selectedWeek.payroll_period?.end_date).format("LL")
      : "No disponible";
  }

  openProcessedListsModal() {
    this.dialogService.open(ProcessedListDialogComponent, {
      context: {},
      closeOnBackdropClick: true, // Permitir el cierre al hacer clic fuera del modal
      hasScroll: true,
    });
  }
}
