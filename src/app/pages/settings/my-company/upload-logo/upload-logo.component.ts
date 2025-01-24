import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService, NbGlobalPhysicalPosition, NbComponentStatus } from '@nebular/theme';
import { LoadingController } from '@ionic/angular';

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
    private loadingController: LoadingController
  ) {}

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
        this.showToast('Error al cargar el logo actual.', 'danger');
      }
    );
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // Validar el tipo de archivo
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!validImageTypes.includes(file.type)) {
        this.showToast('Solo se permiten archivos de imagen compatibles (JPEG, PNG, WebP, GIF).', 'danger');
        return;
      }
  
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
              }
            },
            'image/webp',
            0.8 // Calidad de compresión óptima
          );
        };
      };
      reader.readAsDataURL(file);
    }
  }
  
  
  

 async uploadLogo() {
  const companyId = this.companyService.selectedCompany.id;

  if (!companyId || !this.selectedFile) {
    this.showToast('Seleccione un archivo para subir.', 'danger');
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
        this.currentLogo = `${response.logoUrl}?t=${new Date().getTime()}`;
        this.showToast(response.message, 'success');
        this.loadCurrentLogo(); // Recargar el logo actual
        this.previewLogo = null; // Limpiar la vista previa
        this.selectedFile = null; // Limpiar el archivo seleccionado
      } else {
        this.showToast(response.error, 'danger');
      }
      loading.dismiss();
    },
    (error) => {
      loading.dismiss();
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
