import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbGlobalPhysicalPosition, NbComponentStatus } from '@nebular/theme';
import { LoadingController } from '@ionic/angular';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

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
    private toastrService: CustomToastrService,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.loadCurrentLogo();
  }

  async loadCurrentLogo() {
    const loading = await this.loadingController.create({
      message: 'Cargando logo actual...',
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    this.http.get(`https://siinad.mx/php/getCompanyLogo.php?companyId=${companyId}`).subscribe(
      (response: any) => {
        this.currentLogo = response.logoUrl; // Ajusta según la estructura de tu respuesta
        loading.dismiss();
      },
      (error) => {
        console.error('Error al cargar el logo actual:', error);
        loading.dismiss();
        this.toastrService.showError('Error al cargar el logo actual.', 'danger');
      }
    );
  }

  async onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // Validar el tipo de archivo
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validImageTypes.includes(file.type)) {
        this.toastrService.showError('Solo se permiten archivos de imagen compatibles (JPEG, PNG, WebP, GIF).', 'danger');
        return;
      }

      // Mostrar el loading mientras se procesa la imagen
      const loading = await this.loadingController.create({
        message: 'Procesando imagen...',
      });
      await loading.present();

      // Leer y procesar la imagen seleccionada
      const reader = new FileReader();
      reader.onload = async (e) => {
        const image = new Image();
        image.src = e.target?.result as string;

        image.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          const maxWidth = 500; // Ancho deseado
          const scaleFactor = maxWidth / image.width;
          canvas.width = maxWidth;
          canvas.height = image.height * scaleFactor;

          ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

          // Convertir a .webp
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Quitar la extensión anterior del nombre del archivo
                const fileNameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
                const newFileName = `${fileNameWithoutExtension}.webp`;

                this.selectedFile = new File([blob], newFileName, { type: 'image/webp' });
                this.previewLogo = URL.createObjectURL(blob); // Vista previa

                // Ocultar el loading una vez que la imagen esté lista
                loading.dismiss();
              }
            },
            'image/webp',
            0.8 // Calidad de compresión óptima
          );
        };
      };
      reader.readAsDataURL(file);

      // Restablecer el valor del input para permitir la selección del mismo archivo nuevamente
      event.target.value = '';
    }
  }




  // upload-logo.component.ts
  async uploadLogo() {
    const companyId = this.companyService.selectedCompany.id;
  
    if (!companyId || !this.selectedFile) {
      this.toastrService.showError('Seleccione un archivo para subir.', 'danger');
      return;
    }
  
    const loading = await this.loadingController.create({
      message: 'Subiendo logo...',
    });
    await loading.present();
  
    const formData = new FormData();
    formData.append('companyId', companyId);
    formData.append('logo', this.selectedFile);
    formData.append('currentLogo', this.currentLogo); // Enviar el logo actual al backend
  
    this.http.post('https://siinad.mx/php/uploadLogo.php', formData).subscribe(
      (response: any) => {
        if (response.success) {
          // Actualizar el logo en el servicio y en el almacenamiento local
          this.companyService.updateLogo(response.logoUrl);
  
          // Actualizar el logo en el componente
          this.currentLogo = response.logoUrl;
  
          // Mostrar mensaje de éxito
          this.toastrService.showSuccess(response.message, 'Exito');
  
          // Limpiar la vista previa y el archivo seleccionado
          this.previewLogo = null;
          this.selectedFile = null;
        } else {
          this.toastrService.showError(response.error, 'error');
        }
        loading.dismiss();
      },
      (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        this.toastrService.showError('Error al subir el logo.', 'error');
      }
    );
  }

}
