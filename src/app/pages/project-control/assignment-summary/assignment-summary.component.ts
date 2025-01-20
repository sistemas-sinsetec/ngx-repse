import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';


@Component({
  selector: 'ngx-assignment-summary',
  templateUrl: './assignment-summary.component.html',
  styleUrls: ['./assignment-summary.component.scss']
})
export class AssignmentSummaryComponent {
  @Input() selectedSemana: any;
  @Input() selectedDia: string;
  @Input() selectedObra: any;
  @Input() selectedEmpleados: any[];
  @Input() authService: any;

  constructor(
    private dialogRef: NbDialogRef<AssignmentSummaryComponent>, // Inyección de NbDialogRef
  ) {}

  closeModal() {
    this.dialogRef.close();
  }

  confirmAssignment() {
    this.dialogRef.close({ confirmed: true });
  }

}
