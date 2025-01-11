import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { NbToastrService } from '@nebular/theme';

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
    private toastrService: NbToastrService, // Inyectamos NbToastrService
  ) {}

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.http.get('https://siinad.mx/php/get-companies.php').subscribe(
      (response: any) => {
        if (response) {
          this.companies = response;
        } else {
          // Manejo de error
          console.error(response.error);
          this.mostrarToast(response.error, 'danger');
        }
      },
      (error) => {
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
    // event puede ser un array seleccionado en un nb-select
    this.selectedSections = event;
  }

  loadPermissions() {
    const data = { companyId: this.selectedCompanyId };

    this.http.post('https://siinad.mx/php/loadCompanyPermissions.php', data).subscribe(
      (response: any) => {
        if (response.success) {
          this.permissions = response.permissions;
        } else {
          console.error(response.error);
          this.mostrarToast(response.error, 'danger');
        }
      },
      (error) => {
        console.error('Error en la solicitud POST:', error);
        this.mostrarToast('Error al cargar permisos.', 'danger');
      }
    );
  }

  addPermission() {
    const data = {
      companyId: this.selectedCompanyId,
      sections: this.selectedSections,
    };

    this.http.post('https://siinad.mx/php/addCompanyPermission.php', data).subscribe(
      (response: any) => {
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
        console.error('Error en la solicitud POST:', error);
        this.mostrarToast('Error al añadir permiso.', 'danger');
      }
    );
  }

  removePermission(NameSection: string) {
    const data = {
      companyId: this.selectedCompanyId,
      section: NameSection,
    };

    this.http.post('https://siinad.mx/php/removeCompanyPermission.php', data).subscribe(
      (response: any) => {
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
