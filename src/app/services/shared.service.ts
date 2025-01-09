import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { CompanyService } from './company.service';
import { Observable } from 'rxjs';

export interface Permission {
  section: string;
  subSection?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  // Variable para almacenar los permisos cargados
  permissions: Permission[] = [];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
  ) {}

  /**
   * Cargar los permisos del usuario desde el backend.
   * Se basa en el usuario logueado y la empresa seleccionada.
   */
  loadPermissions(): Observable<any> {
    const userId = this.authService.userId;
    const companyId = this.companyService.selectedCompany?.id || '';

    if (!userId || !companyId) {
      console.warn('No se pueden cargar los permisos: falta userId o companyId.');
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    const data = { userId, companyId };
    return this.http.post('https://siinad.mx/php/loadPermissions.php', data);
  }

  /**
   * Sincroniza los permisos con el backend cada vez que cambia la empresa seleccionada.
   */
  syncPermissionsWithCompany(): void {
    this.companyService.onCompanyChange().subscribe(() => {
      this.loadPermissions().subscribe((response: any) => {
        if (response.success) {
          this.permissions = response.permissions || [];
          console.log('Permisos sincronizados:', this.permissions);
        } else {
          console.warn('Error al sincronizar permisos:', response.message);
        }
      });
    });
  }

  /**
   * Verificar si el usuario tiene un permiso específico.
   * @param section - La sección principal.
   * @param subSection - (Opcional) Sub-sección específica.
   */
hasPermission(section: string, subSection: string | null = null): boolean {
  if (subSection === null || subSection === '') {
    // Verifica permisos sin sub-sección o con sub-sección vacía
    return this.permissions.some(perm => perm.section === section && (perm.subSection === null || perm.subSection === ''));
  } else {
    // Verifica permisos con subsección específica
    return this.permissions.some(perm => perm.section === section && perm.subSection === subSection);
  }
}

  /**
   * Establecer el título según el nivel de usuario.
   * @param levelUser - Nivel de usuario de la empresa seleccionada.
   */
  setTitulo(): string {
    const levelUser = this.companyService.selectedCompany?.levelUser || '';
    switch (levelUser) {
      case 'adminS':
        return 'Configuraciones de la empresa para AdminS';
      case 'adminE':
        return 'Configuraciones de la empresa para AdminE';
      case 'adminEE':
        return 'Configuraciones de la empresa para AdminEE';
      case 'adminPE':
        return 'Configuraciones de la empresa para AdminPE';
      case 'superV':
        return 'Actualizar solicitudes de empleados';
      case 'admin':
      case 'adminU':
        return 'Solicitudes de empleados';
      default:
        return 'Configuraciones de la empresa';
    }
  }
}
