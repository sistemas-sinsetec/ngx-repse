import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbAlertModule, NbSpinnerService, NbDialogService } from '@nebular/theme';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import { NbToastrService } from '@nebular/theme';
import * as moment from 'moment';
import { ToastrComponent } from '../../modal-overlays/toastr/toastr.component';
import { DialogComponent } from '../../modal-overlays/dialog/dialog.component';
import { LoadingController, AlertController, NavController } from '@ionic/angular';

@Component({
  selector: 'ngx-confirm-day',
  templateUrl: './confirm-day.component.html',
  styleUrls: ['./confirm-day.component.scss']
})
export class ConfirmDayComponent {
  diasSemana: any[] = [];
  filteredEmployees: any[] = [];
  currentSemana: string = '';
  periodStartDate: string = '';
  periodEndDate: string = '';
  selectedDia: any;
  empleadosDia: any[] = [];
  empleadosIncidencias: any[] = [];
  currentPeriodId: string = '';
  isWeekConfirmed: boolean = false;
  currentFecha: string = '';

  filteredEmpleadosDia: any[] = []; // Lista filtrada de empleados asignados
  filteredEmpleadosIncidencias: any[] = []; // Lista filtrada de empleados con incidencias
  searchTerm: string = ''; // Término de búsqueda


  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertModule: NbAlertModule,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
    private loadingController: LoadingController,
    private alertController: AlertController,

  ) { }

  ngOnInit() {
    this.loadWeekData();
  }

  async loadWeekData() {
    const loading = await this.loadingController.create({
      message: 'Cargando datos de la semana...',
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    const periodTypeId = this.periodService.selectedPeriod.period_type_id;

    if (!companyId || !periodTypeId) {
      console.error('No se proporcionaron company_id o period_type_id');
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
          this.toastrService.danger('No se encontraron días confirmados para la semana.', 'danger');
        }
        loading.dismiss();
      },
      (error) => {
        console.error('Error al cargar los datos de la semana', error);
        loading.dismiss();
      }
    );
  }

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

  generarDiasDeSemana(startDate: string, endDate: string, periodId: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    const dias = [];

    while (start.isSameOrBefore(end)) {
      const date = start.format('YYYY-MM-DD');
      const dayData = this.diasSemana.find(dia => dia.day_of_week === date);

      dias.push({
        date: date,
        status: dayData && dayData.status ? dayData.status : null, // Usar null si no hay estado
        company_id: dayData ? dayData.company_id : this.companyService.selectedCompany.id,
        period_id: dayData ? dayData.period_id : periodId,
      });

      start.add(1, 'days');
    }

    this.diasSemana = dias;
  }

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

  async mostrarInfoDia(dia: any) {
    this.selectedDia = dia;
    await this.cargarEmpleadosDia(dia);

    // Verificar si hay empleados asignados o con incidencias
    if (this.empleadosDia.length === 0 && this.empleadosIncidencias.length === 0) {
      this.toastrService.show(
        'No hay empleados asignados ni con incidencias para este día.',
        `Información del Día: ${dia.date}`,
        { status: 'info', duration: 5000 }
      );
    }
  }

  async confirmarDia(dia: any) {
    const loading = await this.loadingController.create({
      message: 'Confirmando día...',
    });
    await loading.present();

    const body = {
      company_id: dia.company_id,
      period_id: dia.period_id,
      period_type_id: this.periodService.selectedPeriod.id, // Asegúrate de que esto esté disponible
      day_of_week: dia.date, // Suponiendo que `dia.date` es el día de la semana
      week_number: this.currentSemana, // Asegúrate de que esto esté disponible
      confirmation_date: new Date().toISOString().split('T')[0], // La fecha de confirmación
      status: 'confirmed' // O cualquier estado que necesites
    };

    const url = `https://siinad.mx/php/confirm-day.php`;

    this.http.post(url, body).subscribe(
      async (response: any) => {
        if (response && response.success) {
          console.log('Día confirmado correctamente');
          await this.mostrarAlerta('Día confirmado', `El día ${dia.date} se ha confirmado exitosamente.`);
          dia.status = 'confirmed';
        } else {
          console.error('Error al confirmar el día:', response.error);
          await this.mostrarAlerta('Error', response.error || 'Hubo un problema al confirmar el día. Inténtalo de nuevo.');
        }
        loading.dismiss();
      },
      async (error) => {
        console.error('Error en la solicitud de confirmación del día:', error);
        await this.mostrarAlerta('Error', 'Hubo un problema al conectar con el servidor. Inténtalo de nuevo.');
        loading.dismiss();
      }
    );
  }

  async mostrarAlerta(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }


  async eliminarEmpleadoDelDia(employeeId: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar este empleado asignado del día y su incidencia (si existe)?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Eliminando empleado asignado...',
            });
            await loading.present();

            const url = `https://siinad.mx/php/delete-employee-assignment-incident.php`;
            const body = { employee_id: employeeId, date: this.selectedDia.date };

            this.http.post(url, body).subscribe(
              async (response: any) => {
                if (response && response.success) {
                  // Eliminar el empleado de ambas listas
                  this.empleadosDia = this.empleadosDia.filter(emp => emp.employee_id !== employeeId);
                  this.empleadosIncidencias = this.empleadosIncidencias.filter(emp => emp.employee_id !== employeeId);
                  await this.mostrarAlerta('Eliminado', 'El empleado y su incidencia han sido eliminados correctamente.');
                } else {
                  console.error('Error al eliminar el empleado:', response.error);
                  await this.mostrarAlerta('Error', response.error || 'Hubo un problema al eliminar el empleado.');
                }
                loading.dismiss();
              },
              async (error) => {
                console.error('Error en la solicitud de eliminación del empleado:', error);
                await this.mostrarAlerta('Error', 'Hubo un problema al conectar con el servidor. Inténtalo de nuevo.');
                loading.dismiss();
              }
            );
          },
        },
      ],
    });
  }




}