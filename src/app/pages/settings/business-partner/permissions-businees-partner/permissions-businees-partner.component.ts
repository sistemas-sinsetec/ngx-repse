import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../../../../services/company.service';
import { Router } from '@angular/router';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
import { AuthService } from '../../../../services/auth.service';
import { LoadingController } from '@ionic/angular'; // Importar LoadingController

@Component({
  selector: 'ngx-permissions-businees-partner',
  templateUrl: './permissions-businees-partner.component.html',
  styleUrls: ['./permissions-businees-partner.component.scss']
})
export class PermissionsBusineesPartnerComponent implements OnInit {
  selectedUserType: string = 'all';
  selectedPartnerId: string = '';
  selectedUserId: string;
  selectedSection: string;
  selectedSubSections: string[] = [];
  selectedSubSectionsProvider: string[] = []; // Nueva propiedad para proveedor
  selectedSubSectionsClient: string[] = []; // Nueva propiedad para cliente
  users: User[] = [];
  filteredUsers: User[] = [];
  userTypes: any[] = [];
  sections: string[] = [];
  subSections: string[] = [];
  subSectionsProvider: string[] = []; // Nueva propiedad para proveedor
  subSectionsClient: string[] = []; // Nueva propiedad para cliente
  permissions: Permission[] = [];

  commercialPartners: CommercialPartner[] = [];




  userTypeNames: Record<string, string> = {
    admin: 'Administrador',
    superV: 'Supervisor',
    adminU: 'Administrativo'
  };

  groupedPermissions: { section: string, subSections: string[] }[] = []; // Nueva propiedad

  constructor(
    private http: HttpClient,
    private toastrService: CustomToastrService,
    public companyService: CompanyService,
    private router: Router,
    public authService: AuthService,
    private loadingController: LoadingController // Inyectar LoadingController
  ) { }

  async ngOnInit() {
    await this.loadUserTypes();

    await this.loadCommercialPartners(); // Cargar socios comerciales

    this.users = [];
    this.filteredUsers = [];
    this.sections = [];
  }



  async loadCommercialPartners() {
    const loading = await this.showLoading('Cargando socios comerciales...');
    const companyId = this.companyService.selectedCompany.id;

    this.http.post('https://siinad.mx/php/getCommercialPartners.php', { companyId })
      .subscribe(
        async (response: any) => {
          if (response.success) {
            this.commercialPartners = response.partners;
          } else {
            this.toastrService.showError(response.error, 'error');
          }
          await loading.dismiss();
        },
        async (error) => {
          console.error('Error:', error);
          this.toastrService.showError('Error al cargar socios', 'error');
          await loading.dismiss();
        }
      );
  }

  async loadUsers() {
    if (!this.selectedPartnerId) {
      this.users = [];
      this.filteredUsers = [];
      return;
    }

    const loading = await this.showLoading('Cargando usuarios...');
    try {
      const data = {
        partnerId: this.selectedPartnerId,
        companyId: this.selectedPartnerId // Agregar ambos nombres por compatibilidad
      };

      const response: any = await this.http.post(
        'https://siinad.mx/php/searchUsers.php',
        data
      ).toPromise();

      if (response.success) {
        this.users = response.employees || [];
        this.filteredUsers = [...this.users];
      } else {
        this.toastrService.showError(response.error, 'Error');
      }
    } catch (error) {
      this.toastrService.showError('Error al cargar usuarios.', 'Error');
      console.error('Error loading users:', error);
    } finally {
      await loading.dismiss();
    }
  }

  async loadUserTypes() {
    const loading = await this.showLoading('Cargando tipos de usuario...'); // Mostrar loading
    this.http.get('https://siinad.mx/php/get-level-users.php').subscribe(
      async (response: any) => {
        this.userTypes = response;
        await loading.dismiss(); // Ocultar loading
      },
      async (error) => {
        console.error('Error en la solicitud GET:', error);
        this.toastrService.showError('Error al cargar los tipos de usuario.', 'error');
        await loading.dismiss(); // Ocultar loading
      }
    );
  }

