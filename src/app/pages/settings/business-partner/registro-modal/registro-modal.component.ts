import { Component, Input } from '@angular/core';
import { NbDialogService, NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-registro-modal',
  templateUrl: './registro-modal.component.html',
  styleUrls: ['./registro-modal.component.scss']
})
export class RegistroModalComponentP {
  @Input() continuarRegistro: boolean;

  constructor(
    private dialogService: NbDialogService,
    private dialogRef: NbDialogRef<RegistroModalComponentP>,
  ) { }

  cerrarModal(continuar: boolean) {
    this.dialogRef.close({ continuarRegistro: continuar });
  }
}
