import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService, NbDialogService } from '@nebular/theme';
import { LoadingController } from '@ionic/angular'; // <-- Importamos LoadingController de Ionic

@Component({
  selector: 'ngx-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  usuario = {
    nombreUsuario: '',
    nombreCompleto: '',
    correo: '',
    contrasena: '',
    confirmarContrasena: '',
    levelUser: ''
  };

  filtroUsuarios: string = '';
  employees: any[] = [];
  filteredEmployees: any[] = [];
  busquedaActiva: boolean = false;
  filtroRol: string = '';

  registerMode: string = 'register'; // Selector de modo de registro
  userCode: string = ''; // Código de usuario
  selectedUser: any = null; // Usuario seleccionado al buscar por código
  selectedCompany: any = null;
  selectedLevelUser: string = ''; // Nivel de usuario seleccionado
  levelUsers: any[] = []; // Niveles de usuario
  secondaryCompanies: any[] = []; // Empresas secundarias
  isModalOpen = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: NbToastrService,
    public authService: AuthService,
    private dialogService: NbDialogService,
    public companyService: CompanyService,
    private loadingController: LoadingController, // <-- Inyectamos LoadingController
  ) { }

  ngOnInit() {
    this.getEmployees(); 
    this.loadLevelUsers(); 
    this.loadSecondaryCompanies(); 
  }

  /**
   * Cargar niveles de usuario desde el backend.
   */
  async loadLevelUsers() {
    // 1. Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Cargando niveles de usuario...',
    });
    await loading.present();

    // 2. Realizar la petición HTTP
    this.http.get('https://siinad.mx/php/get-level-users.php').subscribe(
      async (response: any) => {
        loading.dismiss(); // Ocultar el spinner al terminar

        if (response) {
          this.levelUsers = response;
        } else {
          console.error('Error al cargar niveles de usuario');
          await this.showToast('Error al cargar niveles de usuario.', 'danger');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud GET:', error);
        await this.showToast('Error al cargar niveles de usuario.', 'danger');
      }
    );
  }

  pressEnter(event: KeyboardEvent): void {
    // Verificamos si la tecla presionada es 'Enter'
    if (event.key === 'Enter') {
      this.onUserCodeChange();
    }
  }

  /**
   * Buscar usuario por código.
   */
  async onUserCodeChange() {


      if (!this.userCode) {
        this.selectedUser = null;
        return;
    }


    // 1. Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Buscando usuario...',
    });
    await loading.present();

    const data = { userCode: this.userCode };
    this.http.post('https://siinad.mx/php/get-user-by-code.php', data).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          this.selectedUser = response.user;
        } else {
          console.error(response.error);
          await this.showToast(response.error, 'danger');
          this.selectedUser = null;
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        await this.showToast('Error al cargar usuario.', 'danger');
        this.selectedUser = null;
      }
    );
  }

  /**
   * Cargar empresas secundarias.
   */
  async loadSecondaryCompanies() {
    // 1. Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Cargando empresas secundarias...',
    });
    await loading.present();

    this.http.get('https://siinad.mx/php/get-companies.php').subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response) {
          this.secondaryCompanies = response;
        } else {
          console.error('Error al cargar empresas secundarias');
          await this.showToast('Error al cargar empresas secundarias.', 'danger');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud GET:', error);
        await this.showToast('Error al cargar empresas secundarias.', 'danger');
      }
    );
  }

  /**
   * Asignar empresa al usuario seleccionado.
   */
  async assignCompanyToUser() {
    if (!this.selectedUser) {
      await this.showToast('No se ha seleccionado un usuario.', 'warning');
      return;
    }

    // 1. Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Asignando empresa...',
    });
    await loading.present();

    const data = {
      user_id: this.selectedUser.id,
      company_id: this.companyService.selectedCompany.id,
      principal: 0,
      levelUser_id: this.selectedLevelUser,
      status: 2,
    };
  
    this.http.post('https://siinad.mx/php/assign-company.php', data).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          console.log('Empresa asignada', response);
          await this.showToast('Empresa asignada con éxito.', 'success');
          this.closeModal();
        } else {
          console.error(response.error);
          await this.showToast(response.error, 'danger');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        await this.showToast('Error al asignar empresa.', 'danger');
      }
    );
  }

  /**
   * Cerrar modal de asignación de empresa.
   */
  closeModal() {
    this.isModalOpen = false;
  }

  /**
   * Mostrar un Toast de Nebular.
   * @param message Mensaje a mostrar
   * @param status Tipo de estado: 'success', 'danger', 'warning'
   */
  async showToast(message: string, status: 'success' | 'danger' | 'warning') {
    this.toastrService.show(message, 'Notificación', { status });
  }

  /**
   * Obtener empleados de la empresa.
   */
  async getEmployees() {
    // 1. Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Cargando empleados...',
    });
    await loading.present();

    const data = {
      companyId: this.companyService.selectedCompany.id,
    };
  
    this.http.post('https://siinad.mx/php/searchUsers.php', data).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          this.employees = response.employees;
          this.filteredEmployees = this.employees; 
          console.log('Datos de empleados obtenidos:', this.employees);
        } else {
          await this.showToast('Error en la solicitud', 'danger');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error al realizar la solicitud:', error);
        await this.showToast('Error al realizar la solicitud', 'danger');
      }
    );
  }

  /**
   * Eliminar usuario por ID.
   */
  async eliminarUsuario(id: number) {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    // 1. Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Eliminando usuario...',
    });
    await loading.present();

    this.http.delete(`https://siinad.mx/php/deleteUser.php?id=${id}`).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          await this.showToast('Usuario eliminado exitosamente', 'success');
        } else {
          await this.showToast('Error al eliminar usuario: ' + response.message, 'danger');
        }
        this.getEmployees(); // Refrescar la lista
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud DELETE:', error);
        await this.showToast('Error al eliminar usuario.', 'danger');
        this.getEmployees(); // Refrescar la lista
      }
    );
  }

  /**
   * Filtrar usuarios por búsqueda y rol.
   */
  buscarUsuarios() {
    if (this.filtroUsuarios.trim() !== '') {
      this.filteredEmployees = this.employees.filter(employee =>
        (employee.username.toLowerCase().includes(this.filtroUsuarios.toLowerCase()) ||
         employee.name.toLowerCase().includes(this.filtroUsuarios.toLowerCase())) &&
        (this.filtroRol === '' || employee.role === this.filtroRol)
      );
      this.busquedaActiva = true;
    } else if (this.filtroRol !== '') {
      this.filteredEmployees = this.employees.filter(employee =>
        employee.role === this.filtroRol
      );
      this.busquedaActiva = true;
    } else {
      this.filteredEmployees = this.employees;
      this.busquedaActiva = false;
    }
  }

  /**
   * Verificar que los campos de registro estén completos y sean válidos.
   */
  async camposCompletos(): Promise<boolean> {
    const regexPuntoCom = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    return (
      typeof this.usuario.nombreUsuario === 'string' && this.usuario.nombreUsuario.trim() !== '' &&
      typeof this.usuario.nombreCompleto === 'string' && this.usuario.nombreCompleto.trim() !== '' &&
      typeof this.usuario.correo === 'string' && this.usuario.correo.trim() !== '' &&
      typeof this.usuario.contrasena === 'string' && this.usuario.contrasena.trim() !== '' &&
      typeof this.usuario.levelUser === 'string' && this.usuario.levelUser.trim() !== '' &&
      this.usuario.correo.includes('@') &&
      regexPuntoCom.test(this.usuario.correo) &&
      this.usuario.contrasena === this.usuario.confirmarContrasena 
    );
  }

  /**
   * Registrar un nuevo usuario.
   */
  async registrarUsuario() {
    if (await this.camposCompletos()) {
      // 1. Crear y mostrar el loading
      const loading = await this.loadingController.create({
        message: 'Registrando usuario...',
      });
      await loading.present();

      const data = {
        association_user_id: this.authService.userId,
        nombreUsuario: this.usuario.nombreUsuario,
        nombreCompleto: this.usuario.nombreCompleto,
        correo: this.usuario.correo,
        contrasena: this.usuario.contrasena,
        nombreEmpresa: this.companyService.selectedCompany?.name,
        rfcEmpresa: this.companyService.selectedCompany?.rfc,
        levelUser: this.usuario.levelUser,
      };

      this.http.post('https://siinad.mx/php/registerAdminCompany.php', data).subscribe(
        async (response: any) => {
          loading.dismiss();
          if (response.success) {
            await this.showToast(response.message, 'success');
            this.limpiarCampos();
            this.getEmployees(); // Refrescar empleados
          } else {
            await this.showToast(response.message, 'danger');
          }
        },
        async (error) => {
          loading.dismiss();
          console.error('Error en la solicitud POST:', error);
          await this.showToast('Error en la solicitud de registro.', 'danger');
        }
      );
    } else {
      await this.showToast(
        'Por favor complete todos los campos obligatorios y verifique el correo y la contraseña.',
        'warning'
      );
    }
  }

  /**
   * Limpiar campos del formulario de registro.
   */
  limpiarCampos() {
    this.usuario = {
      nombreUsuario: '',
      nombreCompleto: '',
      correo: '',
      contrasena: '',
      confirmarContrasena: '',
      levelUser: ''
    };
  }

  /**
   * Mostrar el rol con una descripción más legible.
   */
  getRolLegible(rol: string): string {
    switch (rol) {
      case 'adminS':
        return 'Administrador único de la Página';
      case 'adminE':
      case 'adminEE':
      case 'adminPE':
        return 'Administrador único de la Empresa';
      case 'admin':
        return 'Administrador de la empresa';
      case 'superV':
        return 'Supervisor de la empresa';
      case 'adminU':
        return 'Administrativo de la empresa';
      default:
        return 'Rol desconocido';
    }
  }
  
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

