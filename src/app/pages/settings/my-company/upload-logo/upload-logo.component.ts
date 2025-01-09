// upload-logo.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService, NbGlobalPhysicalPosition, NbComponentStatus, NbDialogService } from '@nebular/theme';

@Component({
  selector: 'ngx-upload-logo',
  templateUrl: './upload-logo.component.html',
  styleUrls: ['./upload-logo.component.scss']
})
export class UploadLogoComponent implements OnInit {

  selectedFile: File | null = null;
  currentLogo: string = '';
  previewLogo: string | ArrayBuffer | null = null;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    public companyService: CompanyService,
    private toastrService: NbToastrService,
   
  ) {}

  ngOnInit() {
    this.loadCurrentLogo();
  }

  loadCurrentLogo() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get(`https://siinad.mx/php/getCompanyLogo.php?companyId=${companyId}`).subscribe(
      (response: any) => {
        this.currentLogo = response.logoUrl; // Ajusta según la estructura de tu respuesta
      },
      (error) => {
        console.error('Error al cargar el logo actual:', error);
        this.showToast('Error al cargar el logo actual.', 'danger');
      }
    );
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewLogo = e.target?.result || null;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadLogo() {
    const companyId = this.companyService.selectedCompany.id;

    if (!companyId || !this.selectedFile) {
      this.showToast('Seleccione un archivo para subir.', 'danger');
      return;
    }

  

    const formData = new FormData();
    formData.append('companyId', companyId);
    formData.append('logo', this.selectedFile);

    this.http.post('https://siinad.mx/php/uploadLogo.php', formData).subscribe(
      (response: any) => {
       
        if (response.success) {
          this.showToast(response.message, 'success');
          this.loadCurrentLogo(); // Recargar el logo actual
          this.previewLogo = null; // Limpiar la vista previa
          this.selectedFile = null; // Limpiar el archivo seleccionado
        } else {
          this.showToast(response.error, 'danger');
        }
      },
      (error) => {
      
        console.error('Error en la solicitud POST:', error);
        this.showToast('Error al subir el logo.', 'danger');
      }
    );
  }

  showToast(message: string, status: NbComponentStatus) {
    this.toastrService.show(
      message,
      '',
      {
        status: status,
        position: NbGlobalPhysicalPosition.TOP_RIGHT,
        duration: 5000,
      }
    );
  }

}
