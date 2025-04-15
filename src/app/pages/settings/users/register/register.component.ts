/*
  En este codigo se pueden dar de alta nuevos usuarios para la empresa
*/
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbDialogService } from '@nebular/theme';
import { LoadingController } from '@ionic/angular'; // <-- Importamos LoadingController de Ionic
import { CustomToastrService } from '../../../../services/custom-toastr.service';
import { environment } from '../../../../../environments/environment';

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

  showValidationMessages = false; // <-- Nueva variable

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    public authService: AuthService,
    private dialogService: NbDialogService,
    public companyService: CompanyService,
    private loadingController: LoadingController, // <-- Inyectamos LoadingController
  ) { }

  ngOnInit() {
    this.loadSecondaryCompanies(); 
  }

  /**
   * Cargar niveles de usuario desde el backend.
   */


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
    this.http.post(`${environment.apiBaseUrl}/get-user-by-code.php`, data).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          this.selectedUser = response.user;
        } else {
          console.error(response.error);
          await this.toastrService.showError(response.error, 'Error');
          this.selectedUser = null;
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        await this.toastrService.showError('Error al cargar usuario.', 'Error');
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

    this.http.get(`${environment.apiBaseUrl}/get-companies.php`).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response) {
          this.secondaryCompanies = response;
        } else {
          console.error('Error al cargar empresas secundarias');
          await this.toastrService.showError('Error al cargar empresas secundarias.', 'Error');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud GET:', error);
        await this.toastrService.showError('Error al cargar empresas secundarias.', 'error');
      }
    );
  }

  /**
   * Asignar empresa al usuario seleccionado.
   */
  async assignCompanyToUser() {
    if (!this.selectedUser) {
      await this.toastrService.showWarning('No se ha seleccionado un usuario.', 'Advertencia');
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
  
    this.http.post(`${environment.apiBaseUrl}/assign-company.php`, data).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          console.log('Empresa asignada', response);
          await this.toastrService.showSuccess('Empresa asignada con éxito.', 'Exito');
          this.closeModal();
        } else {
          console.error(response.error);
          await this.toastrService.showError(response.error, 'Error');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        await this.toastrService.showError('Error al asignar empresa.', 'danger');
      }
    );
  }

  /**
   * Cerrar modal de asignación de empresa.
   */
  closeModal() {
    this.isModalOpen = false;
  }


  camposCompletos(): boolean {
    return this.getValidationMessages().length === 0;
  }

  private validarCampos(): string | null {
    const errors = [
      [!this.usuario.nombreUsuario, 'El nombre de usuario es obligatorio.'],
      [!this.usuario.nombreCompleto, 'El nombre completo es obligatorio.'],
      [!this.usuario.correo, 'El correo es obligatorio.'],
      [!this.validarCorreo(this.usuario.correo), 'Formato de correo inválido.'],
      [!this.usuario.contrasena, 'La contraseña es obligatoria.'],
      [this.usuario.contrasena.length < 8, 'La contraseña debe tener al menos 8 caracteres.'],
      [this.usuario.contrasena !== this.usuario.confirmarContrasena, 'Las contraseñas no coinciden.'],
      [!this.usuario.levelUser, 'Debes seleccionar un tipo de usuario.'], // Validación del select
      [!this.companyService.selectedCompany, 'Debe seleccionar una empresa.']
    ];
  
    const error = errors.find(([condition]) => condition);
    return error ? error[1] as string : null;
  }

  private capitalizarNombreCompleto(nombre: string): string {
    return nombre
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }
  
  private validarCorreo(correo: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
  }

async registrarUsuario() {
  this.showValidationMessages = true; // Activar la visualización de mensajes

  const validationMessages = this.getValidationMessages();
  if (validationMessages.length > 0) {
    validationMessages.forEach(message => this.toastrService.showWarning(message, 'Advertencia'));
    return;
  }
    this.usuario.nombreCompleto = this.capitalizarNombreCompleto(this.usuario.nombreCompleto);
  
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
  
    this.http.post(`${environment.apiBaseUrl}/registerAdminCompany.php`, data).subscribe(
      async (response: any) => {
        loading.dismiss();
        if (response.success) {
          await this.toastrService.showSuccess(response.message, 'Exito');
          this.limpiarCampos();
        } else {
          await this.toastrService.showError(response.message, 'Error');
        }
      },
      async (error) => {
        loading.dismiss();
        console.error('Error en la solicitud POST:', error);
        await this.toastrService.showError('Error en la solicitud de registro.', 'Error');
      }
    );
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
    this.showValidationMessages = false; // Reiniciar la visualización de mensajes
  }
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

  getValidationMessages(): string[] {
    if (!this.showValidationMessages) {
      return []; // No mostrar mensajes si no se ha intentado enviar el formulario
    }
  
    const messages: string[] = [];
  
    if (!this.usuario.nombreUsuario) {
      messages.push('El nombre de usuario es obligatorio.');
    }
  
    if (!this.usuario.nombreCompleto) {
      messages.push('El nombre completo es obligatorio.');
    }
  
    if (!this.usuario.correo) {
      messages.push('El correo es obligatorio.');
    } else if (!this.isValidEmail(this.usuario.correo)) {
      messages.push('Formato de correo inválido.');
    }
  
    if (!this.usuario.contrasena) {
      messages.push('La contraseña es obligatoria.');
    } else if (this.usuario.contrasena.length < 8) {
      messages.push('La contraseña debe tener al menos 8 caracteres.');
    }
  
    if (!this.usuario.confirmarContrasena) {
      messages.push('Debes confirmar la contraseña.');
    } else if (this.usuario.contrasena !== this.usuario.confirmarContrasena) {
      messages.push('Las contraseñas no coinciden.');
    }
  
    if (!this.usuario.levelUser) {
      messages.push('Debes seleccionar un tipo de usuario.');
    }
  
    return messages;
  }
}

