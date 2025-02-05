import { Component, OnInit } from '@angular/core';
import { KardexService } from '../../../services/kardex.service';
import { CompanyService } from '../../../services/company.service';
import { NbToastrService } from '@nebular/theme';

interface VacationRecord {
  Concepto: string;
  FechaRegistro?: string;
  FechaInicio?: string;
  FechaFin?: string;
  Tomadas?: number;
  DiasVacaciones?: number;
  Saldo?: number;
  DetalleTomados?: Array<{
    FechaInicio: string;
    FechaFin: string;
    DiasTomados: number;
  }>;
}

@Component({
  selector: 'ngx-vacations-kardex',
  templateUrl: './vacations-kardex.component.html',
  styleUrls: ['./vacations-kardex.component.scss'],
})
export class VacationsKardexComponent implements OnInit {
  empleados: any[] = [];
  selectedEmployee: string = '';
  vacacionesAlta: number = 0;
  data: VacationRecord[] = []; // Inicializamos como un array vacío
  expandedRows: boolean[] = []; // Inicializamos como un array vacío

  constructor(
    private kardexService: KardexService,
    private companyService: CompanyService,
    private toastrService: NbToastrService
  ) {}

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados(): void {
    const companyId = this.companyService.selectedCompany.id;
    this.kardexService.getEmpleados(companyId).subscribe(
      (data) => {
        this.empleados = data.map((emp: any) => ({
          IDEmpleado: emp.employee_id,
          NombreCompleto: emp.full_name || 'Empleado sin nombre',
        }));
      },
      () => {
        this.toastrService.danger('Error al cargar empleados', 'Error');
      }
    );
  }

  generarReporte(): void {
    if (!this.selectedEmployee) {
      this.toastrService.warning('Selecciona un empleado', 'Atención');
      return;
    }

    this.kardexService.getKardex(this.selectedEmployee).subscribe(
      (data) => {
        // Aseguramos que `data.Vacaciones` sea un array antes de asignarlo
        this.data = Array.isArray(data.Vacaciones) ? data.Vacaciones : [];
        // Inicializamos `expandedRows` para coincidir con el número de filas
        this.expandedRows = new Array(this.data.length).fill(false);
      },
      () => {
        this.toastrService.danger('Error al generar el reporte', 'Error');
      }
    );
  }

  toggleRow(index: number): void {
    if (this.expandedRows && index < this.expandedRows.length) {
      this.expandedRows[index] = !this.expandedRows[index];
    }
  }

  actualizarVacacionesAlta(): void {
    if (!this.selectedEmployee) {
      this.toastrService.warning('Selecciona un empleado', 'Atención');
      return;
    }

    this.kardexService.actualizarVacaciones(this.selectedEmployee, this.vacacionesAlta).subscribe(
      () => {
        this.toastrService.success('Vacaciones actualizadas', 'Éxito');
        this.generarReporte();
      },
      () => {
        this.toastrService.danger('Error al actualizar vacaciones', 'Error');
      }
    );
  }
}
