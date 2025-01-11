import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbToastrService } from '@nebular/theme';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'ngx-permissions-sections',
  templateUrl: './permissions-sections.component.html',
  styleUrls: ['./permissions-sections.component.scss'],
})
export class PermissionsComponent implements OnInit {
selectedUserType: string = 'all';
  selectedUserId: string;
  selectedSection: string;
  selectedSubSections: string[] = [];
  selectedSubSectionsProvider: string[] = []; // Nueva propiedad para proveedor
  selectedSubSectionsClient: string[] = []; // Nueva propiedad para cliente
  users: any[] = [];
  filteredUsers: any[] = [];
  userTypes: any[] = [];
  sections: string[] = [];
  subSections: string[] = [];
  subSectionsProvider: string[] = []; // Nueva propiedad para proveedor
  subSectionsClient: string[] = []; // Nueva propiedad para cliente
  permissions: any[] = [];

  groupedPermissions: { section: string, subSections: string[] }[] = []; // Nueva propieda

  constructor(
    private http: HttpClient,
    private toastrService: NbToastrService,
    private companyService: CompanyService,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers() {
    const companyId = this.companyService.selectedCompany.Id;
    this.http
      .post('https://siinad.mx/php/getUsersByCompanyId.php', { companyId })
      .subscribe(
        (response: any) => {
          if (response.success) {
            this.users = response.users;
          } else {
            this.showToast(response.error, 'danger');
          }
        },
        (error) => {
          console.error('Error en la solicitud GET:', error);
          this.showToast('Error al cargar usuarios.', 'danger');
        }
      );
  }

  

  loadPermissions() {
    if (!this.selectedUserId) return;

    const companyId = this.companyService.selectedCompany.Id;
    this.http
      .post('https://siinad.mx/php/getPermissions.php', {
        userId: this.selectedUserId,
        companyId,
      })
      .subscribe(
        (response: any) => {
          if (response.success) {
            this.permissions = response.permissions;
            this.groupPermissions();
          } else {
            this.showToast(response.error, 'danger');
          }
        },
        (error) => {
          console.error('Error en la solicitud GET:', error);
          this.showToast('Error al cargar permisos.', 'danger');
        }
      );
  }

  

  groupPermissions() {
    this.groupedPermissions = this.permissions.reduce(
      (acc: { [key: string]: any[] }, permission: any) => {
        const section = permission.section;
        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(permission);
        return acc;
      },
      {}
    );
  }

  addPermission(section: string, subSection: string) {
    const companyId = this.companyService.selectedCompany.Id;
    const data = {
      userId: this.selectedUserId,
      section,
      subSection,
      companyId,
    };

    this.http.post('https://siinad.mx/php/addPermission.php', data).subscribe(
      (response: any) => {
        if (response.success) {
          this.permissions.push({ section, subSection });
          this.groupPermissions();
          this.showToast('Permiso agregado exitosamente.', 'success');
        } else {
          console.error(response.error);
          this.showToast(response.error, 'danger');
        }
      },
      (error) => {
        console.error('Error en la solicitud POST:', error);
        this.showToast('Error al agregar permiso.', 'danger');
      }
    );
  }

  removePermission(permission: any) {
    const companyId = this.companyService.selectedCompany.Id;
    const data = {
      userId: this.selectedUserId,
      section: permission.section,
      subSection: permission.subSection,
      companyId,
    };

    this.http.post('https://siinad.mx/php/removePermission.php', data).subscribe(
      (response: any) => {
        if (response.success) {
          const index = this.permissions.findIndex(
            (p) =>
              p.section === permission.section &&
              p.subSection === permission.subSection
          );
          if (index > -1) {
            this.permissions.splice(index, 1);
          }
          this.groupPermissions();
          this.showToast('Permiso eliminado exitosamente.', 'success');
        } else {
          console.error(response.error);
          this.showToast(response.error, 'danger');
        }
      },
      (error) => {
        console.error('Error en la solicitud POST:', error);
        this.showToast('Error al eliminar permiso.', 'danger');
      }
    );
  }

  showToast(message: string, status: 'success' | 'danger') {
    this.toastrService.show(message, 'Notificación', { status });
  }
}
