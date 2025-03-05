import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { CompanyService } from './company.service';
import { PeriodService } from './period.service';
import { SharedService } from './shared.service'; // Maneja permisos
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AppConfigService {

  private isInitialized = false; // Para evitar cargas múltiples

  constructor(
    private authService: AuthService,
    private companyService: CompanyService,
    private periodService: PeriodService,
    private sharedService: SharedService,
    private router: Router,
    private http: HttpClient,
  ) { }

  /**
   * Método principal de inicialización.
   * Se encarga de verificar la sesión, cargar datos básicos de usuario,
   * empresas, periodos y permisos, SOLO si no se ha inicializado ya.
   */
  async initializeApp() {
    if (this.isInitialized) {
      console.log('AppConfigService: La configuración ya fue cargada. Omitiendo carga adicional.');
      return;
    }

    // 1. Verificar token y estado de sesión
    const isLoggedIn = this.authService.isLoggedIn;
    if (!isLoggedIn) {
      console.log('AppConfigService: No hay sesión activa. Redirigiendo al login.');
      this.router.navigate(['/auth/login']);
      return;
    }

    // 2. Cargar avatar del usuario
    try {
      const avatarUrl = await this.authService.loadCurrentAvatar(this.authService.userId);
      console.log('AppConfigService: Avatar cargado:', avatarUrl);
    } catch (error) {
      console.error('AppConfigService: Error al cargar avatar:', error);
    }

    // 3. Cargar empresas principales (si no estaban cargadas)
    // Esto asume que las empresas podrían haberse guardado en localStorage durante el login
    // Pero si necesitas cargarlas de la API de nuevo, ajusta la lógica en CompanyService.
    console.log('AppConfigService: Empresas principales actuales:', this.companyService.principalCompanies);

    // 4. Cargar empresas no principales (opcional, si la app lo requiere al inicio)
    // Por ejemplo, si tu selectedId ya está seteado en CompanyService:
    if (this.companyService.selectedCompany.id) {
      this.companyService.loadNonPrincipalCompanies(this.companyService.selectedCompany.id)
        .subscribe((resp: any) => {
          if (resp.success) {
            this.companyService.setNonPrincipalCompanies(resp.nonPrincipalCompanies);
            console.log('AppConfigService: Empresas no principales:', resp.nonPrincipalCompanies);
          }
        });
    }

    // 5. Cargar periodos (opcional, si tu app lo necesita desde el arranque)
    if (this.companyService.selectedCompany.id) {
      try {
        const data = await this.periodService.loadPeriodTypes(this.companyService.selectedCompany.id);
        console.log('AppConfigService: Tipos de periodos cargados:', data);
      } catch (error) {
        console.error('AppConfigService: Error al cargar tipos de periodos:', error);
      }
    }

    // 6. Cargar permisos (opcional si lo requieres al inicio)
    // O puedes cargar permisos al entrar a ciertos módulos.
    // El SharedService carga permisos basados en userId y selectedId
    this.sharedService.loadPermissions().subscribe((resp: any) => {
      if (resp.success) {
        this.sharedService.permissions = resp.permissions.map((perm: any) => ({
          section: perm.section,
          subSection: perm.subSection,
        }));
        console.log('AppConfigService: Permisos cargados:', this.sharedService.permissions);
      } else {
        console.log('AppConfigService: Error al cargar permisos:', resp.message);
      }
    });

    // 7. Marcar la app como inicializada para que no se cargue todo otra vez
    this.isInitialized = true;

    console.log('AppConfigService: Configuración inicial cargada.');
  }
}
