import { Component, OnInit } from '@angular/core';
import { NbDialogService, NbSpinnerService } from '@nebular/theme'; // Importar los servicios de Nebular
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service'; // Importar AuthService
import * as moment from 'moment'; // Importar moment.js para manejar fechas
import { IncidentModalComponent } from '../incident-modal/incident-modal.component';
import { ChangeHoursModalComponent } from '../change-hours-modal/change-hours-modal.component';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';

@Component({
  selector: 'ngx-incident-viewer',
  templateUrl: './incident-viewer.component.html',
  styleUrls: ['./incident-viewer.component.scss']
})
export class IncidentViewerComponent implements OnInit {
  weeks: any[] = []; // Lista de semanas laborales disponibles
  selectedWeek: any; // Semana laboral seleccionada
  assignedEmployees: any[] = []; // Lista de empleados asignados
  unassignedEmployees: any[] = []; // Lista de empleados no asignados
  filteredAssignedEmployees: any[] = []; // Lista filtrada de empleados asignados
  filteredUnassignedEmployees: any[] = []; // Lista filtrada de empleados no asignados
  searchAssigned: string = '';
  searchUnassigned: string = '';
  diasSemana: any[] = []; // Lista de días de la semana generados
  selectedDia: string = ''; // Día seleccionado
  companyId: string; // Usar tipo string para companyId

  // Opciones de incidencia para empleados asignados y no asignados
  assignedIncidents = ['Asistencia', 'Retardo', 'Horas Extras'];
  unassignedIncidents = ['Incapacidad', 'Vacaciones', 'Falta', 'Día Festivo', 'Permiso sin Goce de Sueldo', 'Permiso con Goce de Sueldo', 'Día de castigo'];

  constructor(
    private http: HttpClient,
    private dialogService: NbDialogService, // Usar NbDialogService de Nebular
    private spinnerService: NbSpinnerService, // Spinner de Nebular
    private authService: AuthService, // AuthService
    private companyService: CompanyService,
    private periodService: PeriodService
  ) {}

  ngOnInit() {
    this.companyId = this.companyService.selectedCompany.id; // Obtener el companyId directamente desde AuthService
    this.loadWeeks(); // Cargar semanas laborales disponibles
    moment.locale('es'); // Configurar moment.js para usar el idioma español
  }

  async loadWeeks() {
    const selectedPeriod = this.periodService.selectedPeriod.id; // Obtener el periodo seleccionado

    if (!selectedPeriod) {
      console.error('No se ha seleccionado un tipo de periodo');
      return;
    }

    const spinner = this.spinnerService; // Mostrar spinner
    spinner.load();

    this.http
      .get(
        `https://siinad.mx/php/get_weekly_periods.php?company_id=${this.companyId}&period_type_id=${selectedPeriod.period_type_id}`
      )
      .subscribe(
        (data: any) => {
          this.weeks = data;
          this.selectedWeek = this.weeks.length ? this.weeks[0] : null;
          this.onWeekChange(this.selectedWeek);
          spinner.clear();
        },
        (error) => {
          console.error('Error al cargar las semanas', error);
          spinner.clear();
        }
      );
  }

  onWeekChange(week: any) {
    this.selectedWeek = week;
    this.generateDiasSemana(week.start_date, week.end_date);
    this.loadEmployees();
  }

  generateDiasSemana(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    let day = start;
    while (day <= end) {
      this.diasSemana.push({
        date: day.format('YYYY-MM-DD'),
        display: day.format('dddd'), // Nombre del día de la semana
      });
      day = day.add(1, 'day');
    }
  }

  onDiaChange(dia: string): void {
    this.selectedDia = dia;
    this.loadEmployees();
  }

  async loadEmployees() {
    if (!this.selectedWeek || !this.selectedDia) {
      console.error('No se ha seleccionado una semana laboral o día');
      return;
    }

    const { start_date, end_date, week_number } = this.selectedWeek;

    const spinner = this.spinnerService;
    spinner.load();

    // Cargar empleados asignados
    this.http
      .get(
        `https://siinad.mx/php/get_assigned_employees1.php?start_date=${start_date}&end_date=${end_date}&company_id=${this.companyId}&project_id=0&week_number=${week_number}&day_of_week=${this.selectedDia}`
      )
      .subscribe(
        (data: any) => {
          this.assignedEmployees = data;
          this.filteredAssignedEmployees = [...this.assignedEmployees];
          spinner.clear();
        },
        (error) => {
          console.error('Error al cargar empleados asignados', error);
          spinner.clear();
        }
      );

    // Cargar empleados no asignados
    this.http
      .get(
        `https://siinad.mx/php/get_unassigned_employees.php?company_id=${this.companyId}&start_date=${start_date}&end_date=${end_date}&week_number=${week_number}&day_of_week=${this.selectedDia}`
      )
      .subscribe(
        (data: any) => {
          this.unassignedEmployees = data;
          this.filteredUnassignedEmployees = [...this.unassignedEmployees];
          spinner.clear();
        },
        (error) => {
          console.error('Error al cargar empleados no asignados', error);
          spinner.clear();
        }
      );
  }

