/*
  En esta sección se imprimen en un pdf los datos capturados tanto en incidencias como en asignación de proyectos
  Se puede tanto descargar el pdf, como subir el archivo una vez escaneado
*/

import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { NbSpinnerService, NbAlertModule } from "@nebular/theme";
import { AuthService } from ".././/../../services/auth.service";
import { CompanyService } from "../../../services/company.service";
import { PeriodService } from "../../../services/period.service";
import * as moment from "moment";
import jsPDF from "jspdf";
import { CustomToastrService } from "../../../services/custom-toastr.service";
import { environment } from "../../../../environments/environment";

import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { LoadingController, AlertController } from "@ionic/angular";

@Component({
  selector: "ngx-processed-attendance",
  templateUrl: "./processed-attendance.component.html",
  styleUrls: ["./processed-attendance.component.scss"],
})
export class ProcessedAttendanceComponent {
  uploadedFileName: string | null = null;
  processedWeeks: any[] = []; // Lista de semanas procesadas
  selectedWeek: any; // Semana procesada seleccionada
  diasSemana: any[] = []; // Días de la semana seleccionada
  empleadosSemana: any[] = []; // Lista de empleados con sus horarios e incidencias
  file: File | null = null; // Archivo seleccionado
  isProcessed: boolean = false; // Estado para el botón de procesar

