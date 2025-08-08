import { Component } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { NbDialogService } from "@nebular/theme";
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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

@Component({
  selector: "ngx-process-weekly-lists",
  templateUrl: "./process-weekly-lists.component.html",
  styleUrls: ["./process-weekly-lists.component.scss"],
})
export class ProcessWeeklyListsComponent {
  confirmedWeeks: any[] = [];
  selectedWeek: any;
  diasSemana: any[] = [];
  empleadosSemana: any[] = [];
  isButtonDisabled: boolean = false;

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private toastrService: CustomToastrService,
    private dialogService: NbDialogService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    moment.locale("es");
    this.loadConfirmedWeeks();
  }

  getProjectStatusLines(workHourData: any): string[] {
    if (
      !workHourData?.project_status ||
      workHourData.project_status === "N/A"
    ) {
      return ["N/A"];
    }

    if (workHourData.project_status.includes("\n")) {
      return workHourData.project_status.split("\n");
    }

    const projectId = workHourData.project_id || "000";
    const lastTwoDigits = parseInt(projectId.slice(-2)) || 0;

    const startDate = `2025-${(lastTwoDigits % 12) + 1}-01`;
    const endDate = `2025-${(lastTwoDigits % 12) + 1}-${
      (lastTwoDigits % 28) + 1
    }`;
    const status = workHourData.project_status;

    return [
      `Fecha de Inicio: ${startDate}`,
      `Fecha de Fin: ${endDate}`,
      `Estatus: ${status}`,
    ];
  }

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

  async onWeekChange(week: any) {
    this.isButtonDisabled = false;
    if (week?.payroll_period?.start_date && week?.payroll_period?.end_date) {
      this.selectedWeek = week;
      this.generateWeekDays(
        week.payroll_period.start_date,
        week.payroll_period.end_date
      );
      await this.loadEmployeesForWeek();
    }
  }

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

  async loadEmployeesForWeek() {
    if (!this.selectedWeek || !this.companyService.selectedCompany) return;

    const loading = await this.loadingController.create({
      message: "Cargando datos de empleados...",
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const url = `${environment.apiBaseUrl}/get-employees-weekly-data.php?week_number=${this.selectedWeek.week_number}&company_id=${companyId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        this.empleadosSemana = this.processEmployeeData(data);
        loading.dismiss();
      },
      (error) => {
        console.error("Error al cargar datos de empleados", error);
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
        second_lunch_start_time: record.second_lunch_start_time,
        second_lunch_end_time: record.second_lunch_end_time,
        exit_time: record.exit_time,
        incident: record.incident_type,
        project_id: record.project_id,
        project_name: record.project_name,
        project_status: record.project_status,
        description: record.description,
      };
    });

    return Object.values(employeesMap);
  }

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

        this.confirmedWeeks = this.confirmedWeeks.filter(
          (week) => week.week_number !== this.selectedWeek.week_number
        );

        this.selectedWeek = null;
        this.diasSemana = [];
        this.empleadosSemana = [];

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

  async openExportOptions() {
    if (!this.selectedWeek) {
      this.toastrService.showWarning(
        "Debes seleccionar una semana para exportar.",
        "Aviso"
      );
      return;
    }

    const alert = await this.alertController.create({
      header: "Exportar lista de asistencia",
      cssClass: "custom-export-alert",
      message: "Selecciona el formato de exportación:",
      buttons: [
        {
          text: "PDF",
          cssClass: "pdf-button",
          handler: () => {
            this.generatePDF();
          },
        },
        {
          text: "Excel",
          cssClass: "excel-button",
          handler: () => {
            this.generateExcel();
          },
        },
        {
          text: "Cancelar",
          role: "cancel",
          cssClass: "cancel-button",
        },
      ],
    });

    await alert.present();
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
        { content: "ID Proyecto", styles: { fontSize: 6 } },
        { content: "Empresa y Obra", styles: { fontSize: 6 } },
        { content: "Estatus Proyecto", styles: { fontSize: 6 } },
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
          wh.project_id || "N/A",
          wh.project_name || "No Asignado",
          wh.project_status || "N/A",
          "",
        ];
      });

      const baseCols = [
        0.03, // Código
        0.15, // Empleado
        0.045, // Entrada
        0.045, // Entrada C
        0.045, // Salida C
        ...(showSecondMeal ? [0.05, 0.05] : []),
        0.045, // Salida
        0.07, // Incidencia
        0.09, // Descripción
        0.06, // ID Proyecto
        0.12, // Empresa y Obra
        0.08, // Estatus Proyecto
        0.08, // Firma
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
  //
  async generateExcel(): Promise<void> {
    if (!this.selectedWeek) return;

    const loading = await this.loadingController.create({
      message: "Generando archivo Excel...",
    });
    await loading.present();

    try {
      // Crear un nuevo libro de Excel
      const wb = XLSX.utils.book_new();
      wb.Props = {
        Title: `Listas de Asistencia Semana ${this.selectedWeek.week_number}`,
        Subject: "Asistencia de empleados",
        Author: "Sistema de Asistencia",
        CreatedDate: new Date(),
      };

      // Procesar cada día de la semana
      for (const dia of this.diasSemana) {
        const showSecondMeal = this.empleadosSemana.some((emp) => {
          const wh = emp.work_hours[dia.date] || {};
          return wh.second_lunch_start_time || wh.second_lunch_end_time;
        });

        // Preparar los datos
        const data = [];

        // 1. Título (fila combinada)
        data.push([`Lista de Asistencia para ${dia.display} (${dia.date})`]);
        data.push([]); // Fila vacía para separar

        // 2. Encabezados
        const headers = [
          "Código",
          "Empleado",
          "Entrada",
          "Entrada C",
          "Salida C",
          ...(showSecondMeal ? ["Entrada 2da C", "Salida 2da C"] : []),
          "Salida",
          "Incidencia",
          "Descripción",
          "ID Proyecto",
          "Empresa y Obra",
          "Estatus Proyecto",
          "Firma",
        ];
        data.push(headers);

        // 3. Datos de empleados
        for (const emp of this.empleadosSemana) {
          const wh = emp.work_hours[dia.date] || {};

          // Formatear horas
          const entry = this.formatHour(wh.entry_time) || "--:--";
          const lunchStart = this.formatHour(wh.lunch_start_time) || "--:--";
          const lunchEnd = this.formatHour(wh.lunch_end_time) || "--:--";
          const secondLunchStart =
            this.formatHour(wh.second_lunch_start_time) || "--:--";
          const secondLunchEnd =
            this.formatHour(wh.second_lunch_end_time) || "--:--";
          const exit = this.formatHour(wh.exit_time) || "--:--";

          // Manejo de incidencias
          let incidentText = wh.incident || "N/A";
          let descriptionText = wh.description || "Sin descripción";

          if (wh.incident === "Falta") {
            incidentText = "Falta";
            descriptionText = "no se presentó a trabajar";
          } else if (wh.incident === "Vacaciones") {
            incidentText = "Vacaciones";
            descriptionText = "días de vacaciones";
          } else if (wh.incident === "Horas Extras") {
            incidentText = "Horas Extras";
            descriptionText = wh.description || "horas extras";
          }

          const rowData = [
            emp.employee_code?.toString() || "",
            `${emp.first_name || ""} ${emp.last_name || ""} ${
              emp.middle_name || ""
            }`.trim(),
            entry,
            lunchStart,
            lunchEnd,
            ...(showSecondMeal ? [secondLunchStart, secondLunchEnd] : []),
            exit,
            incidentText,
            descriptionText,
            wh.project_id || "N/A",
            wh.project_name || "No Asignado",
            wh.project_status || "N/A",
            "", // Espacio para firma
          ];

          // Limpiar campos de tiempo si hay incidencia
          if (
            wh.incident &&
            wh.incident !== "N/A" &&
            wh.incident !== "Asistencia sin proyecto"
          ) {
            rowData[2] = ""; // Entrada
            rowData[3] = ""; // Entrada C
            rowData[4] = ""; // Salida C
            if (showSecondMeal) {
              rowData[5] = ""; // Entrada 2da C
              rowData[6] = ""; // Salida 2da C
            }
            rowData[showSecondMeal ? 7 : 5] = ""; // Salida
          }

          data.push(rowData);
        }

        // Crear la hoja de cálculo
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Aplicar formato de tabla
        this.applyExcelTableFormat(ws, data, showSecondMeal);

        // Nombre de la hoja (ej: "vie01" para viernes 01)
        const sheetName = dia.display.substring(0, 3) + dia.date.split("-")[2];
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      // Generar el archivo Excel
      const fileName = `asistencia-semana-${this.selectedWeek.week_number}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error al generar Excel:", error);
      this.toastrService.showError(
        "Ocurrió un error al generar el archivo Excel",
        "Error"
      );
    } finally {
      loading.dismiss();
    }
  }

  private applyExcelTableFormat(
    ws: XLSX.WorkSheet,
    data: any[][],
    showSecondMeal: boolean
  ): void {
    // 1. Combinar celdas del título
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({
      s: { r: 0, c: 0 },
      e: { r: 0, c: 12 + (showSecondMeal ? 2 : 0) },
    });

    // 2. Definir anchos de columnas (optimizados para mejor visualización)
    const colWidths = [
      { wch: 8 }, // Código
      { wch: 25 }, // Empleado
      { wch: 10 }, // Entrada
      { wch: 10 }, // Entrada C
      { wch: 10 }, // Salida C
      ...(showSecondMeal
        ? [
            { wch: 12 }, // Entrada 2da C
            { wch: 12 }, // Salida 2da C
          ]
        : []),
      { wch: 10 }, // Salida
      { wch: 12 }, // Incidencia
      { wch: 20 }, // Descripción
      { wch: 10 }, // ID Proyecto
      { wch: 30 }, // Empresa y Obra
      { wch: 20 }, // Estatus Proyecto
      { wch: 15 }, // Firma
    ];
    ws["!cols"] = colWidths;

    // 3. Congelar filas de encabezados
    ws["!freeze"] = { x: 0, y: 2 };

    // 4. Aplicar estilos de tabla
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:Z1");

    // Estilo para el título (fila 0)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, sz: 14, color: { rgb: "000000" } },
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "4472C4" } }, // Azul corporativo
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "medium", color: { rgb: "000000" } },
          right: { style: "medium", color: { rgb: "000000" } },
        },
      };
    }

    // Estilo para los encabezados (fila 2)
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: 2, c: C })];
      if (!cell) continue;
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } }, // Texto blanco
        alignment: { horizontal: "center", vertical: "center" },
        fill: { fgColor: { rgb: "4472C4" } }, // Azul corporativo
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "medium", color: { rgb: "000000" } },
          right: { style: "medium", color: { rgb: "000000" } },
        },
      };
    }

    // Estilo para las celdas de datos (filas alternas)
    for (let R = 3; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (!cell) continue;

        // Color de fondo alterno para mejor legibilidad
        const fillColor = R % 2 === 1 ? "FFFFFF" : "D9E1F2"; // Blanco o azul muy claro

        // Estilo base
        cell.s = {
          font: { sz: 11 },
          alignment: { vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: fillColor } },
          border: {
            top: { style: "thin", color: { rgb: "BFBFBF" } },
            bottom: { style: "thin", color: { rgb: "BFBFBF" } },
            left: { style: "thin", color: { rgb: "BFBFBF" } },
            right: { style: "thin", color: { rgb: "BFBFBF" } },
          },
        };

        // Alineación especial para columnas de tiempo y códigos
        if (
          [2, 3, 4, 5, 6, 7].includes(C) ||
          (showSecondMeal && [5, 6].includes(C))
        ) {
          cell.s.alignment = { ...cell.s.alignment, horizontal: "center" };
        }

        // Resaltar filas con incidencias
        const incidentCell = ws[XLSX.utils.encode_cell({ r: R, c: 7 })];
        if (incidentCell && incidentCell.v && incidentCell.v !== "N/A") {
          cell.s.fill = { fgColor: { rgb: "FFC7CE" } }; // Rojo claro para incidencias
          cell.s.font = { ...cell.s.font, color: { rgb: "9C0006" } }; // Texto rojo oscuro
        }
      }
    }

    // Ajustar altura de filas
    ws["!rows"] = [
      { hpx: 30 }, // Altura para el título
      { hpx: 10 }, // Altura para el espacio
      { hpx: 25 }, // Altura para encabezados
      ...Array(data.length - 3).fill({ hpx: 20 }), // Altura para filas de datos
    ];
  }

  formatHour(hour: string): string | null {
    if (!hour || hour === "00:00:00") {
      return null;
    }
    return moment(hour, "HH:mm:ss").format("hh:mm A");
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

            const url = `${environment.apiBaseUrl}/unconfirm-week.php`;
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
                this.loadConfirmedWeeks();
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

  get formattedStartDate(): string {
    return this.selectedWeek?.payroll_period?.start_date
      ? moment(this.selectedWeek.payroll_period.start_date).format("LL")
      : "No disponible";
  }

  get formattedEndDate(): string {
    return this.selectedWeek?.payroll_period?.end_date
      ? moment(this.selectedWeek.payroll_period.end_date).format("LL")
      : "No disponible";
  }

  openProcessedListsModal() {
    this.dialogService.open(ProcessedListDialogComponent, {
      context: {},
      closeOnBackdropClick: true,
      hasScroll: true,
    });
  }
}
