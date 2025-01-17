import { Component } from '@angular/core';
import { NbDialogService, NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-cp-auth-modal',
  templateUrl: './cp-auth-modal.component.html',
  styleUrls: ['./cp-auth-modal.component.scss']
})
export class CpAuthModalComponent {
  continuarRegistro: boolean;

  constructor(
    private dialogService: NbDialogService,
    private dialogRef: NbDialogRef<CpAuthModalComponent>,
  ) {}

  cerrarModal(continuar: boolean) {
    this.dialogRef.close({ continuarRegistro: continuar });
  }
}
