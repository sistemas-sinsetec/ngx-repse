import { Component, OnInit } from '@angular/core';
import { NbDialogService, NbSpinnerService,  NbToastrService } from '@nebular/theme'; // Importar los servicios de Nebular
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service'; // Importar AuthService
import * as moment from 'moment'; // Importar moment.js para manejar fechas
import { IncidentModalComponent } from '../incident-modal/incident-modal.component';
import { ChangeHoursModalComponent } from '../change-hours-modal/change-hours-modal.component';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import { LoadingController, AlertController } from '@ionic/angular';

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
  companyId: string; // Usar tipo string para companyId, como lo proporciona el AuthService

  // Opciones de incidencia para empleados asignados y no asignados
  assignedIncidents = ['Asistencia', 'Retardo', 'Horas Extras'];
  unassignedIncidents = ['Asistencia sin proyecto', 'Descanso', 'Incapacidad', 'Vacaciones', 'Falta', 'Día Festivo', 'Permiso sin Goce de Sueldo', 'Permiso con Goce de Sueldo', 'Día de castigo'];
  userId: number;
  constructor(
    private http: HttpClient,
    private dialogService: NbDialogService, // Usar NbDialogService de Nebular
    private spinnerService: NbSpinnerService, // Spinner de Nebular
    private authService: AuthService, // AuthService
    private companyService: CompanyService,
    private periodService: PeriodService,
    private toastrService: NbToastrService,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.companyId = this.companyService.selectedCompany.id; // Obtener el companyId directamente desde AuthService
    this.userId = parseInt(this.authService.userId); 
    this.loadWeeks(); // Cargar semanas laborales disponibles
    moment.locale('es'); // Configurar moment.js para usar el idioma español
  }

  async loadWeeks() {
    const selectedPeriod = this.periodService.selectedPeriod?.id;
  
    if (!selectedPeriod) {
      console.error('No se ha seleccionado un tipo de periodo.');
      this.showToast('Por favor selecciona un periodo antes de continuar.', 'danger');
      return;
    }
  
    const loading = await this.loadingController.create({
      message: 'Cargando semanas...',
      spinner: 'circles',
    });
    await loading.present();
  
    this.http
      .get(
        `https://siinad.mx/php/get_weekly_periods.php?company_id=${this.companyId}&period_type_id=${selectedPeriod}`
      )
      .subscribe(
        (data: any) => {
          this.weeks = data || [];
          if (this.weeks.length > 0) {
            this.selectedWeek = this.weeks[0];
            this.onWeekChange(this.selectedWeek);
          } else {
            console.error('No se encontraron semanas disponibles.');
            this.showToast('No hay semanas disponibles para este periodo.', 'danger');
          }
          loading.dismiss();
        },
        (error) => {
          console.error('Error al cargar las semanas', error);
          this.showToast('Error al cargar las semanas. Por favor intenta de nuevo.', 'danger');
          loading.dismiss();
        }
      );
  }
  

  onWeekChange(week: any) {
    if (!week) {
      console.error('No se seleccionó ninguna semana.');
      this.showToast('Por favor selecciona una semana válida.', 'danger');
      return;
    }
  
    this.selectedWeek = week;
    this.generateDiasSemana(week.start_date, week.end_date); // Generar los días de la semana
  
    this.selectedDia = ''; // Reinicia el día seleccionado
    console.log('Semana seleccionada:', this.selectedWeek);
    console.log('Días generados:', this.diasSemana);

  }
  


  generateDiasSemana(startDate: string, endDate: string) {
    console.log('Fechas recibidas para generar días:', startDate, endDate);
  
    const start = moment(startDate);
    const end = moment(endDate);
  
    if (!start.isValid() || !end.isValid()) {
      console.error('Las fechas de inicio o fin no son válidas:', startDate, endDate);
      this.diasSemana = [];
      return;
    }
  
    this.diasSemana = [];
    let day = start.clone();
  
    while (day.isSameOrBefore(end)) {
      this.diasSemana.push({
        date: day.format('YYYY-MM-DD'),
        display: day.format('dddd'), // Día de la semana
      });
      day.add(1, 'day');
    }
  
    console.log('Días generados:', this.diasSemana);
  }
  
  

  onDiaChange(dia: string): void {
    this.selectedDia = dia; // Actualizar el día seleccionado
    this.loadEmployees(); // Recargar los empleados asignados y no asignados para el día seleccionado
    
  }

  async loadEmployees() {
    if (!this.selectedWeek || !this.selectedDia) {
      console.error('No se ha seleccionado una semana laboral o día');
      return;
    }

    const { start_date, end_date, week_number } = this.selectedWeek;
    const day_of_week = this.selectedDia;

    const loading = await this.loadingController.create({
      message: 'Cargando empleados...',
      spinner: 'circles',
    });
    await loading.present();

    // Cargar empleados asignados con el filtro de department_range
    this.http.get(`https://siinad.mx/php/get_assigned_employees1.php?start_date=${start_date}&end_date=${end_date}&company_id=${this.companyId}&project_id=0&week_number=${week_number}&day_of_week=${day_of_week}`)
      .subscribe((data: any) => {
        this.assignedEmployees = data;
        this.filteredAssignedEmployees = [...this.assignedEmployees];
        loading.dismiss();
      }, error => {
        console.error('Error al cargar empleados asignados', error);
        loading.dismiss();
      });

    // Cargar empleados no asignados con el filtro de department_range
    this.http.get(`https://siinad.mx/php/get_unassigned_employees.php?company_id=${this.companyId}&start_date=${start_date}&end_date=${end_date}&week_number=${week_number}&day_of_week=${day_of_week}`)
      .subscribe((data: any) => {
        this.unassignedEmployees = data;
        this.filteredUnassignedEmployees = [...this.unassignedEmployees];
        loading.dismiss();
      }, error => {
        console.error('Error al cargar empleados no asignados', error);
        loading.dismiss();
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
  
    const dayConfirmed = await this.checkIfDayConfirmed();
    if (dayConfirmed) {
      return;
    }
  
    this.dialogService
      .open(ChangeHoursModalComponent, {
        context: {
          employees: selectedEmployees,
        },
      })
      .onClose.subscribe(async (result) => {
        if (result) {
          await this.saveHours(selectedEmployees, result);
        }
      });
  }
  

  async saveHours(employees: any[], data: any) {
    const hoursDataList = employees.map(employee => ({
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
    }));
  
    try {
      // Realizar múltiples solicitudes en paralelo
      await Promise.all(
        hoursDataList.map(workHoursData =>
          this.http.post('https://siinad.mx/php/save_work_hours.php', workHoursData).toPromise()
        )
      );
  
      // Mostrar solo un mensaje de éxito
      await this.showToast('Todas las horas fueron asignadas correctamente.', 'success');
    } catch (error) {
      console.error('Error al guardar algunas horas:', error);
      await this.showToast('Ocurrió un error al asignar las horas.', 'danger');
    }
  }

  // Asignar incidencia a empleados seleccionados
  async addIncidentToSelected(isAssigned: boolean) {
    const selectedEmployees = this.getSelectedEmployees(isAssigned);
    if (selectedEmployees.length === 0) {
      console.log('No hay empleados seleccionados.');
      return;
    }
  
    const incidentOptions = isAssigned ? this.assignedIncidents : this.unassignedIncidents;
  
    // Verificar si el día ya está confirmado
    const dayConfirmed = await this.checkIfDayConfirmed();
    if (dayConfirmed) {
      return; // Si el día está confirmado, no continuar con la asignación
    }
  
    // Abrir un diálogo con Nebular
    this.dialogService
      .open(IncidentModalComponent, {
        context: {
          incidentOptions,
          employees: selectedEmployees, // Pasar todos los empleados seleccionados al modal
        },
        
      })
      .onClose.subscribe(async (result) => {
        if (result) {
          // Procesar incidencias para todos los empleados seleccionados
          await this.saveIncident(selectedEmployees, result);
        }
      });
  }
  


  async saveIncident(employees: any[], data: any) {
    const incidentDataList = employees.map(employee => ({
      employee_id: employee.employee_id,
      period_id: this.selectedWeek.period_id,
      period_type_id: this.periodService.selectedPeriod.id,
      company_id: this.companyId,
      day_of_week: moment(this.selectedDia).format('YYYY-MM-DD'),
      work_week: this.selectedWeek.week_number,
      incident_type: data.incident,
      description: data.description || null
    }));
  
    try {
      // Realizar múltiples solicitudes en paralelo
      await Promise.all(
        incidentDataList.map(incidentData =>
          this.http.post('https://siinad.mx/php/save_incident.php', incidentData).toPromise()
        )
      );
  
      // Mostrar solo un mensaje de éxito después de procesar todos
      await this.showToast('Todas las incidencias fueron asignadas correctamente.', 'success');
      await this.showAlert('Se asignaron las incidencias con éxito.');
    } catch (error) {
      console.error('Error al guardar algunas incidencias:', error);
      await this.showToast('Ocurrió un error al asignar las incidencias.', 'danger');
    }
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

  getFormattedDate2(date: string): string {
    return moment(date).format('dddd DD [de] MMMM [del] YYYY'); 
  }
  

  async showAlert(message: string) {
    const alert = await this.alertController.create({
      header: 'Advertencia',
      message: message,
      buttons: ['Aceptar'],
    });

    await alert.present();
  }
}