  paymentDay: number = null;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertController: NbAlertModule,
    private toastrService: CustomToastrService,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private loadingController: LoadingController,
    private ionicAlertController: AlertController
  ) {}

  ngOnInit() {
    moment.locale("es"); // Configurar moment.js para usar el idioma español
    this.loadProcessedWeeks(); // Cargar las semanas procesadas al iniciar la página
  }

  // Nueva función para cargar el período y extraer el payment_days
  loadPayrollPeriod() {
    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;
    const url = `${environment.apiBaseUrl}/get-payroll-periods.php?company_id=${companyId}&period_type_id=${periodTypeId}`;
    this.http.get(url).subscribe(
      (data: any[]) => {
        // Se asume que el período actual se identifica por el period_id;
        // se puede obtener de this.selectedWeek.period_id o de this.periodService.selectedPeriod
        const currentPeriodId =
          this.selectedWeek && this.selectedWeek.period_id
            ? this.selectedWeek.period_id
            : this.periodService.selectedPeriod.id;
        const period = data.find(
          (item) => item.period_type_id == currentPeriodId
        );
        if (period) {
          this.paymentDay = parseInt(period.payment_days, 10);
        } else {
          this.paymentDay = null;
          console.error(
            "No se encontró el período actual en get-payroll-periods.php"
          );
        }
      },
      (error) => {
        console.error("Error al cargar el período", error);
      }
    );
  }

  // Método auxiliar que determina si una fecha es de descanso basado en la configuración del periodo
  isRestDay(date: moment.Moment): boolean {
    const period = this.periodService.selectedPeriod;
    // Usamos period.start en lugar de period.fiscal_year_start
    if (!period || !period.start || !period.rest_days_position) {
      return false;
    }
    const cycleLength = period.cycleLength || 7;
    // Generamos las fechas base usando period.start y los días indicados en rest_days_position
    const baseRestDates = period.rest_days_position.map((pos: string) => {
      const dayOfMonth = parseInt(pos, 10);
      return moment(period.start, "YYYY-MM-DD").date(dayOfMonth);
    });
    return baseRestDates.some((base) => {
      const diff = date.diff(base, "days");
      return diff >= 0 && diff % cycleLength === 0;
    });
  }

  // Cargar las semanas procesadas
  async loadProcessedWeeks() {
    // Mostrar spinner de Ionic
    const loading = await this.loadingController.create({
      message: "Cargando semanas procesadas...",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;

    if (!companyId || !periodTypeId) {
      console.error("No se proporcionaron company_id o period_type_id");
      loading.dismiss();
      return;
    }

    const url = `${environment.apiBaseUrl}/get-processed-weeks.php?company_id=${companyId}&period_type_id=${periodTypeId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        loading.dismiss(); // Ocultar el spinner

        if (Array.isArray(data)) {
          if (data.length > 0) {
            this.processedWeeks = data;
          } else {
            // Si es un array vacío, mostrar Toast
            this.processedWeeks = [];
            this.toastrService.showWarning(
              "No hay semanas procesadas por el momento. Inténtalo más tarde.",
              "Aviso"
            );
          }
        } else {
          // Si no es array, manejamos el error o avisamos
          console.error("Datos recibidos no son un array", data);
        }
      },
      (error) => {
        console.error("Error al cargar semanas procesadas", error);
        this.toastrService.showError(
          "Error al cargar semanas procesadas.",
          "Error"
        );
        loading.dismiss();
      }
    );
  }

  // Cargar los días de la semana y los empleados al seleccionar una semana
  // Al seleccionar una semana, se generan los días usando la nueva lógica y se cargan los empleados
  async onWeekChange(week: any) {
    if (week && week.start_date && week.end_date) {
      this.selectedWeek = week;
      this.isProcessed = false;
      this.generateWeekDays(week.start_date, week.end_date);
      await this.loadEmployeesForWeek();
      this.loadPayrollPeriod(); // Se actualiza paymentDay (aunque para el descanso se usa isRestDay)
    } else {
      console.error("La semana seleccionada no contiene información de fechas");
    }
  }

  // Generar los días de la semana en un rango de fechas

  // Nueva versión de generateWeekDays: agrega la propiedad isRest para cada día
  generateWeekDays(startDate: string, endDate: string) {
    let current = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];
    while (current.isSameOrBefore(end)) {
      this.diasSemana.push({
        date: current.format("YYYY-MM-DD"),
        display: current.format("dddd"),
        isRest: this.isRestDay(current), // Se determina si es día de descanso
      });
      current.add(1, "days");
    }
  }

  // Cargar los empleados y sus horas de trabajo para la semana seleccionada
  async loadEmployeesForWeek() {
    if (!this.selectedWeek) return;

    const companyId = this.companyService.selectedCompany?.id;
    if (!companyId) {
      this.toastrService.showWarning(
        "No se pudo obtener el ID de la compañía. Por favor, seleccione una compañía válida.",
        "Advertencia"
      );
      return;
    }

    const loading = await this.loadingController.create({
      message: "Cargando datos de empleados...",
    });
    await loading.present();

    const url = `${environment.apiBaseUrl}/get-employees-weekly-data.php?week_number=${this.selectedWeek.week_number}&company_id=${companyId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        const processedData = this.processEmployeeData(data);
        this.empleadosSemana = processedData;
        loading.dismiss();
      },
      (error) => {
        console.error("Error al cargar datos de empleados", error);
        this.toastrService.showError(
          "Error al cargar datos de empleados.",
          "Error"
        );
        loading.dismiss();
      }
    );
  }

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
        exit_time: record.exit_time,
        incident: record.incident_type,
        project_name: record.project_name,
      };
    });

    return Object.values(employeesMap);
  }

  // Generar el PDF con los datos de asistencia

  async generatePDF() {
    // Mostrar spinner de carga
    const loading = await this.loadingController.create({
      message: "Generando PDF...",
    });
    await loading.present();

    // Crear objeto jsPDF en orientación horizontal, unidades milimétricas y tamaño A4
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginLeft = 5;
    const marginRight = 5;
    const tableWidth = pageWidth - (marginLeft + marginRight);
    let currentY = 5;

    // Recorremos cada día de la semana
    for (let i = 0; i < this.diasSemana.length; i++) {
      const dia = this.diasSemana[i];

      // Si el día está marcado como descanso...
      if (dia.isRest) {
        // Filtrar empleados que tengan incidencia EXACTA de "Horas Extras"
        const extraEmployees = this.empleadosSemana.filter((emp) => {
          const wh = emp.work_hours[dia.date] || {};
          return wh.incident === "Horas Extras";
        });

        // Si hay empleados con incidencia "Horas Extras", se imprime la tabla
        if (extraEmployees.length > 0) {
          // Determinar si se deben mostrar columnas de segunda comida
          const showSecondMeal = extraEmployees.some((emp) => {
            const wh = emp.work_hours[dia.date] || {};
            return (
              this.formatHour(wh.second_lunch_start_time) != null ||
              this.formatHour(wh.second_lunch_end_time) != null
            );
          });

          // Armar el encabezado de la tabla
          let headerRow: any[] = [
            {
              content: "Código",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Empleado",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Entrada",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Entrada C",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Salida C",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
          ];
          if (showSecondMeal) {
            headerRow.push(
              {
                content: "Entrada 2da C",
                styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
              },
              {
                content: "Salida 2da C",
                styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
              }
            );
          }
          headerRow.push(
            {
              content: "Salida",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Incidencia",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Empresa y Obra",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            },
            {
              content: "Firma",
              styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
            }
          );

          const tableHeader = [
            [
              {
                content: `Incidencias (Horas Extras) para ${dia.display} (${dia.date}) (descanso)`,
                colSpan: headerRow.length,
                styles: {
                  halign: "center",
                  fontSize: 7,
                  fillColor: [220, 220, 220],
                  textColor: 0,
                  cellPadding: 1,
                },
              },
            ],
            headerRow,
          ];

          // Armar las filas con los datos de los empleados filtrados
          const dataRows = extraEmployees.map((emp) => {
            const wh = emp.work_hours[dia.date] || {};
            return [
              emp.employee_code?.toString() || "",
              `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name}`,
              this.formatHour(wh.entry_time) || "--:--",
              this.formatHour(wh.lunch_start_time) || "--:--",
              this.formatHour(wh.lunch_end_time) || "--:--",
              ...(showSecondMeal
                ? [
                    this.formatHour(wh.second_lunch_start_time) || "--:--",
                    this.formatHour(wh.second_lunch_end_time) || "--:--",
                  ]
                : []),
              this.formatHour(wh.exit_time) || "--:--",
              wh.incident || "N/A",
              wh.project_name || "No Asignado",
              "", // Firma vacía
            ];
          });

          // Definir anchos de columna
          let colWidths: number[];
          if (showSecondMeal) {
            colWidths = [
              tableWidth * 0.07,
              tableWidth * 0.2,
              tableWidth * 0.05,
              tableWidth * 0.05,
              tableWidth * 0.05,
              tableWidth * 0.06,
              tableWidth * 0.06,
              tableWidth * 0.05,
              tableWidth * 0.08,
              tableWidth * 0.24,
              tableWidth * 0.1,
            ];
          } else {
            colWidths = [
              tableWidth * 0.07,
              tableWidth * 0.2,
              tableWidth * 0.05,
              tableWidth * 0.05,
              tableWidth * 0.05,
              tableWidth * 0.05,
              tableWidth * 0.08,
              tableWidth * 0.24,
              tableWidth * 0.1,
            ];
          }

          // Si no hay espacio suficiente en la página, agregamos una nueva
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
            columnStyles: colWidths.reduce((acc, width, index) => {
              acc[index] = { cellWidth: width };
              return acc;
            }, {} as { [key: number]: { cellWidth: number } }),
          });
          currentY = (pdf as any).lastAutoTable.finalY + 2;
        }
        // Si es descanso y NO hay incidencias de "Horas Extras", imprimimos solo el encabezado
        else {
          const headerContent = `Día ${dia.display} (${dia.date}) (descanso)`;
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(10);
          pdf.setTextColor(0);
          const centerX = pdf.internal.pageSize.getWidth() / 2;
          pdf.text(headerContent, centerX, currentY + 5, { align: "center" });
          pdf.setFont("helvetica", "normal");
          currentY += 12;
        }
        // Continuamos al siguiente día
        continue;
      }

      // Para días que no sean de descanso, usamos la lógica normal de generación de tabla.
      // Se determina si se deben mostrar columnas de segunda comida
      const showSecondMeal = this.empleadosSemana.some((emp) => {
        const wh = emp.work_hours[dia.date] || {};
        return (
          this.formatHour(wh.second_lunch_start_time) != null ||
          this.formatHour(wh.second_lunch_end_time) != null
        );
      });

      let headerRow: any[] = [
        {
          content: "Código",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Empleado",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Entrada",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Entrada C",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Salida C",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
      ];
      if (showSecondMeal) {
        headerRow.push(
          {
            content: "Entrada 2da C",
            styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
          },
          {
            content: "Salida 2da C",
            styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
          }
        );
      }
      headerRow.push(
        {
          content: "Salida",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Incidencia",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Empresa y Obra",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        },
        {
          content: "Firma",
          styles: { fontSize: 6, cellPadding: 1, textColor: 0 },
        }
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
              cellPadding: 1,
            },
          },
        ],
        headerRow,
      ];

      // Construir las filas de la tabla para el día normal
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

        // Si hay incidencia (distinta de "Asistencia sin proyecto" y "N/A"), se dejan las horas en blanco
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
          finalEntry = "";
          finalLunchStart = "";
          finalLunchEnd = "";
          finalSecondLunchStart = "";
          finalSecondLunchEnd = "";
          finalExit = "";
        }

        return [
          emp.employee_code?.toString() || "",
          `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name}`,
          finalEntry,
          finalLunchStart,
          finalLunchEnd,
          ...(showSecondMeal
            ? [finalSecondLunchStart, finalSecondLunchEnd]
            : []),
          finalExit,
          wh.incident || "N/A",
          wh.project_name || "No Asignado",
          "", // Firma vacía
        ];
      });

      let colWidths: number[];
      if (showSecondMeal) {
        colWidths = [
          tableWidth * 0.07,
          tableWidth * 0.2,
          tableWidth * 0.05,
          tableWidth * 0.05,
          tableWidth * 0.05,
          tableWidth * 0.06,
          tableWidth * 0.06,
          tableWidth * 0.05,
          tableWidth * 0.08,
          tableWidth * 0.24,
          tableWidth * 0.1,
        ];
      } else {
        colWidths = [
          tableWidth * 0.07,
          tableWidth * 0.2,
          tableWidth * 0.05,
          tableWidth * 0.05,
          tableWidth * 0.05,
          tableWidth * 0.05,
          tableWidth * 0.08,
          tableWidth * 0.24,
          tableWidth * 0.1,
        ];
      }

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
        columnStyles: colWidths.reduce((acc, width, index) => {
          acc[index] = { cellWidth: width };
          return acc;
        }, {} as { [key: number]: { cellWidth: number } }),
      });
      currentY = (pdf as any).lastAutoTable.finalY + 2;
    }

    pdf.save("asistencia-semanal.pdf");
    loading.dismiss();
  }

  onFileSelected(event: any) {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      this.file = selectedFile;
      this.uploadedFileName = selectedFile.name; // Se asigna el nombre del archivo
    }
  }

  async uploadPDF() {
    if (!this.file) {
      const alert = await this.ionicAlertController.create({
        header: "Error",
        message: "Por favor seleccione un archivo PDF.",
        buttons: ["OK"],
      });
      await alert.present();
      return;
    }

    // Verificar que la semana seleccionada tenga period_type_id
    if (!this.selectedWeek || !this.selectedWeek.period_type_id) {
      const alert = await this.ionicAlertController.create({
        header: "Error",
        message: "La semana seleccionada no tiene un period_type_id válido.",
        buttons: ["OK"],
      });
      await alert.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: "Subiendo PDF...",
    });
    await loading.present();

    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append("pdf", this.file, this.file.name);
    formData.append("company_id", this.companyService.selectedCompany.id);
    formData.append("week_number", this.selectedWeek.week_number);
    formData.append("period_type_id", this.selectedWeek.period_type_id);
    formData.append("status", "Subido");

    this.http
      .post(`${environment.apiBaseUrl}/upload-pdf.php`, formData)
      .subscribe(
        async (response) => {
          loading.dismiss();
          const alert = await this.ionicAlertController.create({
            header: "Éxito",
            message: "El PDF se ha subido correctamente.",
            buttons: ["OK"],
          });
          await alert.present();
          // Actualiza la variable para mostrar el nombre del archivo
          this.uploadedFileName = this.file.name;
          this.file = null; // Opcional: limpia el input de archivo
        },
        async (error) => {
          loading.dismiss();
          const alert = await this.ionicAlertController.create({
            header: "Error",
            message: "Hubo un error al subir el PDF. Intente nuevamente.",
            buttons: ["OK"],
          });
          await alert.present();
          console.error("Error al subir el PDF:", error);
        }
      );
  }

  formatHour(hour: string): string | null {
    if (!hour || hour === "00:00:00") {
      return null; // Devuelve null si la hora es '00:00:00' o está vacía
    }
    return moment(hour, "HH:mm:ss").format("hh:mm A"); // Convierte a formato 12 horas con AM/PM
  }

  // Mostrar periodStartDate formateado
  get formattedStartDate(): string {
    return this.selectedWeek.start_date
      ? moment(this.selectedWeek.start_date).format("LL")
      : "No disponible";
  }

  // Mostrar periodEndDate formateado
  get formattedEndDate(): string {
    return this.selectedWeek.end_date
      ? moment(this.selectedWeek.end_date).format("LL")
      : "No disponible";
  }
}
