import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
import * as moment from 'moment'; // Importar moment.js para manejar fechas y tiempos

@Component({
  selector: 'ngx-change-hours-modal',
  templateUrl: './change-hours-modal.component.html',
  styleUrls: ['./change-hours-modal.component.scss']
})
export class ChangeHoursModalComponent {
  @Input() employees: any[] = []; // Array de empleados seleccionados

  entryTime: string;
  lunchStart: string;
  lunchEnd: string;
  exitTime: string;

  constructor(private dialogRef: NbDialogRef<ChangeHoursModalComponent>) {}

  closeModal() {
    // Cierra el modal sin enviar datos
    this.dialogRef.close();
  }

  saveHours() {
    // Formatear los tiempos a 'HH:mm:ss'
    const formattedEntryTime = moment(this.entryTime, 'HH:mm').format('HH:mm:ss');
    const formattedLunchStart = moment(this.lunchStart, 'HH:mm').format('HH:mm:ss');
    const formattedLunchEnd = moment(this.lunchEnd, 'HH:mm').format('HH:mm:ss');
    const formattedExitTime = moment(this.exitTime, 'HH:mm').format('HH:mm:ss');

    // Envía los datos al componente que abrió el modal
    this.dialogRef.close({
      employees: this.employees, // Devolver todos los empleados seleccionados
      entryTime: formattedEntryTime,
      lunchStart: formattedLunchStart,
      lunchEnd: formattedLunchEnd,
      exitTime: formattedExitTime,
    });
  }
}
