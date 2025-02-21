
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbSpinnerService, NbToastrService, NbAlertModule } from '@nebular/theme';
import { AuthService } from '.././/../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import * as moment from 'moment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { LoadingController, AlertController } from '@ionic/angular';


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
  isProcessed: boolean = false; // Estado para el botón de procesar

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertController: NbAlertModule,
    private toastrService: NbToastrService,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private loadingController: LoadingController,
    private ionicAlertController: AlertController
  ) { }

  ngOnInit() {
    moment.locale('es'); // Configurar moment.js para usar el idioma español
    this.loadProcessedWeeks(); // Cargar las semanas procesadas al iniciar la página
  }

  // Cargar las semanas procesadas
  async loadProcessedWeeks() {
    // Mostrar spinner de Ionic
    const loading = await this.loadingController.create({
      message: 'Cargando semanas procesadas...',
    });
    await loading.present();
  
    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;
  
    if (!companyId || !periodTypeId) {
      console.error('No se proporcionaron company_id o period_type_id');
      loading.dismiss();
      return;
    }
  
    const url = `https://siinad.mx/php/get-processed-weeks.php?company_id=${companyId}&period_type_id=${periodTypeId}`;
  
    this.http.get(url).subscribe(
      (data: any) => {
        loading.dismiss(); // Ocultar el spinner
  
        if (Array.isArray(data)) {
          if (data.length > 0) {
            this.processedWeeks = data;
          } else {
            // Si es un array vacío, mostrar Toast
            this.processedWeeks = [];
            this.toastrService.warning('No hay semanas procesadas por el momento. Inténtalo más tarde.','Aviso');
          }
        } else {
          // Si no es array, manejamos el error o avisamos
          console.error('Datos recibidos no son un array', data);
        }
      },
      (error) => {
        console.error('Error al cargar semanas procesadas', error);
        this.toastrService.danger('Error al cargar semanas procesadas.', 'Error');
        loading.dismiss();
      }
    );
  }
  


  // Cargar los días de la semana y los empleados al seleccionar una semana
  async onWeekChange(week: any) {
    if (week && week.start_date && week.end_date) {
      this.selectedWeek = week;
      this.isProcessed = false; // Resetea isProcessed al cambiar de semana
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

    
  
    const companyId = this.companyService.selectedCompany?.id;
    if (!companyId) {
      this.toastrService.warning(
        'No se pudo obtener el ID de la compañía. Por favor, seleccione una compañía válida.',
        'Advertencia'
      );
      return;
    }
  
    const loading = await this.loadingController.create({
      message: 'Cargando datos de empleados...',
    });
    await loading.present();
  
    const url = `https://siinad.mx/php/get-employees-weekly-data.php?week_number=${this.selectedWeek.week_number}&company_id=${companyId}`;
  
    this.http.get(url).subscribe(
      (data: any) => {
        const processedData = this.processEmployeeData(data);
        this.empleadosSemana = processedData;
        loading.dismiss();
      },
      (error) => {
        console.error('Error al cargar datos de empleados', error);
        this.toastrService.danger('Error al cargar datos de empleados.', 'Error');
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
    const loading = await this.loadingController.create({
      message: 'Generando PDF...',
    });
    await loading.present();
  
    const pdf = new jsPDF('l', 'mm', 'a4'); // 'l' para orientación landscape
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 10;
    const marginY = 10;
    const rowHeight = 6; // Se redujo la altura de las filas
    let currentY = marginY;
  
    const codeWidth = 15;
    const nameWidth = 40;
    const entryWidth = 20;
    const firmaWidth = 35;
    const tableWidth = pageWidth - marginX * 2;
  
    this.diasSemana.forEach((dia, index) => {
      // Calcular la altura total de la tabla antes de imprimirla
      let estimatedTableHeight = rowHeight * 2; // Título + cabecera
      this.empleadosSemana.forEach(emp => {
        const nameText = `${emp.first_name} ${emp.middle_name} ${emp.last_name}`;
        const nameLines = pdf.splitTextToSize(nameText, nameWidth - 5).length;
        
        let maxLines = nameLines;
        const workHours = emp.work_hours[dia.date] || {};
        const dayData = [
          this.formatHour(workHours.entry_time) || '--:--',
          this.formatHour(workHours.lunch_start_time) || '--:--',
          this.formatHour(workHours.lunch_end_time) || '--:--',
          this.formatHour(workHours.second_lunch_start_time) || '--:--',
          this.formatHour(workHours.second_lunch_end_time) || '--:--',
          this.formatHour(workHours.exit_time) || '--:--',
          workHours.incident || 'N/A',
          workHours.project_name || 'No Asignado'
        ];
  
        dayData.forEach(text => {
          const splitLines = pdf.splitTextToSize(text, entryWidth - 5);
          maxLines = Math.max(maxLines, splitLines.length);
        });

        estimatedTableHeight += rowHeight * maxLines;
      });

      // Si la tabla NO cabe en la página actual, agregar una nueva antes de imprimirla
      if (currentY + estimatedTableHeight > pageHeight - marginY) {
        pdf.addPage();
        currentY = marginY;
      }
  
      // Título del día
      pdf.setFontSize(10); // Reducimos un poco la fuente del título
      pdf.text(`Lista de Asistencia para ${dia.display} (${dia.date})`, marginX, currentY);
      currentY += rowHeight; // Menos espacio debajo del título
  
      // Cabecera de la tabla
      pdf.setFontSize(7); // Reducimos el tamaño de fuente de la cabecera
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, currentY, tableWidth, rowHeight, 'F');
  
      const headers = [
        'Código',
        'Empleado',
        'Entrada',
        'Entrada C',
        'Salida C',
        'Entrada 2da C',
        'Salida 2da C',
        'Salida',
        'Incidencia',
        'Empresa y Obra',
        'Firma'
      ];
  
      let xPosition = marginX + 2;
      headers.forEach(header => {
        pdf.text(header, xPosition, currentY + 4); // Ajuste fino en alineación vertical
        xPosition += (header === 'Empleado' ? nameWidth : entryWidth);
      });
  
      currentY += rowHeight;
  
      // Filas de empleados
      this.empleadosSemana.forEach((emp) => {
        const nameText = `${emp.first_name} ${emp.middle_name} ${emp.last_name}`;
        const nameLines = pdf.splitTextToSize(nameText, nameWidth - 5);
        
        const workHours = emp.work_hours[dia.date] || {};
        const dayData = [
          this.formatHour(workHours.entry_time) || '--:--',
          this.formatHour(workHours.lunch_start_time) || '--:--',
          this.formatHour(workHours.lunch_end_time) || '--:--',
          this.formatHour(workHours.second_lunch_start_time) || '--:--',
          this.formatHour(workHours.second_lunch_end_time) || '--:--',
          this.formatHour(workHours.exit_time) || '--:--',
          workHours.incident || 'N/A',
          workHours.project_name || 'No Asignado'
        ];
  
        let maxLines = nameLines.length;
        const dayLines = dayData.map(text => {
          const splitLines = pdf.splitTextToSize(text, entryWidth - 5);
          maxLines = Math.max(maxLines, splitLines.length);
          return splitLines;
        });
  
        const rowHeightDynamic = rowHeight * maxLines;
  
        let xPos = marginX + 2;
        pdf.text(emp.employee_code.toString(), xPos, currentY + 4);
        xPos += codeWidth;
  
        pdf.text(nameLines, xPos, currentY + 4);
        xPos += nameWidth;
  
        dayLines.forEach(dayLine => {
          pdf.text(dayLine, xPos, currentY + 4);
          xPos += entryWidth;
        });
  
        pdf.text('_____________________', xPos + 5, currentY + 4);
  
        currentY += rowHeightDynamic;
      });
  
      // Pequeño espacio entre tablas de diferentes días
      currentY += rowHeight / 2; // Se redujo aún más
    });
  
    pdf.save('asistencia-semanal.pdf');
    loading.dismiss();
}



  
  async uploadPDF() {
    if (!this.file) {
      const alert = await this.ionicAlertController.create({
        header: 'Error',
        message: 'Por favor seleccione un archivo PDF.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }
  
    // Verificar si la semana seleccionada tiene el campo 'period_type_id'
    if (!this.selectedWeek || !this.selectedWeek.period_type_id) {
      const alert = await this.ionicAlertController.create({
        header: 'Error',
        message: 'La semana seleccionada no tiene un period_type_id válido.',
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }
  
    const loading = await this.loadingController.create({
      message: 'Subiendo PDF...',
    });
    await loading.present();
  
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('pdf', this.file, this.file.name);
    formData.append('company_id', this.companyService.selectedCompany.id);
    formData.append('week_number', this.selectedWeek.week_number);
    formData.append('period_type_id', this.selectedWeek.period_type_id); // Usar el period_type_id de la semana seleccionada
    formData.append('status', 'Subido'); // Define el estado inicial
  
    // Realizar la solicitud HTTP para subir el archivo
    this.http.post('https://siinad.mx/php/upload-pdf.php', formData).subscribe(
      async (response) => {
        loading.dismiss();
        const alert = await this.ionicAlertController.create({
          header: 'Éxito',
          message: 'El PDF se ha subido correctamente.',
          buttons: ['OK'],
        });
        await alert.present();
        this.isProcessed = true; // Establecer isProcessed en true después de subir el archivo
      },
      async (error) => {
        loading.dismiss();
        const alert = await this.ionicAlertController.create({
          header: 'Error',
          message: 'Hubo un error al subir el PDF. Intente nuevamente.',
          buttons: ['OK'],
        });
        await alert.present();
        console.error('Error al subir el PDF:', error);
      }
    );
  }

  formatHour(hour: string): string | null {
    if (!hour || hour === '00:00:00') {
      return null; // Devuelve null si la hora es '00:00:00' o está vacía
    }
    return moment(hour, 'HH:mm:ss').format('hh:mm A'); // Convierte a formato 12 horas con AM/PM
  }

}
