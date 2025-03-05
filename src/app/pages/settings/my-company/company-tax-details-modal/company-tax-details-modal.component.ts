import { Component, Input } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';
@Component({
  selector: 'ngx-company-tax-details-modal',
  templateUrl: './company-tax-details-modal.component.html',
  styleUrls: ['./company-tax-details-modal.component.scss']
})
export class CompanyTaxDetailsModalComponent {

  @Input() data: any; // 

  constructor(protected ref: NbDialogRef<CompanyTaxDetailsModalComponent>){}

  close() {
    this.ref.close();
  }

  guardarDatos() {
    this.ref.close({ save: true }); // Devuelve { save: true } al cerrar el modal
  }
  
}
