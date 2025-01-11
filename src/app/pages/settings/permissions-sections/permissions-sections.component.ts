import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbToastrService } from '@nebular/theme';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'app-user-permissions-sections',
  templateUrl: 'permissions-sections.component.html',
  styleUrls: ['./permissions-sections.component.scss'],
})
export class UserPermissionsSectionsPage implements OnInit {
  selectedUserType: string = 'all';
  selectedUserId: string;
  selectedSection: string;
  selectedSubSections: string[] = [];
  selectedSubSectionsProvider: string[] = [];
  selectedSubSectionsClient: string[] = [];
  users: any[] = [];
  filteredUsers: any[] = [];
  userTypes: any[] = [];
  sections: string[] = [];
  subSections: string[] = [];
  subSectionsProvider: string[] = [];
  subSectionsClient: string[] = [];
  permissions: any[] = [];
  groupedPermissions: { section: string, subSections: string[] }[] = [];

  constructor(
    private toastrService: NbToastrService,
    private http: HttpClient,
    public companyService: CompanyService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadUserTypes();
    this.loadSections();
  }

  async loadUsers() {
    const companyId = this.companyService.selectedCompany.Id;
    const data = { companyId: companyId };

    this.http.post('https://siinad.mx/php/searchUsers.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          this.users = response.employees;
          this.filteredUsers = this.users;
        } else {
          console.error(response.error);
          this.showToast(response.error, 'danger');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        this.showToast('Error al cargar empleados.', 'danger');
      }
    );
  }

  async loadUserTypes() {
    this.http.get('https://siinad.mx/php/get-level-users.php').subscribe(
      async (response: any) => {
        this.userTypes = response;
      },
      async (error) => {
        console.error('Error en la solicitud GET:', error);
        this.showToast('Error al cargar los tipos de usuario.', 'danger');
      }
    );
  }

  async loadSections() {
    const companyId = this.companyService.selectedCompany.dId;
    const data = { companyId: companyId };

    this.http.post('https://siinad.mx/php/loadCompanySections.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          const allSections = ['Sistema REPSE', 'Control de proyectos', 'Empleados', 'Incidencias', 'Costos', 'Ventas', 'Configuracion de mi empresa', 'Configuracion de perfiles', 'Configuracion de socios comerciales', 'Configuracion de sitio', 'Configuracion de usuarios'];
          const assignedSections = response.sections.map((section: { NameSection: string }) => section.NameSection);
          this.sections = allSections.filter(section => assignedSections.includes(section));
        } else {
          console.error(response.error);
          this.showToast(response.error, 'danger');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        this.showToast('Error al cargar secciones.', 'danger');
      }
    );
  }

  showToast(message: string, status: 'success' | 'danger') {
    this.toastrService.show(message, 'Notificación', { status });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

}
