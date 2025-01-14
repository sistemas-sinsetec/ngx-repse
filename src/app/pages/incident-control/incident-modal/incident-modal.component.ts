import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-incident-modal',
  templateUrl: './incident-modal.component.html',
  styleUrls: ['./incident-modal.component.scss']
})
export class IncidentModalComponent {
  @Input() incidentOptions: string[] = [];
  @Input() employees: any[] = []; // Manejar múltiples empleados
  selectedIncident: string = '';
  description: string = '';

  constructor(private dialogRef: NbDialogRef<IncidentModalComponent>) {}

  dismiss() {
    // Cierra el modal sin devolver datos
    this.dialogRef.close();
  }

  saveIncident() {
    // Devuelve los datos de la incidencia y la lista de empleados al cerrar el modal
    this.dialogRef.close({
      employees: this.employees, // Devolver todos los empleados seleccionados
      incident: this.selectedIncident,
      description: this.description,
    });
  }
}
