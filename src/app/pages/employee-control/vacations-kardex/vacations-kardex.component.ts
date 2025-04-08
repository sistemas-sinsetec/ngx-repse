/*
  En este codigo se traen datos referentes a las vacaciones de los empleados
*/
import { Component, OnInit } from '@angular/core';
import { KardexService } from '../../../services/kardex.service';
import { CompanyService } from '../../../services/company.service';
import { CustomToastrService } from '../../../services/custom-toastr.service';

interface Vacacion {
  Concepto: string;
  FechaRegistro?: string;
  DiasVacaciones?: number;
  Tomadas?: number;
  Saldo?: number;
  DetalleTomados?: DetalleTomado[];
  expanded?: boolean; // Propiedad para controlar si la fila está expandida
}

interface DetalleTomado {
  FechaInicio: string;
  FechaFin: string;
  DiasTomados: number;
}

@Component({
  selector: 'ngx-vacations-kardex',
  templateUrl: './vacations-kardex.component.html',
  styleUrls: ['./vacations-kardex.component.scss']
})
export class VacationsKardexComponent implements OnInit {
  empleados: any[] = [];
  empleadoId: string = '';
  vacacionesAlta: number = 0;
  vacaciones: Vacacion[] = [];

  constructor(
    private kardexService: KardexService,
    private companyService: CompanyService,
    private toastrService: CustomToastrService
  ) {}

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados(): void {
    const companyId = this.companyService.selectedCompany.id;
    this.kardexService.getEmpleados(companyId).subscribe(
      (data) => {
        this.empleados = data.map((emp: any) => ({
          employee_id: emp.employee_id,
          full_name: emp.full_name || 'Empleado sin nombre',
        }));
      },
      (error) => {
        this.toastrService.showError('Error al cargar empleados', 'Error');
      }
    );
  }

  generarReporte(): void {
    if (!this.empleadoId) {
      this.toastrService.showWarning('Selecciona un empleado', 'Atención');
      return;
    }

    this.kardexService.getKardex(this.empleadoId).subscribe(
      (data) => {
        console.log('Respuesta del backend:', data);

        // Transformar los datos para la tabla
        this.vacaciones = data.Vacaciones.map((vacacion: Vacacion) => ({
          ...vacacion,
          expanded: false, // Inicialmente, las filas no están expandidas
        }));

        // Actualizar vacaciones antes de la alta
        const vacacionesAlta = data.Vacaciones.find((v: Vacacion) => v.Concepto === "Vacaciones tomadas antes de la alta");
        this.vacacionesAlta = vacacionesAlta ? vacacionesAlta.Tomadas : 0;
      },
      (error) => {
        this.toastrService.showError('Error al generar el reporte', 'Error');
      }
    );
  }

  toggleDetalle(vacacion: Vacacion): void {
    vacacion.expanded = !vacacion.expanded; // Alternar estado de expansión
  }

  actualizarVacacionesAlta(): void {
    if (!this.empleadoId) {
      this.toastrService.showWarning('Selecciona un empleado', 'Atención');
      return;
    }

    this.kardexService.actualizarVacaciones(this.empleadoId, this.vacacionesAlta).subscribe(
      (data) => {
        this.toastrService.showSuccess('Vacaciones actualizadas', 'Éxito');
        this.generarReporte();
      },
      (error) => {
        this.toastrService.showError('Error al actualizar vacaciones', 'Error');
      }
    );
  }
}