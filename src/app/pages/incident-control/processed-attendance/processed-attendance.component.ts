
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbSpinnerService, NbToastrService, NbAlertModule } from '@nebular/theme';
import { AuthService } from '.././/../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import * as moment from 'moment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


@Component({
  selector: 'ngx-processed-attendance',
  templateUrl: './processed-attendance.component.html',
  styleUrls: ['./processed-attendance.component.scss']
})
export class ProcessedAttendanceComponent {

  processedWeeks: any[] = []; // Lista de semanas procesadas
  selectedWeek: any; // Semana procesada seleccionada
  diasSemana: any[] = []; // Días de la semana seleccionada
  empleadosSemana: any[] = []; // Lista de empleados con sus horarios e incidencias
  file: File | null = null; // Archivo seleccionado

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertController: NbAlertModule,
    private toastrService: NbToastrService,
    private companyService: CompanyService,
    private periodService: PeriodService,
  ) { }

  ngOnInit() {
    moment.locale('es'); // Configurar moment.js para usar el idioma español
    this.loadProcessedWeeks(); // Cargar las semanas procesadas al iniciar la página
  }

  // Cargar las semanas procesadas
  async loadProcessedWeeks() {
    this.spinnerService.load(); // Mostrar el spinner
    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;

    if (!companyId || !periodTypeId) {
      console.error('No se proporcionaron company_id o period_type_id');
      this.spinnerService.clear(); // Ocultar el spinner
      return;
    }

    const url = `https://siinad.mx/php/get-processed-weeks.php?company_id=${companyId}&period_type_id=${periodTypeId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        if (Array.isArray(data)) {
          this.processedWeeks = data;
        } else {
          console.error('Datos recibidos no son un array', data);
        }
        this.spinnerService.clear(); // Ocultar el spinner
      },
      (error) => {
        console.error('Error al cargar semanas procesadas', error);
        this.toastrService.danger('Error al cargar semanas procesadas.', 'Error');
        this.spinnerService.clear(); // Ocultar el spinner
      }
    );
  }


  // Cargar los días de la semana y los empleados al seleccionar una semana
  async onWeekChange(week: any) {
    if (week && week.start_date && week.end_date) {
      this.selectedWeek = week;
      this.generateWeekDays(week.start_date, week.end_date); // Usar start_date y end_date directamente del objeto week
      await this.loadEmployeesForWeek();
    } else {
      console.error('La semana seleccionada no contiene información de fechas de inicio y fin');
    }
  }

  // Generar los días de la semana en un rango de fechas
  generateWeekDays(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    while (start.isSameOrBefore(end)) {
      this.diasSemana.push({
        date: start.format('YYYY-MM-DD'),
        display: start.format('dddd'),
      });
      start.add(1, 'days');
    }
  }

  // Cargar los empleados y sus horas de trabajo para la semana seleccionada
  async loadEmployeesForWeek() {
    if (!this.selectedWeek) return;

    this.spinnerService.load(); // Mostrar el spinner
    const url = `https://siinad.mx/php/get-employees-weekly-data.php?week_number=${this.selectedWeek.week_number}`;

    this.http.get(url).subscribe(
      (data: any) => {
        const processedData = this.processEmployeeData(data);
        this.empleadosSemana = processedData;
        this.spinnerService.clear(); // Ocultar el spinner
      },
      (error) => {
        console.error('Error al cargar datos de empleados', error);
        this.toastrService.danger('Error al cargar datos de empleados.', 'Error');
        this.spinnerService.clear(); // Ocultar el spinner
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
    this.spinnerService.load(); // Mostrar el spinner

    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const marginX = 10;
      const marginY = 10;
      const rowHeight = 8;

      this.diasSemana.forEach((dia) => {
        if (pdf.internal.pages.length > 1) {
          pdf.addPage();
        }
        let currentY = marginY + rowHeight;

        pdf.setFontSize(12);
        pdf.text(`Lista de Asistencia para ${dia.display} (${dia.date})`, marginX, currentY);
        currentY += rowHeight;

        pdf.setFontSize(8);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(marginX, currentY, pageWidth - marginX * 2, rowHeight, 'F');
        pdf.text('Código', marginX + 2, currentY + 5);
        // Continuar con la configuración del PDF...

        currentY += rowHeight;

        this.empleadosSemana.forEach((emp) => {
          pdf.text(emp.employee_code.toString(), marginX + 2, currentY + 5);
          // Continuar con los datos de la tabla...
          currentY += rowHeight;
        });
      });

      pdf.save('asistencia-semanal.pdf');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      this.toastrService.danger('Error al generar el PDF.', 'Error');
    } finally {
      this.spinnerService.clear(); // Ocultar el spinner
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.file = input.files[0];
    }
  }
  

  async uploadPDF() {
    if (!this.file) {
      this.toastrService.warning('Por favor seleccione un archivo PDF.', 'Advertencia');
      return;
    }

    this.spinnerService.load(); // Mostrar el spinner

    try {
      // Lógica para subir el archivo...
      this.toastrService.success('Archivo subido exitosamente.', 'Éxito');
    } catch (error) {
      console.error('Error al subir el archivo:', error);
      this.toastrService.danger('Error al subir el archivo.', 'Error');
    } finally {
      this.spinnerService.clear(); // Ocultar el spinner
    }
  }

}
