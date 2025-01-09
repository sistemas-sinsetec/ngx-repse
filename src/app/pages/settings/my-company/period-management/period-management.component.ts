import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { LocalDataSource } from 'ng2-smart-table';

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

  periodTypes: any[] = [];
  selectedYearPeriods: Period[] = [];
  selectedYear: number | null = null;
  selectedPeriod: Period | null = null;
  source: LocalDataSource = new LocalDataSource();

  // Configuración de la tabla
  settings = {
    actions: false, // Oculta las acciones predeterminadas
    columns: {
      period_number: {
        title: '# Semana',
        type: 'number',
      },
      start_date: {
        title: 'Fecha Inicio',
        type: 'string',
        valuePrepareFunction: (date) => {
          return new Date(date).toLocaleDateString('es-ES');
        },
      },
      end_date: {
        title: 'Fecha Fin',
        type: 'string',
        valuePrepareFunction: (date) => {
          return new Date(date).toLocaleDateString('es-ES');
        },
      },
      payment_date: {
        title: 'Días de Pago',
        type: 'string',
      },
    },
    hideSubHeader: true, // Oculta el filtro superior
    noDataMessage: 'No hay periodos disponibles',
    attr: {
      class: 'table table-bordered', // Clases personalizadas para estilizar la tabla
    },
  };

  // Formulario
  form: any = {
    numeroPeriodo: '',
    fechaInicio: '',
    fechaFin: '',
    ejercicio: '',
    mes: '',
    diasPago: '',
    inicioMes: true,
    finMes: false,
    inicioBimestreIMSS: true,
    finBimestreIMSS: false,
    inicioEjercicio: true,
    finEjercicio: false
  };

  constructor(private http: HttpClient, private authService: AuthService, private companyService: CompanyService) { }

  ngOnInit() {
    this.loadPeriodTypes();
  }

  // Cargar tipos de periodos
  loadPeriodTypes() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.post('https://siinad.mx/php/get-period-types.php', { companyId })
      .subscribe((response: any) => {
        this.periodTypes = response.periodTypes;
      }, error => {
        console.error('Error al cargar los tipos de periodos', error);
      });
  }

  // Seleccionar tipo de periodo
  selectPeriodType(tipo: any) {
    if (tipo.years && tipo.years.length > 0) {
      this.selectedYear = tipo.years[0];
      this.selectedYearPeriods = tipo.periods.filter((period: Period) => period.year === this.selectedYear);
      this.source.load(this.selectedYearPeriods); // Cargar en la tabla
    }
  }

  // Seleccionar año
  selectYear(year: number) {
    this.selectedYear = year;
    this.selectedYearPeriods = this.periodTypes.find(tipo => tipo.years.includes(year))
      .periods.filter((period: Period) => period.year === year);
    this.source.load(this.selectedYearPeriods); // Cargar en la tabla
  }

  // Seleccionar periodo desde la tabla
  onRowSelect(event: any) {
    const period: Period = event.data;
    this.selectedPeriod = period;

    // Actualiza el formulario con los datos del periodo seleccionado
    this.form = {
      numeroPeriodo: period.period_number,
      fechaInicio: period.start_date,
      fechaFin: period.end_date,
      ejercicio: period.year,
      mes: period.month,
      diasPago: period.payment_days,
      inicioMes: period.month_start,
      finMes: period.month_end,
      inicioBimestreIMSS: period.imss_bimonthly_start,
      finBimestreIMSS: period.imss_bimonthly_end,
      inicioEjercicio: period.fiscal_start,
      finEjercicio: period.fiscal_end
    };
  }

  // Guardar los cambios en el periodo
  guardarPeriodo() {
    const updatedPeriod: Period = {
      period_number: this.form.numeroPeriodo,
      start_date: this.form.fechaInicio,
      end_date: this.form.fechaFin,
      payment_date: this.form.diasPago,
      year: this.form.ejercicio,
      month: this.form.mes,
      imss_bimonthly_start: this.form.inicioBimestreIMSS,
      imss_bimonthly_end: this.form.finBimestreIMSS,
      month_start: this.form.inicioMes,
      month_end: this.form.finMes,
      fiscal_year: this.selectedPeriod?.fiscal_year || '',
      fiscal_start: this.form.inicioEjercicio,
      fiscal_end: this.form.finEjercicio,
      payment_days: this.form.diasPago
    };

    this.http.post('https://siinad.mx/php/update-period.php', updatedPeriod)
      .subscribe(response => {
        console.log('Periodo actualizado exitosamente', response);
        this.loadPeriodTypes(); // Actualiza los tipos de periodos
      }, error => {
        console.error('Error al actualizar el periodo', error);
      });
  }

  // Guardar todos los cambios
  guardarTodosLosPeriodos() {
    this.http.post('https://siinad.mx/php/save-all-periods.php', this.selectedYearPeriods)
      .subscribe(response => {
        console.log('Todos los periodos actualizados exitosamente', response);
        this.loadPeriodTypes();
      }, error => {
        console.error('Error al guardar todos los periodos', error);
      });
  }

  // Limpiar formulario
  limpiarFormulario() {
    this.form = {
      numeroPeriodo: '',
      fechaInicio: '',
      fechaFin: '',
      ejercicio: '',
      mes: '',
      diasPago: '',
      inicioMes: true,
      finMes: false,
      inicioBimestreIMSS: true,
      finBimestreIMSS: false,
      inicioEjercicio: true,
      finEjercicio: false
    };
    this.selectedPeriod = null;
  }
}
