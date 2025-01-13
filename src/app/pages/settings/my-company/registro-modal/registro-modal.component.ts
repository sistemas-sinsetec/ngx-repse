import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-registro-modal',
  templateUrl: './registro-modal.component.html',
  styleUrls: ['./registro-modal.component.scss']
})
export class RegistroModalComponent {
  @Input() labelRegistarOtroUsuario: string = '¿Registrar otro usuario?';
  @Input() labelSi: string = 'Sí';
  @Input() labelNoHome: string = 'No, volver a inicio'; 
  @Input() continuarRegistro: boolean;

  constructor(private dialogRef: NbDialogRef<RegistroModalComponent>) { }

  cerrarModal(continuar: boolean) {
    this.dialogRef.close({ continuarRegistro: continuar });
  }
}
