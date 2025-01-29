import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { NbToastrService } from '@nebular/theme';
import { LoadingController } from '@ionic/angular';

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
  ];
  permissions: any[] = [];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastrService: NbToastrService,
    private loadingController: LoadingController // Inyectamos LoadingController
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

    this.http.get('https://siinad.mx/php/get-companies.php').subscribe(
      (response: any) => {
        loading.dismiss(); // Cerramos el loader al recibir respuesta
        if (response) {
          this.companies = response;
        } else {
          console.error(response.error);
          this.mostrarToast(response.error, 'danger');
        }
      },
      (error) => {
        loading.dismiss(); // Cerramos el loader si hay error
        console.error('Error en la solicitud GET:', error);
        this.mostrarToast('Error al cargar empresas.', 'danger');
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

    this.http.post('https://siinad.mx/php/loadCompanyPermissions.php', data).subscribe(
      (response: any) => {
        loading.dismiss();
        if (response.success) {
          this.permissions = response.permissions;
        } else {
          console.error(response.error);
          this.mostrarToast(response.error, 'danger');
        }
      },
      (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        this.mostrarToast('Error al cargar permisos.', 'danger');
      }
    );
  }

  async addPermission() {
    const data = {
      companyId: this.selectedCompanyId,
      sections: this.selectedSections,
    };

    const loading = await this.presentLoading('Añadiendo permisos...');

    this.http.post('https://siinad.mx/php/addCompanyPermission.php', data).subscribe(
      (response: any) => {
        loading.dismiss();
        if (response.success) {
          // Agregar permisos en local al array permissions
          this.selectedSections.forEach(section => {
            this.permissions.push({ NameSection: section });
          });
          // Podrías mostrar un toast de éxito aquí
          this.mostrarToast('Permisos añadidos correctamente.', 'success');
        } else {
          console.error(response.error);
          this.mostrarToast(response.error, 'danger');
        }
      },
      (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        this.mostrarToast('Error al añadir permiso.', 'danger');
      }
    );
  }

  async removePermission(NameSection: string) {
    const data = {
      companyId: this.selectedCompanyId,
      section: NameSection,
    };

    const loading = await this.presentLoading('Eliminando permiso...');

    this.http.post('https://siinad.mx/php/removeCompanyPermission.php', data).subscribe(
      (response: any) => {
        loading.dismiss();
        if (response.success) {
          // Filtrar permisos localmente
          this.permissions = this.permissions.filter(p => p.NameSection !== NameSection);
          this.mostrarToast('Permiso eliminado correctamente.', 'success');
        } else {
          console.error(response.error);
          this.mostrarToast(response.error, 'danger');
        }
      },
      (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        this.mostrarToast('Error al eliminar permiso.', 'danger');
      }
    );
  }

  // Reemplaza la lógica de IonToast por NbToastrService
  mostrarToast(message: string, status: 'success' | 'danger') {
    if (status === 'success') {
      this.toastrService.success(message, 'Información');
    } else if (status === 'danger') {
      this.toastrService.danger(message, 'Error');
    }
  }

}
