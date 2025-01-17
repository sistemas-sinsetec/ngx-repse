import { Component, Input } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { NbToastrService, NbDialogRef } from '@nebular/theme';
import { CompanyService } from '../../../../services/company.service';

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
    private toastrService: NbToastrService,
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

      this.http.post('https://siinad.mx/php/associationCompanies.php', data).subscribe(
        (response: any) => {
          if (response.success) {
            this.mostrarToast(response.message, 'success');
            this.dialogRef.close({ success: true }); // Cierra el modal con un valor de éxito
          } else {
            this.mostrarToast(response.message, 'danger');
          }
        },
        (error: any) => {
          console.error('Error al realizar la solicitud:', error);
          this.mostrarToast('Ocurrió un error al realizar la solicitud.', 'danger');
        }
      );
    } else {
      this.mostrarToast('No se encontraron datos de la empresa.', 'danger');
    }
  }

  mostrarToast(mensaje: string, status: 'success' | 'danger' | 'warning') {
    this.toastrService.show(mensaje, 'Notificación', { status });
  }
}