  async loadSections(partnerId: string) {
    const loading = await this.showLoading('Cargando secciones...');
    try {
      const data = { companyId: partnerId }; // Usar el nombre que espera el backend

      const response: any = await this.http.post(
        'https://siinad.mx/php/loadCompanySections.php',
        data
      ).toPromise();

      if (response.success) {
        const allSections = [
          'Sistema REPSE',
          'Control de proyectos',
          'Empleados',
          'Incidencias',
          'Costos',
          'Ventas',
          'Configuracion de mi empresa',
          'Configuracion de perfiles',
          'Configuracion de socios comerciales',
          'Configuracion de sitio',
          'Configuracion de usuarios'
        ];

        const assignedSections = response.sections.map(s => s.NameSection);
        this.sections = allSections.filter(s => assignedSections.includes(s));
      } else {
        this.toastrService.showError(response.error, 'Error');
      }
    } catch (error) {
      this.toastrService.showError('Error al cargar secciones', 'Error');
      console.error('Error loading sections:', error);
    } finally {
      await loading.dismiss();
    }
  }
  // Método corregido
  async onPartnerSelected(partnerId: string) {
    if (!partnerId) {
      this.selectedPartnerId = '';
      this.users = [];
      this.filteredUsers = [];
      this.sections = [];
      return;
    }

    this.selectedPartnerId = partnerId;
    try {
      await this.loadSections(partnerId); // Pasar partnerId directamente
      await this.loadUsers();
    } catch (error) {
      this.toastrService.showError('Error al cargar datos del socio', 'Error');
    }
  }

  async loadPartnerUsers(partnerId: string) {
    const loading = await this.showLoading('Cargando usuarios...');
    this.http.post('https://siinad.mx/php/getPartnerUsers.php', { partnerId })
      .subscribe(
        async (response: any) => {
          if (response.success) {
            this.users = response.users;
            this.filteredUsers = this.users;
          }
          await loading.dismiss();
        },
        async (error) => {
          console.error('Error:', error);
          this.toastrService.showError('Error al cargar usuarios', 'error');
          await loading.dismiss();
        }
      );
  }

  async onUserTypeChange(userType: string) {
    this.selectedUserType = userType;

    if (userType === 'all') {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter(user => user.role === userType);
    }
  }

  async onUserChange(selectedValue: any) {
    this.selectedUserId = selectedValue;
    await this.loadPermissions();
  }

