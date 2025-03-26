import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NbDialogService } from '@nebular/theme';
import { RegistroModalComponentP } from '../registro-modal/registro-modal.component';
import { AuthService } from '../../../../services/auth.service';
import { PhoneNumberUtil } from 'google-libphonenumber';
import { CompanyInfoModalComponent } from '../company-info-modal/company-info-modal.component';
import { CompanyService } from '../../../../services/company.service';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

@Component({
  selector: 'ngx-business-partner-register',
  templateUrl: './business-partner-register.component.html',
  styleUrls: ['./business-partner-register.component.scss'],
})
export class BusinessPartnerRegisterComponent implements OnInit {



  usuario = {
    nombreUsuario: '',
    nombreCompleto: '',
    correo: '',
    numTelefonico: '',
    contrasena: '',
    confirmarContrasena: '',
    rfc: '',
    roleInCompany: '',
    nombreEmpresa: '',
    fechaInicio: '',
    fechaFin: '',
    empresaLigada: '',
  };

  showMessageFlag: boolean = false;
  tipoRFC: string = 'fisica';
  rfcLengthError: string = '';
  prefijo: string;
  prefijos: { codigo: string; pais: string }[] = [];
  phoneNumberUtil: PhoneNumberUtil;
  telefonoError: string = '';
  codigoSocioComercial: string;
  registerMode: string = 'register';
  rolesDisponibles: any[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    private dialogService: NbDialogService,
    private authService: AuthService,
    private companyService: CompanyService
  ) {
    this.phoneNumberUtil = PhoneNumberUtil.getInstance();
    this.obtenerPrefijos();
  }

  ngOnInit() {
    this.registerMode = 'register';
    this.obtenerRoles();
  }

  obtenerPrefijos() {
    const regionCodes = this.phoneNumberUtil.getSupportedRegions();
    this.prefijos = regionCodes.map((regionCode) => {
      const countryCode =
        '+' + this.phoneNumberUtil.getCountryCodeForRegion(regionCode);
      const countryName = this.getCountryName(regionCode);
      return { codigo: countryCode, pais: countryName };
    });
    this.prefijos.sort((a, b) => parseInt(a.codigo) - parseInt(b.codigo));
  }

  getCountryName(regionCode: string): string {
    return regionCode;
  }

  onChangeTipoRFC() {
    this.usuario.rfc = '';
    this.usuario.nombreEmpresa = '';
    this.rfcLengthError = '';
  }
  

  buscarEmpresaPorRFC() {
    this.http.post('https://siinad.mx/php/searchCompanies.php', { rfc: this.usuario.rfc }).subscribe(
      async (response: any) => {
        if (response.success) {
          this.usuario.nombreEmpresa = response.nombreEmpresa;
        } else {
          await this.toastrService.showError(response.message, 'danger');
        }
      },
      error => {
        console.error('Error en la solicitud:', error);
      }
    );
  }

  hideMessage() {
    this.showMessageFlag = false;
  }
  
  resetMessage() {
    this.showMessageFlag = false;
  }

  showMessage() {
    this.showMessageFlag = true;
  }

  validateRFC(event: Event): void {
    const input = (event.target as HTMLInputElement).value.toUpperCase();
    this.usuario.rfc = input;
  
    // Limitar longitud del RFC dependiendo del tipo
    if (this.tipoRFC === 'fisica' && this.usuario.rfc.length > 13) {
      this.usuario.rfc = this.usuario.rfc.substring(0, 13);
    } else if (this.tipoRFC === 'moral' && this.usuario.rfc.length > 12) {
      this.usuario.rfc = this.usuario.rfc.substring(0, 12);
    }
  
    // Expresiones regulares para validar RFC
    const rfcFisicaRegex = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;
    const rfcMoralRegex = /^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/;
  
    // Validar formato y mostrar mensaje de error
    if (this.tipoRFC === 'fisica') {
      if (!rfcFisicaRegex.test(this.usuario.rfc)) {
        this.rfcLengthError = 'El RFC para persona física debe tener 13 caracteres y cumplir el formato.';
      } else {
        this.rfcLengthError = '';
      }
    } else if (this.tipoRFC === 'moral') {
      if (!rfcMoralRegex.test(this.usuario.rfc)) {
        this.rfcLengthError = 'El RFC para persona moral debe tener 12 caracteres y cumplir el formato.';
      } else {
        this.rfcLengthError = '';
      }
    }
  }
  

  async camposCompletos(): Promise<boolean> {
    const regexPuntoCom = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
    return (
      typeof this.usuario.nombreUsuario === 'string' &&
      this.usuario.nombreUsuario.trim() !== '' &&
      typeof this.usuario.nombreCompleto === 'string' &&
      this.usuario.nombreCompleto.trim() !== '' &&
      typeof this.usuario.correo === 'string' &&
      this.usuario.correo.trim() !== '' &&
      typeof this.usuario.numTelefonico === 'string' &&
      this.usuario.numTelefonico.trim() !== '' &&
      typeof this.usuario.contrasena === 'string' &&
      this.usuario.contrasena.trim() !== '' &&
      typeof this.usuario.nombreEmpresa === 'string' &&
      this.usuario.nombreEmpresa.trim() !== '' &&
      typeof this.usuario.roleInCompany === 'string' &&
      this.usuario.roleInCompany.trim() !== '' &&
      this.usuario.correo.includes('@') &&
      regexPuntoCom.test(this.usuario.correo) &&
      this.usuario.contrasena === this.usuario.confirmarContrasena &&
      this.validarTelefono() &&
      this.rfcLengthError === '' // Asegura que el RFC sea válido
    );
  }
  

