
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbSpinnerService, NbToastrService, NbAlertModule } from '@nebular/theme';
import { AuthService } from '.././/../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import * as moment from 'moment';
import jsPDF from 'jspdf';


import autoTable from 'jspdf-autotable';
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

  paymentDay: number = null;

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

   // Nueva función para cargar el período y extraer el payment_days
   loadPayrollPeriod() {
    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;
    const url = `https://siinad.mx/php/get-payroll-periods.php?company_id=${companyId}&period_type_id=${periodTypeId}`;
    this.http.get(url).subscribe(
      (data: any[]) => {
        // Se asume que el período actual se identifica por el period_id;
        // se puede obtener de this.selectedWeek.period_id o de this.periodService.selectedPeriod
        const currentPeriodId = this.selectedWeek && this.selectedWeek.period_id 
                                  ? this.selectedWeek.period_id 
                                  : this.periodService.selectedPeriod.id;
        const period = data.find(item => item.period_type_id == currentPeriodId);
        if (period) {
          this.paymentDay = parseInt(period.payment_days, 10);
        } else {
          this.paymentDay = null;
          console.error('No se encontró el período actual en get-payroll-periods.php');
        }
      },
      (error) => {
        console.error('Error al cargar el período', error);
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
      return moment(period.start, 'YYYY-MM-DD').date(dayOfMonth);
    });
    return baseRestDates.some(base => {
      const diff = date.diff(base, 'days');
      return diff >= 0 && diff % cycleLength === 0;
    });
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
 // Al seleccionar una semana, se generan los días usando la nueva lógica y se cargan los empleados
 async onWeekChange(week: any) {
  if (week && week.start_date && week.end_date) {
    this.selectedWeek = week;
    this.isProcessed = false;
    this.generateWeekDays(week.start_date, week.end_date);
    await this.loadEmployeesForWeek();
    this.loadPayrollPeriod(); // Se actualiza paymentDay (aunque para el descanso se usa isRestDay)
  } else {
    console.error('La semana seleccionada no contiene información de fechas');
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
        date: current.format('YYYY-MM-DD'),
        display: current.format('dddd'),
        isRest: this.isRestDay(current)  // Se determina si es día de descanso
      });
      current.add(1, 'days');
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
      message: 'Generando PDF...'
    });
    await loading.present();
  
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginLeft = 5;
    const marginRight = 5;
    const tableWidth = pageWidth - (marginLeft + marginRight);
    let currentY = 5;
  
    console.log("dias", this.diasSemana);
  
    // Recorrer cada día de la semana
    for (let i = 0; i < this.diasSemana.length; i++) {
      const dia = this.diasSemana[i];
  
      // Si es día de descanso, imprimimos solo la cabecera (sin tabla)
      if (dia.isRest) {
        const headerContent = `Lista de Asistencia para ${dia.display} (${dia.date}) (descanso)`;
        pdf.setFontSize(7);
        pdf.setTextColor(0);
        pdf.text(headerContent, marginLeft, currentY + 5);
        currentY += 10;
        continue;
      }
  
      // Determinar si para este día existe información de segunda comida en al menos un empleado
      const showSecondMeal = this.empleadosSemana.some(emp => {
        const workHours = emp.work_hours[dia.date] || {};
        const secondLunchStart = this.formatHour(workHours.second_lunch_start_time);
        const secondLunchEnd = this.formatHour(workHours.second_lunch_end_time);
        // Consideramos que hay info si alguno de ellos tiene valor distinto de null o vacío
        return secondLunchStart != null || secondLunchEnd != null;
      });
  
      // Construir encabezado dinámico y anchos de columna según showSecondMeal
      let headerRow: any[] = [
        { content: 'Código', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Empleado', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Entrada', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Entrada C', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Salida C', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
      ];
      if (showSecondMeal) {
        headerRow.push(
          { content: 'Entrada 2da C', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
          { content: 'Salida 2da C', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } }
        );
      }
      headerRow.push(
        { content: 'Salida', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Incidencia', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Empresa y Obra', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } },
        { content: 'Firma', styles: { fontSize: 6, cellPadding: 1, textColor: 0, overflow: 'ellipsize' } }
      );
  
      // Definir los anchos de columna según si se muestran o no las columnas de segunda comida
      let colWidths: number[];
      if (showSecondMeal) {
        // Se usan 11 columnas (como en tu versión original)
        colWidths = [
          tableWidth * 0.068,  // Código
          tableWidth * 0.198,  // Empleado
          tableWidth * 0.05,   // Entrada
          tableWidth * 0.05,   // Entrada C
          tableWidth * 0.05,   // Salida C
          tableWidth * 0.056,  // Entrada 2da C
          tableWidth * 0.056,  // Salida 2da C
          tableWidth * 0.05,   // Salida
          tableWidth * 0.08,   // Incidencia
          tableWidth * 0.242,  // Empresa y Obra
          tableWidth * 0.10    // Firma
        ];
      } else {
        // Se usan 9 columnas
        colWidths = [
          tableWidth * 0.068,  // Código
          tableWidth * 0.198,  // Empleado
          tableWidth * 0.05,   // Entrada
          tableWidth * 0.05,   // Entrada C
          tableWidth * 0.05,   // Salida C
          tableWidth * 0.05,   // Salida (ajustado)
          tableWidth * 0.08,   // Incidencia
          tableWidth * 0.242,  // Empresa y Obra
          tableWidth * 0.10    // Firma
        ];
      }
  
      // Armar encabezados de tabla (primera fila: título de la lista)
      const tableHeader = [
        [
          {
            content: `Lista de Asistencia para ${dia.display} (${dia.date})`,
            colSpan: headerRow.length,
            styles: {
              halign: 'center',
              fontSize: 7,
              fillColor: [220, 220, 220],
              textColor: 0,
              cellPadding: 1,
              overflow: 'ellipsize'
            }
          }
        ],
        headerRow
      ];
  
      // Construir los datos por empleado para este día
      const data = this.empleadosSemana.map(emp => {
        const workHours = emp.work_hours[dia.date] || {};
        const entry = this.formatHour(workHours.entry_time) || '--:--';
        const lunchStart = this.formatHour(workHours.lunch_start_time) || '--:--';
        const lunchEnd = this.formatHour(workHours.lunch_end_time) || '--:--';
        // Obtener datos de 2da comida
        const secondLunchStart = this.formatHour(workHours.second_lunch_start_time) || '--:--';
        const secondLunchEnd = this.formatHour(workHours.second_lunch_end_time) || '--:--';
        const exit = this.formatHour(workHours.exit_time) || '--:--';
  
        // Si hay incidencia, no se muestran las horas
        let finalEntry = entry, finalLunchStart = lunchStart, finalLunchEnd = lunchEnd,
            finalSecondLunchStart = secondLunchStart, finalSecondLunchEnd = secondLunchEnd, finalExit = exit;
        if (workHours.incident && workHours.incident !== 'Asistencia sin proyecto' && workHours.incident !== 'N/A') {
          finalEntry = '';
          finalLunchStart = '';
          finalLunchEnd = '';
          finalSecondLunchStart = '';
          finalSecondLunchEnd = '';
          finalExit = '';
        }
  
        // Armar la fila según si se muestran las columnas de 2da comida
        const row: any[] = [
          emp.employee_code?.toString() || '',
          `${emp.first_name} ${emp.middle_name} ${emp.last_name}`,
          finalEntry,
          finalLunchStart,
          finalLunchEnd
        ];
        if (showSecondMeal) {
          row.push(finalSecondLunchStart, finalSecondLunchEnd);
        }
        row.push(
          finalExit,
          workHours.incident || 'N/A',
          workHours.project_name || 'No Asignado',
          '' // Firma vacía
        );
        return row;
      });
  
      // Revisar si hay espacio para la tabla en la página actual
      if (currentY + 10 > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
        currentY = 5;
      }
  
      autoTable(pdf, {
        head: tableHeader,
        body: data,
        startY: currentY,
        margin: { left: marginLeft, right: marginRight },
        styles: { fontSize: 5, cellPadding: 1, textColor: 0, overflow: 'ellipsize' },
        headStyles: { fillColor: [220, 220, 220], halign: 'center', cellPadding: 1, textColor: 0, overflow: 'ellipsize' },
        theme: 'grid',
        columnStyles: colWidths.reduce((acc, width, index) => {
          acc[index] = { cellWidth: width };
          return acc;
        }, {} as { [key: number]: { cellWidth: number } })
      });
  
      currentY = (pdf as any).lastAutoTable.finalY + 2;
    }
  
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
