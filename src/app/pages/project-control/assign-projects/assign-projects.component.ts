import { Component, OnInit } from '@angular/core';
import {  LoadingController } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import * as moment from 'moment';  // Importar moment.js para manejar fechas
import { AssignmentSummaryComponent } from '../assignment-summary/assignment-summary.component';
import { NbDialogService, NbDialogRef } from '@nebular/theme';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';

@Component({
  selector: 'ngx-assign-projects',
  templateUrl: './assign-projects.component.html',
  styleUrls: ['./assign-projects.component.scss']
})
export class AssignProjectsComponent implements OnInit {
  // Variables para manejar la selección de semana, día y obra
  semanas: any[] = [];
  selectedSemana: any;
  selectedDia: string = '';
  obras: any[] = [];
  filteredObras: any[] = []; // Lista de obras filtradas por fecha
  selectedObra: any;
  empleados: any[] = [];
  selectedEmpleados: any[] = [];
  searchEmployee: string = ''; // Propiedad para manejar la búsqueda de empleados
  filteredEmpleados: any[] = []; // Lista filtrada de empleados
  diasSemana: any[] = []; // Lista de días de la semana generados
  searchObra: string = ''; // Propiedad para manejar la búsqueda de obras

  constructor(
    private dialogService: NbDialogService,
    private dialogRef: NbDialogRef<AssignProjectsComponent>,
    private http: HttpClient,
    private authService: AuthService,
    private loadingController: LoadingController,
    private router: Router,
    private companyService: CompanyService,
    private periodService: PeriodService,
  ) { }

  ngOnInit() {
    moment.locale('es'); // Configurar moment.js para usar el idioma español
    this.loadWeeks();
  }

  formatDate(date: string): string {
    return moment(date).format('DD MMM YYYY'); // Formato deseado: 30 ago 2024
  }

