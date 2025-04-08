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

  // Nuevas propiedades para la segunda hora de comida
  enableSecondLunch: boolean = false;
  secondLunchStart: string;
  secondLunchEnd: string;

  constructor(private dialogRef: NbDialogRef<ChangeHoursModalComponent>) {}

  closeModal() {
    // Cierra el modal sin enviar datos
    this.dialogRef.close();
  }

  saveHours() {
    // Formatear los tiempos a 'HH:mm:ss'
    const formattedEntryTime = this.entryTime 
    ? moment(this.entryTime, 'HH:mm').format('HH:mm:ss') 
    : null;
  const formattedLunchStart = this.lunchStart 
    ? moment(this.lunchStart, 'HH:mm').format('HH:mm:ss') 
    : null;
  const formattedLunchEnd = this.lunchEnd 
    ? moment(this.lunchEnd, 'HH:mm').format('HH:mm:ss') 
    : null;
  const formattedExitTime = this.exitTime 
    ? moment(this.exitTime, 'HH:mm').format('HH:mm:ss') 
    : null;
  
    

    // Formatear la segunda hora de comida solo si está habilitada
    const formattedSecondLunchStart = this.enableSecondLunch && this.secondLunchStart 
      ? moment(this.secondLunchStart).format('HH:mm:ss') 
      : null;

    const formattedSecondLunchEnd = this.enableSecondLunch && this.secondLunchEnd 
      ? moment(this.secondLunchEnd).format('HH:mm:ss') 
      : null;

    // Envía los datos al componente que abre el modal junto con la lista de empleados
    this.dialogRef.close({
      employees: this.employees, // Devolver todos los empleados seleccionados
      entryTime: formattedEntryTime,
      lunchStart: formattedLunchStart,
      lunchEnd: formattedLunchEnd,
      exitTime: formattedExitTime,
      // Enviar los tiempos de la segunda hora de comida si están habilitados
      secondLunchStart: formattedSecondLunchStart,
      secondLunchEnd: formattedSecondLunchEnd,
    });
  }
}
