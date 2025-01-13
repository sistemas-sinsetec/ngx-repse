import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NbToastrService, NbDialogService } from '@nebular/theme';
import { RegistroModalComponent } from '../registro-modal/registro-modal.component';

@Component({
  selector: 'app-register-admin-s',
  templateUrl: './register-admin-s.component.html',
  styleUrls: ['./register-admin-s.component.scss'],
})
export class RegisterAdminSComponent implements OnInit {
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

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  showMessageFlag: boolean = false;
  tipoRFC: string = 'fisica';
  rfcLengthError: string = '';

  labelAdminEmpresas: string;
  labelIngreseDatosParaContinuar: string;
  labelTipoRFC: string;
  labelPersonaFisica: string;
  labelPersonaMoral: string;
  labelRFC: string;
  labelComoApareceConstanciaFiscal: string;
  labelAliasUsuario: string;
  labelNombreCompletoUsuario: string;
  labelCorreo: string;
  labelValidacionCorreo: string;
  labelContrasena: string;
  labelConfirmarContrasena: string;
  labelFechaInicioPeriodo: string;
  labelFechaFinPeriodo: string;
  ButtonRegistrar: string;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: NbToastrService,
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
            this.toastrService.success(response.message, 'Registro exitoso');
            const dialogRef = this.dialogService.open(RegistroModalComponent, {
              context: { continuarRegistro: false },
            });

            dialogRef.onClose.subscribe((data) => {
              if (data?.continuarRegistro) {
                this.limpiarCampos();
              } else {
                this.router.navigate(['/home']);
              }
            });
          } else {
            this.toastrService.danger(response.message, 'Error');
          }
        },
        (error) => {
          console.error('Error en la solicitud POST:', error);
          this.toastrService.danger(
            'Error en la solicitud de registro.',
            'Error'
          );
        }
      );
    } else {
      this.toastrService.warning(
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
            this.toastrService.danger(response.message, 'Error');
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
}
