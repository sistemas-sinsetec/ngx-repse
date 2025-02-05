import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { LoadingController } from '@ionic/angular'; // Importar LoadingController de Ionic
import { NbToastrService } from '@nebular/theme'; // Importar NbToastrService de Nebular
import { LocalDataSource } from 'ng2-smart-table'; // Importar LocalDataSource para ng2-smart-table

interface Period {
  period_number: number;
  start_date: string;
  end_date: string;
  payment_date: string;
  year: number;
  month: number;
  imss_bimonthly_start: boolean;
  imss_bimonthly_end: boolean;
  month_start: boolean;
  month_end: boolean;
  fiscal_year: string;
  fiscal_start: boolean;
  fiscal_end: boolean;
  payment_days: number;
}

@Component({
  selector: 'ngx-period-management',
  templateUrl: './period-management.component.html',
  styleUrls: ['./period-management.component.scss']
})
export class PeriodManagementComponent implements OnInit {
  periods: any[] = [];  // Array para almacenar los periodos cargados desde la base de datos
  selectedPeriod: any = {};  // Objeto para almacenar el periodo seleccionado o nuevo
  tableSource: LocalDataSource = new LocalDataSource(); // Fuente de datos para la tabla

  // Configuración de la tabla
  settings = {
    actions: false,
    columns: {
      period_number: {
        title: '# Semana',
        type: 'number',
        compareFunction: (direction: any, a: number, b: number) => {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        },
      },
      start_date: {
        title: 'Fecha Inicio',
        type: 'string',
        valuePrepareFunction: (date: string) => {
          const formattedDate = new Date(date + 'T00:00:00');
          const day = formattedDate.getDate().toString().padStart(2, '0');
          const month = (formattedDate.getMonth() + 1).toString().padStart(2, '0');
          const year = formattedDate.getFullYear();
          return `${day}-${month}-${year}`;
        },
      },
      end_date: {
        title: 'Fecha Fin',
        type: 'string',
        valuePrepareFunction: (date: string) => {
          const formattedDate = new Date(date + 'T00:00:00');
          const day = formattedDate.getDate().toString().padStart(2, '0');
          const month = (formattedDate.getMonth() + 1).toString().padStart(2, '0');
          const year = formattedDate.getFullYear();
          return `${day}-${month}-${year}`;
        },
      },
      payment_date: {
        title: 'Días de Pago',
        type: 'string',
      },
    },
    hideSubHeader: true,
    noDataMessage: 'No hay periodos disponibles',
    attr: {
      class: 'table table-bordered',
    },
    // Agregar el evento para manejar la selección de filas
    selectMode: 'single', // Permitir selección de una sola fila
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private loadingController: LoadingController, // Inyectar LoadingController
    private toastrService: NbToastrService // Inyectar NbToastrService
  ) { }

  ngOnInit() {
    this.loadPeriods(); // Cargar la lista de periodos al iniciar
  }


  // Método para manejar la selección de una fila en la tabla
  onRowSelect(event: any) {
    const selectedRow = event.data; // Obtener los datos de la fila seleccionada
    this.selectedPeriod = {
      period_type_id: selectedRow.period_type_id, // Asegúrate de que esta propiedad esté presente
      period_type_name: selectedRow.period_type_name, // Asignar el nombre del periodo
      period_id: selectedRow.period_id,
      period_number: selectedRow.period_number,
      start_date: selectedRow.start_date,
      end_date: selectedRow.end_date,
      payment_date: selectedRow.payment_date,
      fiscal_year: selectedRow.fiscal_year,
      month: selectedRow.month,
      imss_bimonthly_start: selectedRow.imss_bimonthly_start === 1, // Convertir a booleano
      imss_bimonthly_end: selectedRow.imss_bimonthly_end === 1, // Convertir a booleano
      month_start: selectedRow.month_start === 1, // Convertir a booleano
      month_end: selectedRow.month_end === 1, // Convertir a booleano
      fiscal_start: selectedRow.fiscal_start === 1, // Convertir a booleano
      fiscal_end: selectedRow.fiscal_end === 1, // Convertir a booleano
      payment_days: selectedRow.payment_days,
    };
    console.log('Fila seleccionada:', this.selectedPeriod); // Depuración
  }

  // Cargar la lista de periodos
  async loadPeriods() {
    const loading = await this.loadingController.create({
      message: 'Cargando periodos...'
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    this.http.get(`https://siinad.mx/php/get-periods.php?company_id=${companyId}`)
      .subscribe((response: any) => {
        this.periods = response;
        loading.dismiss(); // Ocultar el spinner de carga
      }, error => {
        console.error('Error al cargar los periodos', error);
        loading.dismiss(); // Ocultar el spinner de carga en caso de error
        this.toastrService.danger('Error al cargar los periodos', 'Error'); // Mostrar un toast de error
      });
  }

  // Seleccionar un periodo de la lista
  selectPeriod(period: any) {
    this.selectedPeriod = { ...period }; // Copiar el periodo seleccionado
    this.loadPayrollPeriods(period.period_type_id); // Cargar las semanas del periodo
  }

  // Cargar las semanas del periodo seleccionado
  async loadPayrollPeriods(periodTypeId: number) {
    const loading = await this.loadingController.create({
      message: 'Cargando semanas del periodo...',
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    this.http
      .get(`https://siinad.mx/php/get-payroll-periods.php?company_id=${companyId}&period_type_id=${periodTypeId}`)
      .subscribe(
        (response: any) => {
          this.tableSource.load(response); // Cargar los datos en la tabla
          loading.dismiss();
        },
        (error) => {
          console.error('Error al cargar las semanas del periodo', error);
          loading.dismiss();
          this.toastrService.danger('Error al cargar las semanas del periodo', 'Error');
        }
      );
  }

  // Crear un nuevo periodo
  createNewPeriod() {
    this.selectedPeriod = {
      period_type_name: '',
      period_days: null,
      payment_days: null,
      work_period: null,
      adjust_calendar_periods: null,
      rest_days_position: [],
      payroll_position: null,
      fiscal_year_start: '',
      payment_frequency: '',
      totalPeriods: null,
      custom_period_length: null,
      custom_period_type: '',
    };
  }

  // Guardar los detalles del periodo
  async guardarPeriodo() {
    const loading = await this.loadingController.create({
      message: 'Guardando periodo...'
    });
    await loading.present();
  
    const periodData = { 
      ...this.selectedPeriod, 
      company_id: this.companyService.selectedCompany.id 
    };
  
    console.log('Datos enviados al backend:', periodData); // Verifica los datos
  
    if (this.selectedPeriod.period_id) {
      this.http.post('https://siinad.mx/php/update-period.php', periodData)
        .subscribe(response => {
          console.log('Periodo actualizado correctamente', response);
          loading.dismiss();
          this.toastrService.success('Periodo actualizado correctamente', 'Éxito');
  
          // Recargar los períodos y las semanas del período actualizado
          this.loadPeriods(); // Recargar la lista de períodos
          this.loadPayrollPeriods(this.selectedPeriod.period_type_id); // Recargar las semanas del período actualizado
        }, error => {
          console.error('Error al actualizar el periodo', error);
          loading.dismiss();
          this.toastrService.danger('Error al actualizar el periodo', 'Error');
        });
    } 
  }
}