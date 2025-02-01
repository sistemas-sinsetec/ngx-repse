import { Component, OnInit } from '@angular/core';
import { KardexService } from '../../../services/kardex.service';
import { CompanyService } from '../../../services/company.service';
import { NbToastrService } from '@nebular/theme';
import { NbButtonModule } from '@nebular/theme';
@Component({
  selector: 'ngx-vacations-kardex',
  templateUrl: './vacations-kardex.component.html',
  styleUrls: ['./vacations-kardex.component.scss']
})
export class VacationsKardexComponent {
  empleados: any[] = [];
  empleadoId: string = '';
  vacacionesAlta: number = 0;
  vacaciones: any[] = [];

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
        console.log('Empleados recibidos:', data); // Verifica qué datos llegan
        this.empleados = data.map((emp: any) => ({
          employee_id: emp.employee_id,
          full_name: emp.full_name || 'Empleado sin nombre',
        }));
      },
      (error) => {
        this.toastrService.danger('Error al cargar empleados', 'Error');
      }
    );
  }

  generarReporte(): void {
    if (!this.empleadoId) {
      this.toastrService.warning('Selecciona un empleado', 'Atención');
      return;
    }
  
    this.kardexService.getKardex(this.empleadoId).subscribe(
      (data) => {
        console.log('Respuesta del backend:', data);
        this.vacaciones = Array.isArray(data?.Vacaciones) ? data.Vacaciones : [];
  
        const vacacionesAlta = this.vacaciones.find(v => v.Concepto === "Vacaciones tomadas antes de la alta") || null;
        this.vacacionesAlta = vacacionesAlta ? vacacionesAlta.Tomadas : 0;
      },
      (error) => {
        this.toastrService.danger('Error al generar el reporte', 'Error');
      }
    );
  }
  

  actualizarVacacionesAlta(): void {
    if (!this.empleadoId) {
      this.toastrService.warning('Selecciona un empleado', 'Atención');
      return;
    }

    this.kardexService.actualizarVacaciones(this.empleadoId, this.vacacionesAlta).subscribe(
      (data) => {
        this.toastrService.success('Vacaciones actualizadas', 'Éxito');
        this.generarReporte();
      },
      (error) => {
        this.toastrService.danger('Error al actualizar vacaciones', 'Error');
      }
    );
  }

}
