import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import * as moment from 'moment';
import { AssignmentSummaryComponent } from '../assignment-summary/assignment-summary.component';
import { NbDialogService } from '@nebular/theme';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';

@Component({
  selector: 'ngx-assign-projects',
  templateUrl: './assign-projects.component.html',
  styleUrls: ['./assign-projects.component.scss'],
})
export class AssignProjectsComponent implements OnInit {
  semanas: any[] = [];
  selectedSemana: any;
  selectedDia: string = '';
  obras: any[] = [];
  filteredObras: any[] = [];
  selectedObra: any;
  empleados: any[] = [];
  selectedEmpleados: any[] = [];
  searchEmployee: string = '';
  filteredEmpleados: any[] = [];
  diasSemana: any[] = [];
  searchObra: string = '';

  constructor(
    private dialogService: NbDialogService,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private companyService: CompanyService,
    private periodService: PeriodService,
  ) {}

  ngOnInit() {
    moment.locale('es');
    this.loadWeeks();
  }

  formatDate(date: string): string {
    return moment(date).format('DD MMM YYYY');
  }

  async loadWeeks() {
    const companyId = this.companyService.selectedCompany.id;
    const selectedPeriod = this.periodService.selectedPeriod.id;

    if (!selectedPeriod) {
      console.error('No se ha seleccionado un tipo de periodo');
      return;
    }

    try {
      this.semanas = await this.http
        .get<any[]>(`https://siinad.mx/php/get_weekly_periods.php?company_id=${companyId}&period_type_id=${selectedPeriod}`)
        .toPromise();
      this.selectedSemana = this.semanas.length ? this.semanas[0] : null;
      this.onSemanaChange(this.selectedSemana);
    } catch (error) {
      console.error('Error al cargar las semanas', error);
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
    this.resetFields();
    this.selectedSemana = semana;
    this.generateDiasSemana(semana.start_date, semana.end_date);
    this.loadObras(semana.start_date, semana.end_date);
  }

  generateDiasSemana(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    this.diasSemana = [];

    let day = start;
    while (day <= end) {
      this.diasSemana.push({
        date: day.format('YYYY-MM-DD'),
        display: day.format('dddd'),
      });
      day = day.add(1, 'day');
    }
  }

  onDiaChange(dia: string): void {
    this.selectedDia = dia;
    this.loadEmpleados(this.selectedSemana, dia, this.selectedObra);
  }

  async loadObras(startDate: string, endDate: string) {
    try {
      const companyId = this.companyService.selectedCompany.id;
      this.obras = await this.http
        .get<any[]>(`https://siinad.mx/php/get_projects_by_date.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}`)
        .toPromise();
      this.filterObrasByDate(startDate, endDate);
      this.filterObras();
    } catch (error) {
      console.error('Error al cargar las obras', error);
    }
  }

  filterObrasByDate(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);

    this.filteredObras = this.obras.filter((obra) => {
      const obraStartDate = moment(obra.start_date);
      const obraEndDate = moment(obra.end_date);
      return obraStartDate.isBetween(start, end, 'day', '[]') || obraEndDate.isBetween(start, end, 'day', '[]');
    });

    this.selectedObra = this.filteredObras.length ? this.filteredObras[0] : null;
  }

  async loadEmpleados(semana: any, dia: string, obra: any) {
    if (semana && dia && obra) {
      try {
        const companyId = this.companyService.selectedCompany.id;
        const startDate = this.selectedSemana?.start_date;
        const endDate = this.selectedSemana?.end_date;

        const employees = await this.http
          .get<any[]>(`https://siinad.mx/php/get_active_employees_by_date.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}`)
          .toPromise();

        this.empleados = employees || [];
        this.filterEmpleados();

        const assignedEmployees = await this.http
          .get<any[]>(`https://siinad.mx/php/get_assigned_employees.php?start_date=${startDate}&end_date=${endDate}&company_id=${companyId}&project_id=${obra.project_id}&week_number=${semana.week_number}&day_of_week=${dia}`)
          .toPromise();

        this.markAssignedEmployees(assignedEmployees);
      } catch (error) {
        console.error('Error al cargar los empleados', error);
      }
    }
  }

  markAssignedEmployees(assignedEmployees: any) {
    this.empleados.forEach((empleado) => {
      empleado.isAssigned = assignedEmployees.includes(empleado.employee_id);
    });
    this.filterEmpleados();
  }

  filterObras() {
    const searchTerm = this.searchObra.toLowerCase();
    this.filteredObras = this.obras.filter((obra) => obra.project_name.toLowerCase().includes(searchTerm));
  }

  filterEmpleados() {
    const searchTerm = this.searchEmployee.toLowerCase();
    this.filteredEmpleados = this.empleados.filter((empleado) => {
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
    const dialogRef = this.dialogService.open(AssignmentSummaryComponent, {
      context: {
        selectedSemana: this.selectedSemana,
        selectedDia: this.selectedDia,
        selectedObra: this.selectedObra,
        selectedEmpleados: this.selectedEmpleados,
        authService: this.authService,
      },
      closeOnBackdropClick: false,
    });

    dialogRef.onClose.subscribe((data) => {
      if (data?.confirmed) {
        this.sendAssignment();
      }
    });
  }

  async sendAssignment() {
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

      await this.http.post('https://siinad.mx/php/assign-employees.php', data).toPromise();
      console.log('Empleados asignados correctamente');

      this.selectedEmpleados.forEach((empleado) => {
        empleado.isAssigned = true;
      });

      this.selectedEmpleados = [];
    } catch (error) {
      console.error('Error al asignar empleados', error);
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
    this.router.navigate(['../']);
  }

  isFormValid(): boolean {
    return this.selectedSemana && this.selectedDia && this.selectedObra && this.selectedEmpleados.length > 0;
  }

  selectAllUnassignedEmployees(): void {
    this.filteredEmpleados.forEach((empleado) => {
      if (!empleado.isAssigned && !this.selectedEmpleados.includes(empleado)) {
        this.selectedEmpleados.push(empleado);
      }
    });
  }
}