  async loadWeeks() {
    const companyId = this.companyService.selectedCompany.id; // Obtener el companyId desde AuthService
    const selectedPeriod = this.periodService.selectedPeriod; // Obtener el periodo seleccionado desde AuthService

    if (!selectedPeriod) {
      console.error('No se ha seleccionado un tipo de periodo');
      return;
    }

    let loading = await this.loadingController.create({
      message: 'Cargando semanas...',
      spinner: 'circles',
    });

    try {
      await loading.present();

      this.http.get(`https://siinad.mx/php/get_weekly_periods.php?company_id=${companyId}&period_type_id=${selectedPeriod.period_type_id}`)
        .subscribe((data: any) => {
          this.semanas = data;
          this.selectedSemana = this.semanas.length ? this.semanas[0] : null;
          this.onSemanaChange(this.selectedSemana);
        }, error => {
          console.error('Error al cargar las semanas', error);
        }, () => {
          loading.dismiss();
        });
    } catch (e) {
      console.error('Error al presentar el loading', e);
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  resetFields(): void {
    this.selectedSemana = null;
    this.selectedDia = '';
    this.selectedObra = null;
    this.selectedEmpleados = [];
    this.searchEmployee = '';
    this.filteredEmpleados = [];
    this.diasSemana = [];
    this.searchObra = '';
    this.filteredObras = [];
  }

  onSemanaChange(semana: any): void {
    this.resetFields(); // Restablecer todos los campos antes de cargar los nuevos datos
    this.selectedSemana = semana;
    this.generateDiasSemana(semana.start_date, semana.end_date); // Generar los días de la semana
    this.loadObras(semana.start_date, semana.end_date); // Cargar obras según las fechas de inicio y fin
  }

  generateDiasSemana(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    let day = start;
    while (day <= end) {
      this.diasSemana.push({
        date: day.format('YYYY-MM-DD'),
        display: day.format('dddd'), // Nombre del día de la semana (e.g., Lunes)
      });
      day = day.add(1, 'day');
    }
  }

  onDiaChange(dia: string): void {
    this.selectedDia = dia;
    this.loadEmpleados(this.selectedSemana, dia, this.selectedObra);
  }

  async loadObras(startDate: string, endDate: string) {
    let loading = await this.loadingController.create({
      message: 'Cargando obras...',
      spinner: 'circles',
    });

    try {
      await loading.present();

      const companyId = this.companyService.selectedCompany.id; // Obtener el companyId desde AuthService

      this.http.get(`https://siinad.mx/php/get_projects_by_date.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}`)
        .subscribe((data: any) => {
          this.obras = data;
          this.filterObrasByDate(startDate, endDate);
          this.filterObras(); // Inicializar la lista filtrada
        }, error => {
          console.error('Error al cargar las obras', error);
        }, () => {
          loading.dismiss();
        });
    } catch (e) {
      console.error('Error al presentar el loading', e);
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  filterObrasByDate(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);

    this.filteredObras = this.obras.filter(obra => {
      const obraStartDate = moment(obra.start_date);
      const obraEndDate = moment(obra.end_date);
      return obraStartDate.isBetween(start, end, 'day', '[]') || obraEndDate.isBetween(start, end, 'day', '[]');
    });

    this.selectedObra = this.filteredObras.length ? this.filteredObras[0] : null;
  }

  async loadEmpleados(semana: any, dia: string, obra: any) {
    let loading = await this.loadingController.create({
      message: 'Cargando empleados...',
      spinner: 'circles',
    });

    try {
      await loading.present();

      if (semana && dia && obra) {
        const companyId = this.companyService.selectedCompany.id;
        const startDate = this.selectedSemana?.start_date;
        const endDate = this.selectedSemana?.end_date;
        const projectId = this.selectedObra?.project_id;
        const weekNumber = this.selectedSemana?.week_number;
        const dayOfWeek = this.selectedDia;

        // Obtener empleados activos
        this.http.get(`https://siinad.mx/php/get_active_employees_by_date.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}`)
          .subscribe((data: any) => {
            // Asegúrate de que data sea un array
            this.empleados = Array.isArray(data) ? data : [];
            this.filterEmpleados();

            // Obtener empleados ya asignados
            this.http.get(`https://siinad.mx/php/get_assigned_employees.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}&project_id=${projectId}&week_number=${weekNumber}&day_of_week=${dayOfWeek}`)
              .subscribe((assignedData: any) => {
                this.markAssignedEmployees(assignedData);
              }, error => {
                console.error('Error al cargar empleados asignados', error);
              }, () => {
                loading.dismiss();
              });
          }, error => {
            console.error('Error al cargar los empleados', error);
          }, () => {
            loading.dismiss();
          });
      } else {
        loading.dismiss();
      }
    } catch (e) {
      console.error('Error al presentar el loading', e);
      if (loading) {
        await loading.dismiss();
      }
    }
  }

  // Marcar empleados asignados
  markAssignedEmployees(assignedEmployees: any) {
    this.empleados.forEach(empleado => {
      if (assignedEmployees.includes(empleado.employee_id)) {
        empleado.isAssigned = true;
      } else {
        empleado.isAssigned = false;
      }
    });
    this.filterEmpleados();
  }

  filterObras() {
    const searchTerm = this.searchObra.toLowerCase();
    this.filteredObras = this.obras.filter(obra => {
      const obraName = obra.project_name.toLowerCase();
      return obraName.includes(searchTerm);
    });
  }

  filterEmpleados() {
    const searchTerm = this.searchEmployee.toLowerCase();
    this.filteredEmpleados = this.empleados.filter(empleado => {
      const fullName = `${empleado.last_name} ${empleado.middle_name} ${empleado.first_name}`.toLowerCase();
      return fullName.includes(searchTerm);
    });
  }

  toggleEmpleadoSelection(empleado: any): void {
    const index = this.selectedEmpleados.indexOf(empleado);
    if (index > -1) {
      this.selectedEmpleados.splice(index, 1);
    } else {
      this.selectedEmpleados.push(empleado);
    }
  }

  async assignEmployees() {
    const dialogRef: NbDialogRef<AssignmentSummaryComponent> = this.dialogService.open(AssignmentSummaryComponent, {
      context: {
        selectedSemana: this.selectedSemana,
        selectedDia: this.selectedDia,
        selectedObra: this.selectedObra,
        selectedEmpleados: this.selectedEmpleados,
        authService: this.authService,
      },
      closeOnBackdropClick: false, // Si deseas deshabilitar cerrar el modal al hacer clic fuera
    });

    dialogRef.onClose.subscribe((data) => {
      if (data?.confirmed) {
        this.sendAssignment(); // Solo enviar si se ha confirmado
      }
    });
  }

  async sendAssignment() {
    const loadingElement = document.createElement('nb-spinner');
    loadingElement.setAttribute('message', 'Asignando empleados...');
    document.body.appendChild(loadingElement);

    try {
      const data = {
        weekNumber: this.selectedSemana?.week_number,
        startDate: this.selectedSemana?.start_date,
        endDate: this.selectedSemana?.end_date,
        dayOfWeek: this.selectedDia,
        dayText: moment(this.selectedDia).format('dddd'),
        obraId: this.selectedObra?.project_id,
        employeeIds: this.selectedEmpleados.map((e) => e.employee_id),
        companyId: this.companyService.selectedCompany.id,
        fiscalYear: this.periodService.selectedPeriod.fiscal_year,
        periodTypeId: this.periodService.selectedPeriod.id,
        periodNumber: this.selectedSemana?.period_number,
        periodId: this.selectedSemana?.period_id,
      };

      const response = await this.http.post('https://siinad.mx/php/assign-employees.php', data).toPromise();
      console.log('Empleados asignados correctamente', response);

      // Cierra el diálogo antes de limpiar los empleados seleccionados
      if (this.dialogRef){
      this.dialogRef.close(data);
      }

      this.selectedEmpleados.forEach((empleado) => {
        empleado.isAssigned = true;
      });

      // Limpia la lista de empleados seleccionados
      this.selectedEmpleados = [];
    } catch (error) {
      console.error('Error al asignar empleados', error);
    } finally {
      document.body.removeChild(loadingElement);
    }
  }

  cancelar() {
    if (this.dialogRef) {
      this.dialogRef.close(); // Cierra el diálogo
    }
  }

  onObraChange(obra: any): void {
    this.selectedObra = obra;
    this.loadEmpleados(this.selectedSemana, this.selectedDia, obra);
  }

  onSearchChange() {
    this.filterEmpleados();
  }

  goBack() {
    this.router.navigate(['../']); // Navega hacia atrás en el historial
  }

  isFormValid(): boolean {
    return this.selectedSemana && this.selectedDia && this.selectedObra && this.selectedEmpleados.length > 0;
  }
  

  selectAllUnassignedEmployees(): void {
    this.filteredEmpleados.forEach(empleado => {
      if (!empleado.isAssigned && !this.selectedEmpleados.includes(empleado)) {
        this.selectedEmpleados.push(empleado);
      }
    });
  }
}