  async onSectionChange(selectedValue: any) {
    this.selectedSection = selectedValue;
    await this.loadSubSections(this.selectedSection);
    
    // Resetear las selecciones
    this.selectedSubSections = [];
    this.selectedSubSectionsProvider = [];
    this.selectedSubSectionsClient = [];
    
    // Forzar detección de cambios
    setTimeout(() => {
      console.log('Subsecciones después de cargar:', this.getSubsectionsForCurrentRole());
    });
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
      'Empleados': [
        'Registrar solicitudes de empleados',
        'Editar solicitudes de empleados',
        'Aceptar solicitudes de empleados',
        'Procesar empleados',
        'Ver empleados registrados'
      ],
      'Incidencias': [
        'Control de incidencias',
        'Confirmar dia',
        'Confirmar semana',
        'Semanas procesadas',
        'Lista de asistencia'
      ],
      'Costos': [''],
      'Ventas': [''],
      'Configuracion de mi empresa': [
        'Asignar logo de la empresa',
        'Código de la empresa',
        'Departamentos',
        'Configuración inicial de períodos',
        'Tipos de período',
        'Catálogo de períodos',
        'Mi informacion fiscal',
        'Confirmar expendientes digitales',
        'Subir expendientes digitales'
      ],
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
        'Registrar usuarios',
        'Mis usuarios',
        'Editar mi usuario'
      ],
    };

    const subSectionsProviderMap: { [key: string]: string[] } = {
      'Sistema REPSE': [''],
      'Control de proyectos': [
        'Asignacion de proyectosSDASDSAS',
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
        'Asignacion de proyectoCXVVXXVCVXCs',
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

    if (this.companyService.selectedCompany.role === 'proveedor') {
      this.subSectionsProvider = subSectionsProviderMap[section] || [];
    } else if (this.companyService.selectedCompany.role === 'cliente') {
      this.subSectionsClient = subSectionsClientMap[section] || [];
    }
  }

  async loadPermissions() {
    if (!this.selectedUserId || !this.selectedPartnerId) return;

    const loading = await this.showLoading('Cargando permisos...');
    const data = {
      userId: this.selectedUserId,
      companyId: this.selectedPartnerId
    };

    this.http.post('https://siinad.mx/php/loadPermissions.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          this.permissions = response.permissions;
          this.groupPermissions();
        } else {
          this.toastrService.showError(response.error, 'Error');
        }
        await loading.dismiss();
      },
      async (error) => {
        console.error('Error:', error);
        this.toastrService.showError('Error al cargar permisos', 'Error');
        await loading.dismiss();
      }
    );
  }

  groupPermissions() {
    const grouped: { [key: string]: string[] } = {};

    this.permissions.forEach(permission => {
      if (!grouped[permission.section]) {
        grouped[permission.section] = [];
      }
      grouped[permission.section].push(permission.subSection || 'Sin subapartado');
    });

    this.groupedPermissions = Object.keys(grouped).map(section => ({
      section,
      subSections: grouped[section]
    }));
  }

  async addPermission() {
    if (!this.selectedUserId || !this.selectedPartnerId || !this.selectedSection) return;

    const loading = await this.showLoading('Agregando permisos...');
    try {
      const data = {
        userId: this.selectedUserId,
        companyId: this.selectedPartnerId, // Usar el nombre que espera el backend
        section: this.selectedSection,
        subSections: this.getCurrentSubsections()
      };

      const response: any = await this.http.post(
        'https://siinad.mx/php/addPermission.php',
        data
      ).toPromise();

      if (response.success) {
        // Actualizar la lista de permisos localmente
        this.permissions = [
          ...this.permissions,
          ...data.subSections.map(sub => ({
            section: data.section,
            subSection: sub
          }))
        ];

        this.groupPermissions();
        this.toastrService.showSuccess('Permisos agregados correctamente.', 'Éxito');
      } else {
        this.toastrService.showError(response.error, 'Error');
      }
    } catch (error) {
      this.toastrService.showError('Error al añadir permiso.', 'Error');
      console.error('Error adding permission:', error);
    } finally {
      await loading.dismiss();
    }
  }

  async removePermission(section: string, subSection: string) {
    if (!this.selectedUserId || !this.selectedPartnerId) return;
    const loading = await this.showLoading('Eliminando permiso...');
    try {
      const data = {
        userId: this.selectedUserId,
        companyId: this.selectedPartnerId, // Usar partnerId
        section: section,
        subSection: subSection
      };
      const response: any = await this.http.post('https://siinad.mx/php/removePermission.php', data).toPromise();
      if (response.success) {
        this.permissions = this.permissions.filter(p => !(p.section === section && p.subSection === subSection));
        this.groupPermissions();
        this.toastrService.showSuccess('Permiso eliminado correctamente.', 'Éxito');
      }
    } catch (error) {
      this.toastrService.showError('Error al eliminar permiso.', 'Error');
    } finally {
      await loading.dismiss();
    }
  }

  // Función para mostrar el loading
  async showLoading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
      spinner: 'crescent', // Puedes cambiar el tipo de spinner
      translucent: true,
    });
    await loading.present();
    return loading;
  }

  // Función para verificar si los permisos ya existen
  checkExistingPermissions(section: string, subSections: string[]): string[] {
    const existingPermissions: string[] = [];

    subSections.forEach(subSection => {
      const exists = this.permissions.some(
        permission => permission.section === section && permission.subSection === subSection
      );
      if (exists) {
        existingPermissions.push(subSection);
      }
    });

    return existingPermissions;
  }


  updateSubsections(event: any) {
    if (this.companyService.selectedCompany.role === 'proveedor') {
      this.selectedSubSectionsProvider = event;
    } else if (this.companyService.selectedCompany.role === 'cliente') {
      this.selectedSubSectionsClient = event;
    } else {
      this.selectedSubSections = event;
    }
  }



  getSubsectionsForCurrentRole(): string[] {
    if (!this.selectedSection) return [];
    
    // Obtener el rol del socio comercial seleccionado
    const partner = this.commercialPartners.find(p => p.id === this.selectedPartnerId);
    const partnerRole = partner?.role?.toLowerCase();
    
    // Debug: Mostrar información relevante
    console.log('Datos para determinar subsecciones:', {
      partnerRole,
      companyRole: this.companyService.selectedCompany.role?.toLowerCase(),
      hasPartner: !!partner,
      subSections: this.subSections,
      subSectionsProvider: this.subSectionsProvider,
      subSectionsClient: this.subSectionsClient
    });

    // Determinar qué subsecciones mostrar según el rol
    if (partnerRole === 'proveedor' || this.companyService.selectedCompany.role?.toLowerCase() === 'proveedor') {
      return this.subSectionsProvider.length > 0 ? this.subSectionsProvider : this.subSections;
    } else if (partnerRole === 'cliente' || this.companyService.selectedCompany.role?.toLowerCase() === 'cliente') {
      return this.subSectionsClient.length > 0 ? this.subSectionsClient : this.subSections;
    }
    
    // Por defecto, devolver las subsecciones regulares
    return this.subSections.filter(sub => sub.trim() !== '');
}
  getCurrentSubsections(): string[] {
    if (this.companyService.selectedCompany.role === 'proveedor') {
      return this.selectedSubSectionsProvider;
    } else if (this.companyService.selectedCompany.role === 'cliente') {
      return this.selectedSubSectionsClient;
    }
    return this.selectedSubSections;
  }


  // Añade este método en tu clase
  getBadgeStatus(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'success',
      'superV': 'warning',
      'adminU': 'info',
      'proveedor': 'warning',
      'cliente': 'success',
      'cliente-proveedor': 'primary'
    };

    return roleMap[role.toLowerCase()] || 'basic';
  }


  // Método para manejar selección de usuario
  onUserSelected(userId: string) {
    this.selectedUserId = userId;
    this.loadPermissions();
  }

  // Obtener nombre del usuario seleccionado
  getSelectedUserName(): string {
    const user = this.users.find(u => u.id === this.selectedUserId);
    return user ? user.name : 'Usuario no seleccionado';
  }

  // Modificar loadPermissions para usar el usuario seleccionado

  getCurrentSubsectionsList(): string[] {
    if (!this.selectedSection) return [];
    
    const role = this.companyService.selectedCompany.role?.toLowerCase();
    
    // Verificar si el socio comercial tiene un rol diferente
    const partner = this.commercialPartners.find(p => p.id === this.selectedPartnerId);
    const partnerRole = partner?.role?.toLowerCase();
    
    // Priorizar el rol del socio comercial si existe
    const effectiveRole = partnerRole || role;
    
    switch(effectiveRole) {
      case 'proveedor':
        return this.subSectionsProvider.filter(sub => sub.trim() !== '');
      case 'cliente':
        return this.subSectionsClient.filter(sub => sub.trim() !== '');
      default:
        return this.subSections.filter(sub => sub.trim() !== '');
    }
  }
}


interface CommercialPartner {
  id: string;
  nameCompany: string;
  rfc: string;
  role?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Permission {
  section: string;
  subSection: string;
}













