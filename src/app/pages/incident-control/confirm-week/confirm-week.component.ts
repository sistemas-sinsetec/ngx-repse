import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbSpinnerService, NbToastrService, NbDialogService } from '@nebular/theme';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import { DialogComponent } from '../../modal-overlays/dialog/dialog.component';
import * as moment from 'moment';
import { LoadingController } from '@ionic/angular';


@Component({
  selector: 'ngx-confirm-week',
  templateUrl: './confirm-week.component.html',
  styleUrls: ['./confirm-week.component.scss']
})
export class ConfirmWeekComponent {
  diasSemana: any[] = [];
  filteredEmployees: any[] = [];
  currentSemana: string = '';
  periodStartDate: string = '';
  periodEndDate: string = '';
  selectedDia: any; // Día seleccionado por el usuario
  empleadosDia: any[] = []; // Lista de empleados para el día seleccionado
  currentPeriodId: string = '';
  isWeekConfirmed: boolean = false; // Verificar si la semana está confirmada
  empleadosIncidencias: any[] = [];

  filteredEmpleadosDia: any[] = []; // Lista filtrada de empleados asignados
  filteredEmpleadosIncidencias: any[] = []; // Lista filtrada de empleados con incidencias
  searchTerm: string = ''; // Término de búsqueda

  constructor(
    private authService: AuthService,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private toastrService: NbToastrService,
    private dialogService: NbDialogService,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.loadWeekData();
  }

