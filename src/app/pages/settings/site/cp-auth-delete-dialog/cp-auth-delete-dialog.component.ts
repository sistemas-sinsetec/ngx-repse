import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-cp-auth-delete-dialog',
  templateUrl: './cp-auth-delete-dialog.component.html',
  styleUrls: ['./cp-auth-delete-dialog.component.scss']
})
export class CpAuthDeleteDialogComponent {
  @Input() continuarRegistro: boolean = false; // Declarar la propiedad como Input
  @Input() mostrarMotivoRechazo: boolean = false; // Si aún no está declarada
  @Input() confirmarRechazoSocio: (motivo: string) => void;


  motivo: string = '';

  constructor(private dialogRef: NbDialogRef<CpAuthDeleteDialogComponent>) {}

  /**
   * Confirma el rechazo y emite el motivo.
   */
  confirmarRechazo() {
    console.log('Se confirmó el rechazo con motivo:', this.motivo);
    this.confirmarRechazoSocio(this.motivo); // Llamar a la función pasada como input
    this.cerrarModal();
  }

  /**
   * Cancela el rechazo y cierra el modal.
   */
  cancelar() {
    console.log('Se canceló el rechazo');
    this.cerrarModal();
  }

  /**
   * Cierra el modal.
   */
  cerrarModal() {
    console.log('Cerrando modal');
    this.dialogRef.close();
  }
}