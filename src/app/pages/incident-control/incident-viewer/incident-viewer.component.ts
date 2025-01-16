import { Component, OnInit } from '@angular/core';
import { NbDialogService, NbSpinnerService,  NbToastrService } from '@nebular/theme'; // Importar los servicios de Nebular
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
    private periodService: PeriodService,
    private toastrService: NbToastrService
  ) { }

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

    this.http
      .get(
        `https://siinad.mx/php/get_weekly_periods.php?company_id=${this.companyId}&period_type_id=${selectedPeriod}`
      )
      .subscribe(
        (data: any) => {
          this.weeks = data;
          this.selectedWeek = this.weeks.length ? this.weeks[0] : null;
          if (this.selectedWeek) {
            this.onWeekChange(this.selectedWeek);
          }
        },
        (error) => {
          console.error('Error al cargar las semanas', error);
        }
      );
  }

  onWeekChange(week: any) {
    this.selectedWeek = week;
    this.generateDiasSemana(week.start_date, week.end_date);
    // Resetear el día seleccionado cuando cambia la semana
    this.selectedDia = null;
    this.loadEmployees();
  }

  generateDiasSemana(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    let day = start.clone(); // Clonar para evitar mutaciones
    while (day.isSameOrBefore(end, 'day')) {
      this.diasSemana.push({
        date: day.format('YYYY-MM-DD'),
        display: day.format('dddd').charAt(0).toUpperCase() + day.format('dddd').slice(1), // Capitalizar el día
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
    const day_of_week = this.selectedDia; // Usar el día seleccionado

    const spinner = this.spinnerService;
    spinner.load();

    // Cargar empleados asignados
    this.http.get(`https://siinad.mx/php/get_assigned_employees1.php?start_date=${start_date}&end_date=${end_date}&company_id=${this.companyId}&project_id=0&week_number=${week_number}&day_of_week=${day_of_week}`)
      .subscribe((data: any) => {
        this.assignedEmployees = data;
        this.filteredAssignedEmployees = [...this.assignedEmployees];
        spinner.clear();
      }, error => {
        console.error('Error al cargar empleados asignados', error);
        spinner.clear();
      });

    // Cargar empleados no asignados
    this.http.get(`https://siinad.mx/php/get_unassigned_employees.php?company_id=${this.companyId}&start_date=${start_date}&end_date=${end_date}&week_number=${week_number}&day_of_week=${day_of_week}`)
      .subscribe((data: any) => {
        this.unassignedEmployees = data;
        this.filteredUnassignedEmployees = [...this.unassignedEmployees];
        spinner.clear();
      }, error => {
        console.error('Error al cargar empleados no asignados', error);
        spinner.clear();
      });
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

  async saveHours(employee: any, data: any) {
    // Preparar los datos de las horas
    const workHoursData = {
      employee_id: employee.employee_id,
      period_id: this.selectedWeek.period_id,
      period_type_id: this.periodService.selectedPeriod.id,
      company_id: this.companyId,
      day_of_week: moment(this.selectedDia).format('YYYY-MM-DD'),
      work_week: this.selectedWeek.week_number,
      entry_time: data.entryTime,
      exit_time: data.exitTime,
      lunch_start_time: data.lunchStart,
      lunch_end_time: data.lunchEnd
    };
  
    // Realizar la solicitud HTTP para guardar las horas
    this.http.post('https://siinad.mx/php/save_work_hours.php', workHoursData)
      .subscribe(
        async (response) => {
          console.log('Horas guardadas correctamente:', response);
          // Mostrar el Toast de éxito
          await this.showToast('Horas asignadas correctamente.', 'success');
        },
        (error) => {
          console.error('Error al guardar las horas:', error);
          // En caso de error, mostrar un mensaje
          this.showToast('Hubo un error al asignar las horas. Intenta nuevamente.', 'danger');
        }
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

  async checkIfDayConfirmed(): Promise<boolean> {
    const { start_date, end_date, week_number } = this.selectedWeek;
    const day_of_week = this.selectedDia; // Usar el día seleccionado
  
    const spinner = this.spinnerService;
    spinner.load();
  
    return new Promise((resolve, reject) => {
      this.http.get(`https://siinad.mx/php/check_day_confirmed.php?company_id=${this.companyId}&start_date=${start_date}&end_date=${end_date}&week_number=${week_number}&day_of_week=${day_of_week}`)
        .subscribe((data: any) => {
          spinner.clear();
          if (data.confirmed) {
            this.showToast('Este día ya ha sido confirmado. No puedes asignar incidencias ni modificar las horas. Por favor, comunícate con un administrador.', 'danger');
            resolve(true); // El día está confirmado
          } else {
            resolve(false); // El día no está confirmado
          }
        }, error => {
          spinner.clear();
          console.error('Error al verificar si el día está confirmado:', error);
          reject(error);
        });
    });
  }

  showToast(message: string, status: 'success' | 'danger') {
    this.toastrService.show(message, 'Notificación', { status });
  }

  getFormattedDate(date: string): string {
    return moment(date).format('YYYY-MM-DD');
  }
}