  // Cargar los datos de la semana
  async loadWeekData() {

    const loading = await this.loadingController.create({
      message: 'Cargando datos de la semana...',
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.id;

    if (!companyId || !periodTypeId) {
      console.error('No se proporcionaron company_id o period_id');
      loading.dismiss();
      return;
    }

    const url = `https://siinad.mx/php/get-week-data.php?company_id=${companyId}&period_type_id=${periodTypeId}`;

    this.http.get(url).subscribe(
      (data: any) => {
        if (data && data.length > 0 && !data.error) {
          this.diasSemana = data;
          this.filteredEmployees = [...this.diasSemana];

          const semanaActual = this.diasSemana[0];
          this.currentSemana = semanaActual.week_number;
          this.periodStartDate = semanaActual.period_start_date;
          this.periodEndDate = semanaActual.period_end_date;
          this.currentPeriodId = semanaActual.period_id;

          this.generarDiasDeSemana(this.periodStartDate, this.periodEndDate, this.currentPeriodId);
          this.verificarConfirmacionSemana(companyId, this.currentPeriodId);
        } else {
          console.error('No se encontraron días confirmados para la semana.');
          this.mostrarAlerta('Sin datos', 'No hay días confirmados para la semana actual.');
        }
        loading.dismiss();
      },
      (error) => {
        console.error('Error al cargar los datos de la semana', error);
        loading.dismiss();
      }
    );
  }

  // Verificar si la semana está confirmada
  verificarConfirmacionSemana(companyId: string, periodId: string) {
    const confirmUrl = `https://siinad.mx/php/get-week-confirmations.php?company_id=${companyId}&period_id=${periodId}`;

    this.http.get(confirmUrl).subscribe(
      (response: any) => {
        this.isWeekConfirmed = response && response.length > 0;
      },
      (error) => {
        console.error('Error al verificar la confirmación de la semana', error);
      }
    );
  }
  // Generar los días de la semana
  generarDiasDeSemana(startDate: string, endDate: string, periodId: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    const dias = [];

    while (start.isSameOrBefore(end)) {
      const date = start.format('YYYY-MM-DD');
      const dayData = this.diasSemana.find(dia => dia.day_of_week === date);

      dias.push({
        date: date,
        status: dayData && dayData.status ? dayData.status : null,
        company_id: dayData ? dayData.company_id : this.companyService.selectedCompany.id,
        period_id: dayData ? dayData.period_id : periodId,
      });

      start.add(1, 'days');
    }

    this.diasSemana = dias;
  }

  // Cargar los empleados para un día específico
  async cargarEmpleadosDia(dia: any) {
    const loading = await this.loadingController.create({
      message: 'Cargando empleados para el día seleccionado...',
    });
    await loading.present();
    // Limpiar listas de empleados asignados e incidencias antes de cargar los nuevos datos
    this.empleadosDia = []; // Lista de empleados asignados
    this.empleadosIncidencias = []; // Lista de empleados con incidencias

    const companyId = dia.company_id;
    const periodId = dia.period_id;
    const date = dia.date;

    const url = `https://siinad.mx/php/get-employee-assignments-days.php?company_id=${companyId}&period_id=${periodId}&date=${date}`;

    try {
      const data: any = await this.http.get(url).toPromise();

      if (data) {
        // Asignar los empleados asignados y con incidencias
        this.empleadosDia = data.empleados_asignados || [];
        this.empleadosIncidencias = data.empleados_incidencias || [];

        // Crear una lista de empleados combinados
        this.empleadosDia = this.empleadosDia.map(empAsignado => {
          // Verificar si el empleado también tiene una incidencia
          const incidencia = this.empleadosIncidencias.find(inc => inc.employee_id === empAsignado.employee_id);

          // Si el empleado tiene una incidencia, combinar los datos
          if (incidencia) {
            return {
              ...empAsignado,
              incident_type: incidencia.incident_type,
              description: incidencia.description,
              hasIncidencia: true // Bandera para indicar que tiene una incidencia
            };
          }

          // Si no tiene incidencia, devolver el empleado tal cual
          return empAsignado;
        });

        // Filtrar empleados con incidencias que no están en `empleadosDia`
        this.empleadosIncidencias = this.empleadosIncidencias.filter(
          inc => !this.empleadosDia.some(emp => emp.employee_id === inc.employee_id)
        );

        // Inicializar las listas filtradas con los datos recién cargados
        this.filteredEmpleadosDia = [...this.empleadosDia];
        this.filteredEmpleadosIncidencias = [...this.empleadosIncidencias];

        if (this.empleadosDia.length === 0 && this.empleadosIncidencias.length === 0) {
          console.error('No se encontraron empleados para el día seleccionado.');
        }
      } else {
        console.error('No se encontraron empleados para el día seleccionado.');
      }
    } catch (error) {
      console.error('Error al cargar los empleados para el día seleccionado', error);
    } finally {
      loading.dismiss();
    
    }
  }

  // Mostrar información del día seleccionado
  async mostrarInfoDia(dia: any) {
    this.selectedDia = dia;
    await this.cargarEmpleadosDia(dia);

    if (this.empleadosDia.length === 0 && this.empleadosIncidencias.length === 0) {
      this.toastrService.warning('No hay empleados asignados a este día.', `Información del Día: ${dia.date}`);
    }
  }

  atLeastFiveDaysConfirmed(): boolean {
    const confirmedDays = this.diasSemana.filter(dia => dia.status === 'confirmed');
    return confirmedDays.length >= 5;
  }
  

  // Confirmar toda la semana
  async confirmarSemana() {
    const dialogRef = this.dialogService.open(DialogComponent, {
      context: {
        title: 'Confirmar Semana',
        message: '¿Estás seguro de que quieres confirmar toda la semana?',
      },
    });

    dialogRef.onClose.subscribe((confirmed) => {
      if (confirmed) {
        this.confirmarSemanaCompleta();
      }
    });
  }

  // Confirmar la semana completa
  async confirmarSemanaCompleta() {
    const loading = await this.loadingController.create({
      message: 'Confirmando semana...',
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodId = this.currentPeriodId;
    const periodTypeId = this.periodService.selectedPeriod.id;
    const weekNumber = this.currentSemana;

    if (!companyId || !periodId || !periodTypeId || !weekNumber) {
      console.error('Faltan datos para confirmar la semana');
      loading.dismiss();
      return;
    }

    const body = {
      company_id: companyId,
      period_id: periodId,
      period_type_id: periodTypeId,
      week_number: weekNumber,
    };
   
    const url = `https://siinad.mx/php/confirm-week.php`;

    this.http.post(url, body).subscribe(
      async (response: any) => {
        if (response && response.success) {
          console.log('Semana confirmada correctamente');
          await this.toastrService.success('La semana se ha confirmado exitosamente.');
        } else {
          console.error('Error al confirmar la semana:', response.message);
          await this.toastrService.danger('Hubo un problema al confirmar la semana. Inténtalo de nuevo.');
        }
        loading.dismiss();
      },
      async (error) => {
        console.error('Error en la solicitud de confirmación de la semana:', error);
        await this.toastrService.danger('Hubo un problema al conectar con el servidor. Inténtalo de nuevo.');
        loading.dismiss();
      }
    );
  }

  // Método para mostrar alertas con Nebular Toastr
  async mostrarAlerta(header: string, message: string) {
    this.toastrService.show(message, header, { status: 'danger' });
  }

  filterEmployees() {
    const searchTermLower = this.searchTerm.toLowerCase();

    // Filtrar empleados asignados
    this.filteredEmpleadosDia = this.empleadosDia.filter(emp =>
      emp.employee_code.toLowerCase().includes(searchTermLower) ||
      emp.first_name.toLowerCase().includes(searchTermLower) ||
      emp.last_name.toLowerCase().includes(searchTermLower) ||
      (emp.middle_name && emp.middle_name.toLowerCase().includes(searchTermLower))
    );

    // Filtrar empleados con incidencias
    this.filteredEmpleadosIncidencias = this.empleadosIncidencias.filter(emp =>
      emp.employee_code.toLowerCase().includes(searchTermLower) ||
      emp.first_name.toLowerCase().includes(searchTermLower) ||
      emp.last_name.toLowerCase().includes(searchTermLower) ||
      (emp.middle_name && emp.middle_name.toLowerCase().includes(searchTermLower))
    );
  }
} 
