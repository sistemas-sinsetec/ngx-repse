import { Component, Input } from '@angular/core';
import { NbDialogService, NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-registro-modal',
  templateUrl: './registro-modal.component.html',
  styleUrls: ['./registro-modal.component.scss']
})
export class RegistroModalComponent {
  @Input() continuarRegistro: boolean;

  constructor(
    private dialogService: NbDialogService,
    private dialogRef: NbDialogRef<RegistroModalComponent>,
  ) { }

  cerrarModal(continuar: boolean) {
    this.dialogRef.close({ continuarRegistro: continuar });
  }
}
