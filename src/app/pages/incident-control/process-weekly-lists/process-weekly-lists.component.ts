import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbSpinnerService, NbAlertModule, NbToastrService } from '@nebular/theme';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import { NbActionsModule } from '@nebular/theme';
import * as moment from 'moment';



@Component({
  selector: 'ngx-process-weekly-lists',
  templateUrl: './process-weekly-lists.component.html',
  styleUrls: ['./process-weekly-lists.component.scss']
})
export class ProcessWeeklyListsComponent {
  confirmedWeeks: any[] = []; // Lista de semanas confirmadas
  selectedWeek: any; // Semana confirmada seleccionada
  diasSemana: any[] = []; // Días de la semana seleccionada
  empleadosSemana: any[] = []; // Lista de empleados con sus horarios y incidencias

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertModule: NbAlertModule,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private toastrService: NbToastrService,
  ) {}

  ngOnInit() {
    moment.locale('es'); // Configurar moment.js para usar el idioma español
    this.loadConfirmedWeeks(); // Cargar las semanas confirmadas al iniciar la página
  }

  // Cargar las semanas confirmadas
  loadConfirmedWeeks() {
    this.spinnerService.load(); // Activar el spinner

    const companyId = this.companyService.selectedCompany.id; 
    const periodTypeId = this.periodService.selectedPeriod.id; 

    if (!companyId || !periodTypeId) {
      console.error('No se proporcionaron company_id o period_type_id');
      this.spinnerService.clear(); // Detener el spinner
      return;
    }

    const url = `https://siinad.mx/php/get-confirmations-week.php?company_id=${companyId}&period_type_id=${periodTypeId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        if (Array.isArray(data)) {
          this.confirmedWeeks = data;
        } else {
          console.error('Datos recibidos no son un array', data);
        }
        this.spinnerService.clear(); // Detener el spinner
      },
      (error) => {
        console.error('Error al cargar semanas confirmadas', error);
        this.spinnerService.clear(); // Detener el spinner
      }
    );
  }

  // Cargar los días de la semana y los empleados al seleccionar una semana
  async onWeekChange(week: any) {
    if (week && week.payroll_period && week.payroll_period.start_date && week.payroll_period.end_date) {
      this.selectedWeek = week;
      this.generateWeekDays(week.payroll_period.start_date, week.payroll_period.end_date);
      await this.loadEmployeesForWeek();
    } else {
      console.error('La semana seleccionada no contiene información de payroll_period o las fechas no están definidas');
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
loadEmployeesForWeek() {
  if (!this.selectedWeek) return;

  // Activar el spinner
  this.spinnerService.load();

  const url = `https://siinad.mx/php/get-employees-weekly-data.php?week_number=${this.selectedWeek.week_number}`;
  
  this.http.get(url).subscribe(
    (data: any) => {
      const processedData = this.processEmployeeData(data);
      this.empleadosSemana = processedData;

      // Detener el spinner después de cargar los datos
      this.spinnerService.clear();
    },
    (error) => {
      console.error('Error al cargar datos de empleados', error);

      // Detener el spinner incluso si ocurre un error
      this.spinnerService.clear();
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
        exit_time: record.exit_time,
        incident: record.incident_type,
        project_name: record.project_name,
      };
    });

    return Object.values(employeesMap);
  }

   // Procesar la semana seleccionada
   processSelectedWeek() {
    if (!this.selectedWeek) return;
  
    this.spinnerService.load(); // Activar el spinner
  
    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;
    const startDate = this.selectedWeek.payroll_period?.start_date;
    const endDate = this.selectedWeek.payroll_period?.end_date;
  
    const url = 'https://siinad.mx/php/process-week.php';
    const data = {
      week_number: this.selectedWeek.week_number,
      company_id: companyId,
      period_type_id: periodTypeId,
      start_date: startDate,
      end_date: endDate,
    };
  
    this.http.post(url, data).subscribe(
      (response: any) => {
        this.spinnerService.clear(); // Detener el spinner
  
        // Mostrar mensaje de éxito
        this.toastrService.success(
          'La semana ha sido procesada exitosamente.',
          'Éxito',
          { duration: 3000, status: 'success' }
        );
      },
      (error) => {
        this.spinnerService.clear(); // Detener el spinner
  
        // Mostrar mensaje de error
        this.toastrService.danger(
          'Hubo un error al procesar la semana. Por favor, intente nuevamente.',
          'Error',
          { duration: 3000, status: 'danger' }
        );
        console.error('Error al procesar la semana', error);
      }
    );
  }

}
