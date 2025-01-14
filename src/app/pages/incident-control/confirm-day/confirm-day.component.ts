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

@Component({
  selector: 'ngx-confirm-day',
  templateUrl: './confirm-day.component.html',
  styleUrls: ['./confirm-day.component.scss']
})
export class ConfirmDayComponent {
  selectAll: boolean = false; // Bandera para seleccionar todos

  diasPendientes: any[] = [];
  filteredDias: any[] = [];
  currentFechaDias: any[] = [];  // Días de la fecha actual
  currentFecha: string = '';  // Fecha actual a mostrar
  searchTerm: string = '';
  currentSemana: string = '';
  currentPeriodId: string = ''; // Variable para almacenar el period_id

  periodStartDate: string = ''; // Fecha de inicio del periodo
  periodEndDate: string = '';   // Fecha de fin del periodo
  diasDelPeriodo: any[] = [];   // Días generados dentro del periodo

  isLastConfirmedDay: boolean = false; // Para verificar si se muestra el último día confirmado
  noDaysAvailable: boolean = false; // Nueva propiedad para manejar el caso de que no haya días
  isButtonDisabled: boolean = false; // Controla si el botón está deshabilitado

  constructor(
    private authService: AuthService,
    private httpClient: HttpClient,
    private spinnerService: NbSpinnerService,
    private alertModule: NbAlertModule,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,

  ) { }

  ngOnInit() {
    this.loadDiasPendientes();
  }

    async loadDiasPendientes() {
      // Mostrar el spinner
      this.spinnerService.load();
    
      const companyId = this.companyService.selectedCompany.id;  // Obtener company_id desde AuthService
      const periodId = this.periodService.selectedPeriod.period;  // Obtener period_id desde AuthService
    
      if (!companyId || !periodId) {
        console.error('No se proporcionaron company_id o period_id');
        this.spinnerService.clear(); // Ocultar el spinner
        return;
      }
    
      try {
        // Lógica para cargar días pendientes
        const response = await this.httpClient
          .get(`https://api.example.com/dias-pendientes?companyId=${companyId}&periodId=${periodId}`)
          .toPromise();
    
        // Procesar la respuesta
        console.log('Días pendientes cargados:', response);
      } catch (error) {
        console.error('Error al cargar días pendientes:', error);
      } finally {
        // Ocultar el spinner
        this.spinnerService.clear();
      }
    }

    filtrarPorFechaMasAntigua() {
      if (this.diasPendientes.length > 0) {
        console.log('Días pendientes inicial:', this.diasPendientes); // Mostrar todos los días pendientes
    
        this.noDaysAvailable = false; // Reiniciar si se encuentran días
    
        // Filtrar los días que están pendientes (asegúrate de que project_status sea exactamente "pending")
        const diasPendientes = this.diasPendientes.filter(dia => dia.project_status && dia.project_status.trim().toLowerCase() === 'pending');
        console.log('Días filtrados como pendientes:', diasPendientes); // Mostrar días pendientes después de filtrar por project_status
    
        if (diasPendientes.length > 0) {
          // Ordenar los días pendientes por fecha para encontrar el más antiguo
          diasPendientes.sort((a, b) => moment(a.day_of_week).diff(moment(b.day_of_week)));
          console.log('Días pendientes ordenados por fecha:', diasPendientes); // Mostrar días pendientes ordenados
    
          // Si hay días pendientes, mostrar el más antiguo
          this.isLastConfirmedDay = false;
          const fechaMasAntigua = diasPendientes[0].day_of_week;
          console.log('Fecha más antigua encontrada:', fechaMasAntigua); // Mostrar la fecha más antigua encontrada
    
          // Filtrar todos los días de esa fecha (incluir todos los empleados de la misma fecha)
          this.currentFechaDias = this.diasPendientes.filter(dia => dia.day_of_week === fechaMasAntigua);
          console.log('Días correspondientes a la fecha más antigua (todos los empleados):', this.currentFechaDias); // Mostrar días de la fecha más antigua con todos los empleados
          this.currentFecha = fechaMasAntigua;
    
          const periodoMasAntiguo = this.currentFechaDias[0];
          if (periodoMasAntiguo) {
            console.log('Periodo más antiguo encontrado:', periodoMasAntiguo); // Mostrar el periodo más antiguo encontrado
            this.periodStartDate = periodoMasAntiguo.period_start_date;
            this.periodEndDate = periodoMasAntiguo.period_end_date;
            this.currentSemana = periodoMasAntiguo.work_week;
            this.currentPeriodId = periodoMasAntiguo.period_id;
    
            // Generar los días del periodo
            this.generarDiasDelPeriodo(this.periodStartDate, this.periodEndDate);
          }
        } else {
          // Si no hay días pendientes, buscar el último día confirmado
          this.isLastConfirmedDay = true;
          const ultimoDiaConfirmado = this.diasPendientes
            .filter(dia => dia.project_status && dia.project_status.trim().toLowerCase() === 'confirmed')
            .sort((a, b) => moment(b.confirmation_date).diff(moment(a.confirmation_date)))[0];
    
          console.log('Último día confirmado encontrado:', ultimoDiaConfirmado); // Mostrar el último día confirmado encontrado
    
          if (ultimoDiaConfirmado) {
            // Filtrar todos los días confirmados para esa fecha
            this.currentFechaDias = this.diasPendientes.filter(dia => dia.day_of_week === ultimoDiaConfirmado.day_of_week);
            this.currentFecha = ultimoDiaConfirmado.day_of_week;
            this.periodStartDate = ultimoDiaConfirmado.period_start_date;
            this.periodEndDate = ultimoDiaConfirmado.period_end_date;
            this.currentSemana = ultimoDiaConfirmado.work_week;
            this.currentPeriodId = ultimoDiaConfirmado.period_id;
    
            // Generar los días del periodo
            this.generarDiasDelPeriodo(this.periodStartDate, this.periodEndDate);
          } else {
            // Si no hay días confirmados, mostrar que no hay días disponibles
            console.log('No hay días pendientes ni confirmados.'); // Mostrar si no hay días disponibles
            this.noDaysAvailable = true;
            this.limpiarVista();
          }
        }
      } else {
        // Si no hay días en absoluto, mostrar que no hay días disponibles
        console.log('No hay días disponibles en absoluto.'); // Mostrar si no hay días en absoluto
        this.noDaysAvailable = true;
        this.limpiarVista();
      }
    }