  validarTelefono(): boolean {
    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(this.usuario.numTelefonico)) {
      this.telefonoError =
        'El número de teléfono debe tener exactamente 10 dígitos numéricos.';
      return false;
    } else {
      this.telefonoError = '';
      return true;
    }
  }

  filterRFCInput(event: KeyboardEvent): void {
    const key = event.key.toUpperCase(); // Convertimos a mayúsculas
    const input = event.target as HTMLInputElement;
    const position = input.value.length;
  
    if (this.tipoRFC === 'fisica') {
      if (position < 4) {
        // Solo permite letras A-Z, Ñ y &
        if (!/^[A-ZÑ&]$/.test(key)) {
          event.preventDefault();
        }
      } else if (position >= 4 && position < 10) {
        // Solo permite números del 0 al 9
        if (!/^\d$/.test(key)) {
          event.preventDefault();
        }
      } else if (position >= 10 && position < 13) {
        // Permite letras A-Z o números
        if (!/^[A-Z\d]$/.test(key)) {
          event.preventDefault();
        }
      } else {
        event.preventDefault(); // Evita escribir más de 13 caracteres
      }
    } else if (this.tipoRFC === 'moral') {
      if (position < 3) {
        // Solo permite letras en las primeras 3 posiciones
        if (!/^[A-ZÑ&]$/.test(key)) {
          event.preventDefault();
        }
      } else if (position >= 3 && position < 9) {
        // Solo permite números en la fecha de constitución
        if (!/^\d$/.test(key)) {
          event.preventDefault();
        }
      } else if (position >= 9 && position < 12) {
        // Permite letras o números
        if (!/^[A-Z\d]$/.test(key)) {
          event.preventDefault();
        }
      } else {
        event.preventDefault(); // Evita escribir más de 12 caracteres
      }
    }
  }
  

  async registrarUsuario() {
    if (await this.camposCompletos()) {
      const data = {
        idUser: this.authService.userId,
        nombreUsuario: this.usuario.nombreUsuario,
        nombreCompleto: this.usuario.nombreCompleto,
        correo: this.usuario.correo,
        numTelefonico: this.usuario.numTelefonico,
        contrasena: this.usuario.contrasena,
        rfc: this.usuario.rfc,
        roleInCompany: this.usuario.roleInCompany,
        nombreEmpresa:
          this.tipoRFC === 'fisica'
            ? this.usuario.nombreEmpresa
            : this.tipoRFC === 'moral'
            ? this.usuario.nombreEmpresa
            : null,
        fechaInicio: this.usuario.fechaInicio,
        fechaFin: this.usuario.fechaFin,
        empresaLigada: this.companyService.selectedCompany.name,
      };

      this.http.post('https://siinad.mx/php/registrar.php', data).subscribe(
        async (response: any) => {
          if (response.success) {
            this.toastrService.showSuccess(response.message, 'success');

            const dialogRef = this.dialogService.open(RegistroModalComponentP, {
              context: { continuarRegistro: false },
            });

            dialogRef.onClose.subscribe((result) => {
              if (result.continuarRegistro) {
                this.limpiarCampos();
              } else {
                this.router.navigate(['/home']);
              }
            });
          } else {
            this.toastrService.showError(response.message, 'danger');
          }
        },
        async (error) => {
          console.error('Error en la solicitud POST:', error);
          this.toastrService.showError('Error en la solicitud de registro.', 'danger');
        }
      );
    } else {
      this.toastrService.showWarning(
        'Por favor complete todos los campos obligatorios y verifique el correo electrónico y la contraseña.',
        'warning'
      );
    }
  }

  async openUserInfoModal() {
    if (!this.codigoSocioComercial || this.codigoSocioComercial.trim() === '') {
      this.toastrService.showWarning(
        'Código de socio comercial no proporcionado.',
        'warning'
      );
      return;
    }

    const url = `https://siinad.mx/php/load_company_association.php?codigoEmpresa=${this.codigoSocioComercial}`;

    this.http.get(url).subscribe(
      (response: any) => {
        if (response.error) {
          this.toastrService.showError(response.error, 'danger');
          return;
        }

        if (!response || response.length === 0) {
          this.toastrService.showWarning(
            'No se encontraron datos de asociación.',
            'warning'
          );
          return;
        }

        this.dialogService.open(CompanyInfoModalComponent, {
          context: { companyData: response },
        });
      },
      (error) => {
        console.error('Error al cargar la asociación:', error);
        this.toastrService.showError(
          'Error al cargar la asociación. Inténtalo de nuevo más tarde.',
          'danger'
        );
      }
    );
  }


  obtenerRoles() {
    this.http.get('https://siinad.mx/php/getRoles.php').subscribe(
      (response: any) => {
        this.rolesDisponibles = response;
      },
      (error) => {
        console.error('Error al obtener los roles:', error);
        this.toastrService.showError('Error al obtener los roles', 'danger');
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
      roleInCompany: '',
      nombreEmpresa: '',
      fechaInicio: '',
      fechaFin: '',
      empresaLigada: '',
    };
  }
}
