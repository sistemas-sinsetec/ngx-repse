import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NbDialogService } from '@nebular/theme';
import { AuthService } from '../services/auth.service';
import { CompanyService } from '../services/company.service';  // <-- Importa tu servicio de empresas
import { PeriodService } from '../services/period.service'; // si lo necesitas
import { SelectCompanyPeriodDialogComponent } from '../select-company-period-dialog/select-company-period-dialog.component'; 
import { CustomToastrService } from '../services/custom-toastr.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  user = {
    username: '',
    password: '',
    rememberMe: false,
  };

  showMessages = { error: false, success: false };
  errors: string[] = [];
  messages: string[] = [];
  submitted = false;
  rememberMe = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    private authService: AuthService,
    private companyService: CompanyService, // <-- Inyecta tu servicio de empresas
    private periodService: PeriodService, // si lo necesitas
    private dialogService: NbDialogService,
  ) {}

  ngOnInit() {
    // Si el usuario ya está logueado, redirige directamente
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/pages']);
    }
  }

  login() {
    this.submitted = true;
    this.errors = [];
    this.messages = [];

    if (!this.user.username || !this.user.password) {
      this.toastrService.showError('Por favor, ingresa tu usuario y contraseña', 'Error');
      this.submitted = false;
      return;
    }

    // Preparar datos para enviar al backend
    const data = new FormData();
    data.append('username', this.user.username);
    data.append('password', this.user.password);

    // Hacer la solicitud al backend
    this.http.post('https://siinad.mx/php/login.php', data).subscribe(
      (response: any) => {
        this.submitted = false;
        if (response.success) {
          // 1. Manejar la parte de autenticación
          this.authService.login(
            this.user.username,  // o response.username si te lo regresa el backend
            response.userId,
            response.avatar,
            response.employee_id,
          );

          // 2. Manejar las empresas principales en CompanyService
          if (response.principalCompanies) {
            console.log('Empresas recibidas en login:', response.principalCompanies);
            this.companyService.setPrincipalCompanies(response.principalCompanies);
            console.log('Empresas en companyService:', this.companyService.principalCompanies);
          }

          // 3. (Opcional) Manejar periodos o lógica extra
          // if (response.periods) {
          //   this.periodService.setPeriods(response.periods);
          // }

          // 4. Navegar a la página principal
          this.router.navigate(['/pages']).then(() => {
            this.openCompanyPeriodDialog();
          });
        } else {
          // Muestra error devuelto por el servidor
          this.showMessages.error = true;
          this.errors.push(response.message);
        }
      },
      (error) => {
        this.submitted = false;
        this.showMessages.error = true;
        this.errors.push('Error al iniciar sesión. Inténtalo nuevamente.');
      }
    );
  }

  getConfigValue(key: string): any {
    const config = {
      'forms.validation.password.minLength': 6,
      'forms.validation.password.maxLength': 20,
    };
    return config[key];
  }

  openCompanyPeriodDialog() {
    this.dialogService.open(SelectCompanyPeriodDialogComponent, {
      closeOnBackdropClick: false,
      closeOnEsc: false,
    })
    .onClose.subscribe(selectedData => {
      if (selectedData) {
        // selectedData => { companyId, periodId }
        console.log('Selección del diálogo:', selectedData);
  
        // Asignar la empresa y el período en tus servicios
        const foundCompany = this.companyService.principalCompanies
          .find(c => c.id === selectedData.companyId);
        if (foundCompany) {
          this.companyService.selectAndLoadCompany(foundCompany)
            .then(logoUrl => console.log('Logo cargado:', logoUrl));
        }
  
        // Asignar el período en PeriodService
        const foundPeriod = this.periodService.periodTypes
          .find(p => p.id === selectedData.periodId);
        if (foundPeriod) {
          this.periodService.setSelectedPeriod(foundPeriod);
        }
      }
    });
  }
}
