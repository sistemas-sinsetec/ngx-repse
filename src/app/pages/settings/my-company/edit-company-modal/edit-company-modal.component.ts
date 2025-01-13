import { Component, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbDialogService, NbToastrService, NbDialogRef } from '@nebular/theme';

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
    private toastrService: NbToastrService,
    private dialogRef: NbDialogRef<EditCompanyModalComponent>,
  ) {}

  cerrarModal() {
    this.dialogRef.close();
  }

  async guardarCambios() {
    this.http.post('https://siinad.mx/php/update-company.php', this.company).subscribe(
      async (response: any) => {
        if (response.message) {
          this.toastrService.success(response.message, 'Éxito', { duration: 3000 });
          this.dialogRef.close({ updatedCompany: this.company });
        } else {
          this.toastrService.danger(response.error, 'Error', { duration: 3000 });
        }
      },
      async (error) => {
        this.toastrService.danger('Error al actualizar los datos', 'Error', { duration: 3000 });
      }
    );
  }
  
}


