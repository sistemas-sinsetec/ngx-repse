/*
  En este codigo se administran las secciones a las que tendra acceso cada empresa.
*/
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { LoadingController } from '@ionic/angular';
import { NbDialogService } from '@nebular/theme';
import { DeleteModalComponent } from '../delete-modal/delete-modal.component';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
import { environment } from '../../../../../environments/environment';
@Component({
  selector: 'ngx-company-permissions-sections',
  templateUrl: './company-permissions-sections.component.html',
  styleUrls: ['./company-permissions-sections.component.scss']
})
export class CompanyPermissionsSectionsComponent implements OnInit {

  selectedCompanyId: string;
  selectedSections: string[] = [];
  companies: any[] = [];
  sections: string[] = [
    'Sistema REPSE',
    'Control de proyectos',
    'Empleados',
    'Incidencias',
    'Costos',
    'Ventas',
    'Configuracion de mi empresa',
    'Configuracion de socios comerciales',
    'Configuracion de usuarios',
    'Configuracion de sitio'
  ];
  permissions: any[] = [];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastrService: CustomToastrService,
    private loadingController: LoadingController, // Inyectamos LoadingController
    private dialogService: NbDialogService,
  ) {}

  ngOnInit() {
    this.loadCompanies();
  }

  // Método para presentar el loading
  async presentLoading(message: string = 'Cargando...') {
    const loading = await this.loadingController.create({
      message: message
    });
    await loading.present();
    return loading; // Retornamos la instancia para poder cerrarla luego
  }

  async loadCompanies() {
    // Mostramos el loader
    const loading = await this.presentLoading('Cargando empresas...');

    this.http.get(`${environment.apiBaseUrl}/get-companies.php`).subscribe(
      (response: any) => {
        loading.dismiss(); // Cerramos el loader al recibir respuesta
        if (response) {
          this.companies = response;
        } else {
          console.error(response.error);
          this.toastrService.showError(response.error, 'error');
        }
      },
      (error) => {
        loading.dismiss(); // Cerramos el loader si hay error
        console.error('Error en la solicitud GET:', error);
        this.toastrService.showError('Error al cargar empresas.', 'danger');
      }
    );
  }

  onCompanyChange(newValue: string) {
    this.selectedCompanyId = newValue;
    this.loadPermissions();
  }

  onSectionChange(event: any) {
    // event puede ser un array de secciones seleccionadas en nb-select
    this.selectedSections = event;
  }

  async loadPermissions() {
    const data = { companyId: this.selectedCompanyId };
    // Mostramos el loader
    const loading = await this.presentLoading('Cargando permisos...');

    this.http.post(`${environment.apiBaseUrl}/loadCompanyPermissions.php`, data).subscribe(
      (response: any) => {
        loading.dismiss();
        if (response.success) {
          this.permissions = response.permissions;
        } else {
          console.error(response.error);
          this.toastrService.showError(response.error, 'error');
        }
      },
      (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        this.toastrService.showError('Error al cargar permisos.', 'error');
      }
    );
  }

  async addPermission() {
    const data = {
      companyId: this.selectedCompanyId,
      sections: this.selectedSections,
    };

    const loading = await this.presentLoading('Añadiendo permisos...');

    this.http.post(`${environment.apiBaseUrl}/addCompanyPermission.php`, data).subscribe(
      (response: any) => {
        loading.dismiss();
        if (response.success) {
          // Agregar permisos en local al array permissions
          this.selectedSections.forEach(section => {
            this.permissions.push({ NameSection: section });
          });
          // Podrías mostrar un toast de éxito aquí
          this.toastrService.showSuccess('Permisos añadidos correctamente.', 'Exito');
        } else {
          console.error(response.error);
          this.toastrService.showError(response.error, 'Error');
        }
      },
      (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        this.toastrService.showError('Error al añadir permiso.', 'Error');
      }
    );
  }

  async removePermission(NameSection: string) {
    this.dialogService.open(DeleteModalComponent, { 
      context: {
        title: 'Confirmación',
        message: `¿Estás seguro de que deseas eliminar el permiso "${NameSection}"?`
      }
    }).onClose.subscribe(async (confirmed: boolean) => {
      if (confirmed) { // ✅ Solo eliminar si el usuario confirma
        
        // 🔹 Definir `data` dentro del bloque correcto
        const data = {
          companyId: this.selectedCompanyId,
          section: NameSection,
        };
  
        const loading = await this.presentLoading('Eliminando permiso...');
  
        this.http.post(`${environment.apiBaseUrl}/removeCompanyPermission.php`, data).subscribe(
          (response: any) => {
            loading.dismiss();
            if (response.success) {
              this.permissions = this.permissions.filter(p => p.NameSection !== NameSection);
              this.toastrService.showSuccess('Permiso eliminado correctamente.', 'success');
            } else {
              this.toastrService.showError(response.error, 'danger');
            }
          },
          (error) => {
            loading.dismiss();
            this.toastrService.showError('Error al eliminar permiso.', 'danger');
          }
        );
      }
    });

  }

}
