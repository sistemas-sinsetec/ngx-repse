import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NbDialogService } from '@nebular/theme';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

@Component({
  selector: 'ngx-reg-company',
  templateUrl: './reg-company.component.html',
  styleUrls: ['./reg-company.component.scss']
})
export class RegCompanyComponent {
  usuario = {
    nombreUsuario: '',
    nombreCompleto: '',
    correo: '',
    numTelefonico: '',
    contrasena: '',
    confirmarContrasena: '',
    rfc: '',
    nombreEmpresa: '',
    fechaInicio: '',
    fechaFin: ''
  };

  showPassword: boolean = false; // Controla la visibilidad de la contraseña
  showConfirmPassword: boolean = false; // Controla la visibilidad de confirmar contraseña

  showMessageFlag: boolean = false;
  tipoRFC: string = 'fisica'; // Valor por defecto: persona física
  rfcLengthError: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    private dialogService: NbDialogService,
  ) {}

  ngOnInit() {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async camposCompletos(): Promise<boolean> {
    const regexPuntoCom = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (
      typeof this.usuario.nombreUsuario === 'string' &&
      this.usuario.nombreUsuario.trim() !== '' &&
      typeof this.usuario.nombreCompleto === 'string' &&
      this.usuario.nombreCompleto.trim() !== '' &&
      typeof this.usuario.numTelefonico === 'string' &&
      this.usuario.numTelefonico.trim() !== '' &&
      typeof this.usuario.correo === 'string' &&
      this.usuario.correo.trim() !== '' &&
      typeof this.usuario.contrasena === 'string' &&
      this.usuario.contrasena.trim() !== '' &&
      typeof this.usuario.nombreEmpresa === 'string' &&
      this.usuario.nombreEmpresa.trim() !== '' &&
      this.usuario.correo.includes('@') &&
      regexPuntoCom.test(this.usuario.correo) &&
      this.usuario.contrasena === this.usuario.confirmarContrasena
    );
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async registrarUsuario() {
    if (await this.camposCompletos()) {
      const data = {
        ...this.usuario,
        nombreEmpresa:
          this.tipoRFC === 'fisica'
            ? this.usuario.nombreEmpresa
            : this.tipoRFC === 'moral'
            ? this.usuario.nombreEmpresa
            : null,
      };
  
      this.http.post('https://siinad.mx/php/registerAdminS.php', data).subscribe(
        async (response: any) => {
          if (response.success) {
            this.toastrService.showSuccess(response.message, 'Registro exitoso');
            // Limpia los campos del formulario
            this.limpiarCampos();
          } else {
            this.toastrService.showError(response.message, 'Error');
          }
        },
        (error) => {
          console.error('Error en la solicitud POST:', error);
          this.toastrService.showError(
            'Error en la solicitud de registro.',
            'Error'
          );
        }
      );
    } else {
      this.toastrService.showWarning(
        'Complete todos los campos obligatorios.',
        'Advertencia'
      );
    }
  }
  
  buscarEmpresaPorRFC() {
    this.http
      .post('https://siinad.mx/php/searchCompanies.php', {
        rfc: this.usuario.rfc,
      })
      .subscribe(
        (response: any) => {
          if (response.success) {
            this.usuario.nombreEmpresa = response.nombreEmpresa;
          } else {
            this.toastrService.showError(response.message, 'Error');
          }
        },
        (error) => {
          console.error('Error en la solicitud:', error);
        }
      );
  }

  limpiarCampos() {
    this.usuario = {
      nombreUsuario: '',
      nombreCompleto: '',
      correo: '',
      numTelefonico: '',
      contrasena: '',
      confirmarContrasena: '',
      rfc: '',
      nombreEmpresa: '',
      fechaInicio: '',
      fechaFin: '',
    };
  }

  validateRFC(event: any) {
    if (this.tipoRFC === 'fisica') {
      if (this.usuario.rfc.length >= 13) {
        this.rfcLengthError = '';
      } else {
        this.rfcLengthError = 'El RFC para persona física debe tener 13 dígitos.';
      }
    } else if (this.tipoRFC === 'moral') {
      if (this.usuario.rfc.length >= 12) {
        this.rfcLengthError = '';
      } else {
        this.rfcLengthError = 'El RFC para persona moral debe tener 12 dígitos.';
      }
    }

    if (this.usuario.rfc.length > 13 && this.tipoRFC === 'fisica') {
      this.usuario.rfc = this.usuario.rfc.substring(0, 13);
    } else if (this.usuario.rfc.length > 12 && this.tipoRFC === 'moral') {
      this.usuario.rfc = this.usuario.rfc.substring(0, 12);
    }
  }

  onEnterPressed() {
    this.registrarUsuario();
  }

  onChangeTipoRFC() {
    this.usuario.rfc = '';
    this.usuario.nombreEmpresa = '';
    this.rfcLengthError = '';
  }

  

  showMessage() {
    this.showMessageFlag = true;
  }

  hideMessage() {
    this.showMessageFlag = false;
  }

  resetMessage() {
    // Esta función se llama cuando el campo recibe el foco
    // La usaremos para restablecer el estado del mensaje
    this.showMessageFlag = false;
  }

}
