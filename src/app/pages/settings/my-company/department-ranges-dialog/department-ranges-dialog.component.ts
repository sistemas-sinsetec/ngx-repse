import { Component, Inject } from '@angular/core';
import { NbDialogRef, NB_DIALOG_CONFIG } from '@nebular/theme';

@Component({
  selector: 'ngx-department-ranges-dialog',
  template: `
    <nb-card>
      <nb-card-header>{{ title }}</nb-card-header>
      <nb-card-body>
        <p>{{ message }}</p>
      </nb-card-body>
      <nb-card-footer style="text-align: right;">
        <button nbButton status="danger" (click)="cancel()">Cancelar</button>
        <button nbButton status="success" (click)="confirm()">Confirmar</button>
      </nb-card-footer>
    </nb-card>
  `,
  styleUrls: ['./department-ranges-dialog.component.scss']
})
export class DepartmentRangesDialogComponent {
  title: string = 'Confirmación';
  message: string = '¿Estás seguro de realizar esta acción?';

  constructor(private dialogRef: NbDialogRef<DepartmentRangesDialogComponent>) {}

  confirm() {
    this.dialogRef.close(true); // 
  }

  cancel() {
    this.dialogRef.close(false); // 
  }
}
