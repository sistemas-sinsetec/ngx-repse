import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbIconModule, NbToastrService } from '@nebular/theme';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
@Component({
  selector: 'ngx-permissions-sections',
  templateUrl: './permissions-sections.component.html',
  styleUrls: ['./permissions-sections.component.scss'],
})
export class PermissionsSectionsComponent implements OnInit {
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
    private router: Router,
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

  async loadSections() {
    const companyId = this.companyService.selectedCompany.Id;
    const data = { companyId: companyId };

    this.http.post('https://siinad.mx/php/loadCompanySections.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          const allSections = ['Sistema REPSE', 'Control de proyectos', 'Empleados', 'Incidencias', 'Costos', 'Ventas', 'Configuracion de mi empresa', 'Configuracion de perfiles', 'Configuracion de socios comerciales', 'Configuracion de sitio', 'Configuracion de usuarios'];
          const assignedSections = response.sections.map((section: { NameSection: string }) => section.NameSection);
          this.sections = allSections.filter(section => assignedSections.includes(section))         
        } else {
          console.error(response.error);
          await this.showToast(response.error, 'danger');
        }
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        await this.showToast('Error al cargar secciones.', 'danger');
      }
    );
  }

  async onUserTypeChange(event: any) {
    const userType = event.target.value;

    if (userType === 'all') {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user => user.role === userType);
    }
  }

  async onUserChange(event: any) {
    this.selectedUserId = event.target.value;
    await this.loadPermissions();
  }

  async onSectionChange(event: any) {
    this.selectedSection = event.target.value;
    this.loadSubSections(this.selectedSection);
  }

  async loadSubSections(section: string) {
    const subSectionsMap: { [key: string]: string[] } = {
      'Sistema REPSE': [''],
      'Control de proyectos': [
        'Asignacion de proyectos',
        'Registro de proyectos',
        'Vizualizar proyectos', 
        'Seguimiento de proyectos'
      ],
      'Empleados': ['Registrar solicitudes de empleados', 'Editar solicitudes de empleados', 'Aceptar solicitudes de empleados', 'Procesar empleados', 'Ver empleados registrados'],
      'Incidencias': ['Control de incidencias', 'Confirmar dia', 'Confirmar semana', 'Semanas procesadas', 'Lista de asistencia'],
      'Costos': [''],
      'Ventas': [''],
      'Configuracion de mi empresa': [
        'Asignar logo de la empresa',
        'Código de la empresa',
        'Departamentos',
        'Configuración inicial de períodos',
        'Tipos de período',
        'Catálogo de períodos'
      ],
      'Configuracion de perfiles': [''],
      'Configuracion de socios comerciales': [
        'Autorizar socio comercial',
        'Editar roles de los socios comerciales',
        'Registrar socio comercial',
        'Secciones visibles de los socios comerciales'
      ],
      'Configuracion de sitio': [
        'Secciones visibles de empresas',
        'Empresas registradas en la página',
        'Registrar empresas',
        'Confirmar solicitudes premium'
      ],
      'Configuracion de usuarios': [
        'Registrar, eliminar, ver y editar usuarios',
        'Editar mi usuario'
      ],
    };

    const subSectionsProviderMap: { [key: string]: string[] } = {
      'Sistema REPSE': [''],
      'Control de proyectos': [
        'Asignacion de proyectos',
        'Registro de proyectos',
        'Vizualizar proyectos', 
        'Seguimiento de proyectos'
      ],
      'Empleados': ['Registrar solicitudes de empleados', 'editar solicitudes de empleados', 'Ver empleados registrados'],
      'Incidencias': ['Control de incidencias', 'Confirmar dia', 'Confirmar semana', 'Semanas procesadas', 'Lista de asistencia'],
      'Costos': [''],
      'Ventas': [''],
      'Configuracion de mi empresa': [
        'Asignar logo de la empresa',
        'Código de la empresa',
        'Departamentos',
        'Configuración inicial de períodos',
        'Tipos de período',
        'Catálogo de períodos'
      ],
      'Configuracion de perfiles': [''],
      'Configuracion de socios comerciales': [
        'Autorizar socio comercial',
        'Editar roles de los socios comerciales',
        'Registrar socio comercial',
        'Secciones visibles de los socios comerciales'
      ],
      'Configuracion de sitio': [
        'Secciones visibles de empresas',
        'Empresas registradas en la página',
        'Registrar empresas',
        'Confirmar solicitudes premium'
      ],
      'Configuracion de usuarios': [
        'Registrar, eliminar, ver y editar usuarios',
        'Editar mi usuario'
      ],
    };

    const subSectionsClientMap: { [key: string]: string[] } = {
      'Sistema REPSE': [''],
      'Control de proyectos': [
        'Asignacion de proyectos',
        'Registro de proyectos',
        'Vizualizar proyectos', 
        'Seguimiento de proyectos'
      ],
      'Empleados': ['Registrar solicitudes de empleados', 'editar solicitudes de empleados', 'Ver empleados registrados'],
      'Incidencias': ['Control de incidencias', 'Confirmar dia', 'Confirmar semana', 'Semanas procesadas', 'Lista de asistencia'],
      'Costos': [''],
      'Ventas': [''],
      'Configuracion de mi empresa': [
        'Asignar logo de la empresa',
        'Código de la empresa',
        'Departamentos',
        'Configuración inicial de períodos',
        'Tipos de período',
        'Catálogo de períodos'
      ],
      'Configuracion de perfiles': [''],
      'Configuracion de socios comerciales': [
        'Autorizar socio comercial',
        'Editar roles de los socios comerciales',
        'Registrar socio comercial',
        'Secciones visibles de los socios comerciales'
      ],
      'Configuracion de sitio': [
        'Secciones visibles de empresas',
        'Empresas registradas en la página',
        'Registrar empresas',
        'Confirmar solicitudes premium'
      ],
      'Configuracion de usuarios': [
        'Registrar, eliminar, ver y editar usuarios',
        'Editar mi usuario'
      ],
    };

    this.subSections = subSectionsMap[section] || [];

    if (this.companyService.selectedCompany.Role === 'proveedor') {
      this.subSectionsProvider = subSectionsProviderMap[section] || [];
    } else if (this.companyService.selectedCompany.Role === 'cliente') {
      this.subSectionsClient = subSectionsClientMap[section] || [];
    }
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

  goBack() {
    this.router.navigate(['/previous-page']);  // Puedes definir la ruta que necesites
  }
}