    limpiarVista() {
      this.currentFechaDias = [];
      this.currentFecha = '';
      this.periodStartDate = '';
      this.periodEndDate = '';
      this.diasDelPeriodo = [];
      this.currentSemana = '';
      this.currentPeriodId = '';
    }
  

      // Función para generar los días entre el rango del periodo
  generarDiasDelPeriodo(startDate: string, endDate: string) {
    const start = moment(startDate);
    const end = moment(endDate);
    const dias = [];

    while (start.isSameOrBefore(end)) {
      // Inicializa cada día como pendiente
      const date = start.format('YYYY-MM-DD');
      dias.push({
        date: date,
        status: this.obtenerStatusDelDia(date), // Asignar el estado (Confirmado o Pendiente)
      });
      start.add(1, 'days');
    }

    this.diasDelPeriodo = dias;
    console.log('Días del periodo:', this.diasDelPeriodo);
  }


  
  obtenerStatusDelDia(date: string): string {
    // Busca el día que coincida con la fecha del periodo y esté confirmado
    const diaEncontrado = this.diasPendientes.find(dia => {
      console.log('Comparando:', dia.day_of_week, 'con', date);
      return dia.day_of_week === date && dia.project_status.toLowerCase() === 'confirmed';
    });
    return diaEncontrado ? 'confirmed' : 'pending';
  }

  // Filtrar los días según el término de búsqueda
  filterRecords() {
    const searchTerm = this.searchTerm.toLowerCase();

    this.filteredDias = this.currentFechaDias.filter(dia => {
      const employeeCode = dia.employee_code ? dia.employee_code.toLowerCase() : '';
      const firstName = dia.first_name ? dia.first_name.toLowerCase() : '';
      const lastName = dia.last_name ? dia.last_name.toLowerCase() : '';
      const projectName = dia.project_name ? dia.project_name.toLowerCase() : '';
      const status = dia.project_status ? dia.project_status.toLowerCase() : '';

      return (
        employeeCode.includes(searchTerm) ||
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        projectName.includes(searchTerm) ||
        status.includes(searchTerm)
      );
    });
  }

  // Confirmar los días seleccionados
  confirmDay(payload: any) {
    // Mostrar el spinner
    this.spinnerService.load();
  
    // Enviar el payload al backend para confirmar el día
    this.httpClient.post('https://siinad.mx/php/confirm-day.php', payload).subscribe(
      (response: any) => {
        console.log('Día confirmado exitosamente', response);
  
        // Actualizar el estado de los días confirmados en el frontend
        if (response.success) {
          this.diasDelPeriodo.forEach(dia => {
            if (dia.date === payload.day_of_week) {
              dia.status = 'confirmed';
            }
          });
        }
  
        this.isButtonDisabled = true;
        this.loadDiasPendientes(); // Llamar a la función para cargar días pendientes
      },
      (error) => {
        console.error('Error al confirmar el día', error);
      },
      () => {
        // Ocultar el spinner después de completar la operación
        this.spinnerService.clear();
      }
    );
  }

 // Eliminar un día de la lista
 async eliminarDia(dia: any, event: Event) {
  event.stopPropagation(); // Detener la propagación del evento

  // Abrir el diálogo de confirmación
  const dialogRef = this.dialogService.open(DialogComponent, {
    context: {
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar el registro del empleado ${dia.first_name} ${dia.last_name}?`,
      buttons: [
        {
          text: 'Cancelar',
          action: 'cancel',  // Acción para cancelar
        },
        {
          text: 'Eliminar',
          action: 'confirm',  // Acción para confirmar
        },
      ],
    },
  });
  
  dialogRef.onClose.subscribe((action: string) => {
    if (action === 'confirm') {
      // Lógica para eliminar
    } else {
      console.log('Eliminación cancelada');
    }
  });
}
// Mostrar información del día al hacer clic
async mostrarInfoDia(dia: any) {
  // Abrir el diálogo de información del día
  const dialogRef = this.dialogService.open(DialogComponent, {
    context: {
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar el registro del empleado ${dia.first_name} ${dia.last_name}?`,
      buttons: [
        {
          text: 'Cancelar',
          action: 'cancel',
        },
        {
          text: 'Eliminar',
          action: 'confirm',
        },
      ],
    },
  });

  dialogRef.onClose.subscribe(() => {
    console.log('Dialog cerrado');
  });
}
  // Alternar confirmación de un día
  toggleConfirm(dia: any) {
    dia.confirmed = !dia.confirmed;
  }

  // Alternar selección de todos los días
  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.filteredDias.forEach(dia => {
      dia.confirmed = this.selectAll;
    });
  }
  }