  filterAssignedEmployees() {
    const searchTerm = this.searchAssigned.toLowerCase();
    this.filteredAssignedEmployees = this.assignedEmployees.filter((emp) =>
      (`${emp.first_name} ${emp.middle_name} ${emp.last_name}`).toLowerCase().includes(searchTerm)
    );
  }

  filterUnassignedEmployees() {
    const searchTerm = this.searchUnassigned.toLowerCase();
    this.filteredUnassignedEmployees = this.unassignedEmployees.filter((emp) =>
      (`${emp.first_name} ${emp.middle_name} ${emp.last_name}`).toLowerCase().includes(searchTerm)
    );
  }

  // Obtener empleados seleccionados
  getSelectedEmployees(isAssigned: boolean) {
    return isAssigned
      ? this.filteredAssignedEmployees.filter(emp => emp.selected)
      : this.filteredUnassignedEmployees.filter(emp => emp.selected);
  }

  // Cambiar horas a empleados seleccionados
  async changeHoursToSelected(isAssigned: boolean) {
    const selectedEmployees = this.getSelectedEmployees(isAssigned);
    if (selectedEmployees.length === 0) {
      console.log('No hay empleados seleccionados.');
      return;
    }

    // Abrir el modal personalizado con Nebular
    const dialogRef = this.dialogService.open(ChangeHoursModalComponent, {
      context: {
        employees: selectedEmployees // Pasar todos los empleados seleccionados al modal
      }
    });

    // Recibir los datos del modal al cerrarse
    dialogRef.onClose.subscribe((result) => {
      if (result) {
        selectedEmployees.forEach(employee => {
          this.saveHours(employee, result);
        });
      }
    });
  }

  saveHours(employee: any, data: any) {
    const workHoursData = {
      employee_id: employee.employee_id,
      period_id: this.selectedWeek.period_id,
      day_of_week: moment(this.selectedDia).format('YYYY-MM-DD'),
      work_week: this.selectedWeek.week_number,
      entry_time: data.entryTime,
      lunch_start_time: data.lunchStart,
      lunch_end_time: data.lunchEnd,
      exit_time: data.exitTime
    };

    this.http.post('https://siinad.mx/php/save_work_hours.php', workHoursData)
      .subscribe(
        response => console.log('Work hours saved successfully:', response),
        error => console.error('Error saving work hours:', error)
      );
  }

  // Asignar incidencia a empleados seleccionados
  async addIncidentToSelected(isAssigned: boolean) {
    const selectedEmployees = this.getSelectedEmployees(isAssigned);
    if (selectedEmployees.length === 0) {
      console.log('No hay empleados seleccionados.');
      return;
    }

    const incidentOptions = isAssigned ? this.assignedIncidents : this.unassignedIncidents;

    // Abrir solo un modal para todos los empleados seleccionados
    const dialogRef = this.dialogService.open(IncidentModalComponent, {
      context: {
        incidentOptions,
        employees: selectedEmployees // Pasar todos los empleados seleccionados al modal
      }
    });

    // Guardar la misma incidencia para todos los empleados seleccionados
    dialogRef.onClose.subscribe((result) => {
      if (result) {
        selectedEmployees.forEach(employee => {
          this.saveIncident(employee, result);
        });
      }
    });
  }

  saveIncident(employee: any, data: any) {
    const incidentData = {
      employee_id: employee.employee_id,
      period_id: this.selectedWeek.period_id,
      day_of_week: moment(this.selectedDia).format('YYYY-MM-DD'),
      work_week: this.selectedWeek.week_number,
      incident_type: data.incident,
      description: data.description
    };

    this.http.post('https://siinad.mx/php/save_incident.php', incidentData)
      .subscribe(
        response => console.log('Incident saved successfully:', response),
        error => console.error('Error saving incident:', error)
      );
  }
}