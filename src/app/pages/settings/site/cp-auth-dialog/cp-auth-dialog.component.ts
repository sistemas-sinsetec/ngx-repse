import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
@Component({
  selector: 'ngx-cp-auth-dialog',
  templateUrl: './cp-auth-dialog.component.html',
  styleUrls: ['./cp-auth-dialog.component.scss']
})
export class CpAuthDialogComponent {
  @Input() continuarConfirmarSocio: boolean;
  labelContinuarConfirmarSocio: string;
  labelSi: string;
  labelNoHome: string;

  constructor(
    private dialogRef: NbDialogRef<CpAuthDialogComponent>,

  ) {
    this.labelContinuarConfirmarSocio = "Confirmar socio comercial";
    this.labelSi = "Si";
    this.labelNoHome = "No";
  }

  /**
   * Cierra el modal y envía el valor seleccionado.
   * @param continuar Determina si se continúa con la acción.
   */
  cerrarModal(continuar: boolean) {
    this.dialogRef.close({ continuarRegistro: continuar });
  }
}
