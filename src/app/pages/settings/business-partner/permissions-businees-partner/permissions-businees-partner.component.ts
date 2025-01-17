import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../../../../services/company.service';
import { Router } from '@angular/router';

@Component({
  selector: 'ngx-permissions-businees-partner',
  templateUrl: './permissions-businees-partner.component.html',
  styleUrls: ['./permissions-businees-partner.component.scss']
})
export class PermissionsBusineesPartnerComponent {
  businessPartnerId: string;
  selectedSections: string[] = [];
  companies: any[] = [];
  // Secciones por tipo de empresa
  sectionsCliente: string[] = ['Sistema REPSE', 'Control de proyectos', 'Empleados'];
  sectionsProveedor: string[] = ['Incidencias', 'Costos', 'Ventas'];
  sectionsClienteProveedor: string[] = ['Sistema REPSE', 'Control de proyectos', 'Empleados', 'Incidencias', 'Costos', 'Ventas'];
  permissions: any[] = [];
  selectedRoleName: string; // Almacena el roleName seleccionado

  constructor(
    private http: HttpClient,
    private companyService: CompanyService,
    private router: Router,
  ) { }

  ngOnInit() {
    this.loadCompanies();
  }

  loadCompanies() {
    this.http.get(`https://siinad.mx/php/getBusinessPartner.php?association_id=${this.companyService.selectedCompany.id}`).subscribe(
      (response: any) => {
        if (response) {
          this.companies = response;
        } else {
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

  async onCompanyChange(event: any) {
    this.businessPartnerId = event.detail.value;

    // Obtener el roleName de la empresa seleccionada
    const selectedCompany = this.companies.find(company => company.businessPartnerId === this.businessPartnerId);
    
    if (selectedCompany) {
      this.selectedRoleName = selectedCompany.roleName; // Guardar el roleName
      await this.loadPermissions(); // Cargar los permisos para la empresa seleccionada
    }
  }

  async onSectionChange(event: any) {
    this.selectedSections = event.detail.value;
  }

  async loadPermissions() {
    const data = { businessPartnerId: this.businessPartnerId };

    this.http.post('https://siinad.mx/php/loadBusinessSections.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          this.permissions = response.sections; // Cargar las secciones asignadas
        } else {
          console.error(response.error);
          await this.mostrarToast(response.error, 'danger');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        await this.mostrarToast('Error al cargar permisos.', 'danger');
      }
    );
  }

  async addPermission() {
    if (!this.businessPartnerId) {
      await this.mostrarToast('Por favor, seleccione un socio comercial válido.', 'warning');
      return;
    }

    const data = {
      companyId: this.companyService.selectedCompany.id,
      businessPartnerId: this.businessPartnerId,
      sections: this.selectedSections,
    };

    this.http.post('https://siinad.mx/php/addBusinessSections.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          if (!Array.isArray(this.permissions)) {
            this.permissions = [];
          }

          this.selectedSections.forEach(section => {
            if (!this.permissions.some(p => p.name_section === section)) {
              this.permissions.push({ name_section: section });
            }
          });
        } else {
          console.error(response.error);
          await this.mostrarToast(response.error, 'danger');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        await this.mostrarToast('Error al añadir permiso.', 'danger');
      }
    );
  }

  async removePermission(nameSection: string) {
    const data = {
      businessPartnerId: this.businessPartnerId,
      section: nameSection,
    };

    this.http.post('https://siinad.mx/php/removeBusinessSections.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          this.permissions = this.permissions.filter(p => p.name_section !== nameSection);
        } else {
          console.error(response.error);
          await this.mostrarToast(response.error, 'danger');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        await this.mostrarToast('Error al eliminar permiso.', 'danger');
      }
    );
  }

  async mostrarToast(message: string, color: string) {
    const toast = document.createElement('ion-toast');
    toast.message = message;
    toast.color = color;
    toast.duration = 2000;
    document.body.appendChild(toast);
    return toast.present();
  }

  goBack() {
    this.router.navigate([this.router.url.split('/').slice(0, -1).join('/')]);
  }
}

