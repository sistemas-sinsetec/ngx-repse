import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';


@Component({
  selector: 'ngx-cp-auth-modal-delete',
  templateUrl: './cp-auth-modal-delete.component.html',
  styleUrls: ['./cp-auth-modal-delete.component.scss']
})
export class CpAuthModalDeleteComponent {
  @Input() mostrarMotivoRechazo: boolean;
  @Input() confirmarRechazoSocio: Function; // Definir la entrada para la función confirmarRechazoSocio
  @Output() motivoRechazoConfirmado = new EventEmitter<string>();

  continuarRegistro: boolean;

  motivo: string = '';

  constructor(private dialogRef: NbDialogRef<CpAuthModalDeleteComponent>) { }

  confirmarRechazo() {
    console.log('Se confirmó el rechazo con motivo:', this.motivo);
    // Emitir el motivo y cerrar el diálogo
    this.motivoRechazoConfirmado.emit(this.motivo);
    this.dialogRef.close(this.motivo); // Enviar el motivo al cerrar el modal
  }

  cancelar() {
    console.log('Se canceló el rechazo');
    this.dialogRef.close(null); // Cerrar el diálogo sin motivo
  }
}
