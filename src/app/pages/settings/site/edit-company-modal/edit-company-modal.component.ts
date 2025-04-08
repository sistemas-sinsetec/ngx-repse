import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbDialogService, NbDialogRef } from '@nebular/theme';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

@Component({
  selector: 'ngx-edit-company-modal',
  templateUrl: './edit-company-modal.component.html',
  styleUrls: ['./edit-company-modal.component.scss']
})
export class EditCompanyModalComponent {
  @Input() company: any;

  constructor(
    private dialogService: NbDialogService,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    private dialogRef: NbDialogRef<EditCompanyModalComponent>,
  ) {}

  cerrarModal() {
    this.dialogRef.close();
  }

  async guardarCambios() {
    this.http.post('https://siinad.mx/php/update-company.php', this.company).subscribe(
      async (response: any) => {
        if (response.message) {
          this.toastrService.showSuccess(response.message, 'Éxito');
          this.dialogRef.close({ updatedCompany: this.company });
        } else {
          this.toastrService.showError(response.error, 'Error');
        }
      },
      async (error) => {
        this.toastrService.showError('Error al actualizar los datos', 'Error');
      }
    );
  }
  
}


