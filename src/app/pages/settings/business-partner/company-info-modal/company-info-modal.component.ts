import { Component, Input } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { NbDialogRef } from '@nebular/theme';
import { CompanyService } from '../../../../services/company.service';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ngx-company-info-modal',
  templateUrl: './company-info-modal.component.html',
  styleUrls: ['./company-info-modal.component.scss'],
})
export class CompanyInfoModalComponent {
  @Input() companyData: any; // Recibe la información de la empresa y el representante principal
  selectedRole: string = ''; // Variable para almacenar el rol seleccionado

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastrService: CustomToastrService,
    private dialogRef: NbDialogRef<CompanyInfoModalComponent>,
    private companyService: CompanyService
  ) {}

  dismiss() {
    this.dialogRef.close(); // Cierra el modal
  }

  addSocioComercialAssociation() {
    // Verificar si existe companyData
    if (this.companyData) {
      const data = {
        userId: this.authService.userId,
        empresa: this.companyService.selectedCompany.id, // ID de la empresa actual
        empresaSocio: this.companyData.company_id, // ID de la empresa asociada
        role: this.selectedRole, // Rol seleccionado para la asociación
      };

      this.http.post(`${environment.apiBaseUrl}/associationCompanies.php`, data).subscribe(
        (response: any) => {
          if (response.success) {
            this.toastrService.showSuccess(response.message, 'Exito');
            this.dialogRef.close({ success: true }); // Cierra el modal con un valor de éxito
          } else {
            this.toastrService.showError(response.message, 'Error');
          }
        },
        (error: any) => {
          console.error('Error al realizar la solicitud:', error);
          this.toastrService.showError('Ocurrió un error al realizar la solicitud.', 'danger');
        }
      );
    } else {
      this.toastrService.showError('No se encontraron datos de la empresa.', 'danger');
    }
  }
}
