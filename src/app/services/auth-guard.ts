/*
  En este codigo se administra la logica para aplicar permisos a las diferentes rutas
*/
import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SharedService } from '../services/shared.service';
import { CompanyService } from '../services/company.service';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state) => {
  const authService = inject(AuthService);
  const companyService = inject(CompanyService);
  const sharedService = inject(SharedService);
  const router = inject(Router);

  // Verifica si el usuario está autenticado
  if (!authService.isLoggedIn) {
    console.warn('Usuario no autenticado, redirigiendo a login.');
    router.navigate(['/login']);
    return false;
  }

  const userId = authService.userId;
  const companyId = companyService.selectedCompany?.id || null;

  if (!userId || isNaN(parseInt(userId))) {
    console.warn('User ID no válido.');
    router.navigate(['/login']);
    return false;
  }

  if (!companyId) {
    console.warn('No se ha seleccionado una empresa.');
    router.navigate(['/select-company']);
    return false;
  }

  // Extraer la sección y subsección requeridas desde los datos de la ruta
  const requiredSection = route.data?.['section'] || null;
  const requiredSubSection = route.data?.['subSection'] || null;

  // Si no se requiere un permiso específico, permitir el acceso
  if (!requiredSection) {
    return true;
  }

  // Si los permisos ya están cargados, proceder con la verificación
  if (sharedService.permissions.length > 0) {
    return checkPermissions(requiredSection, requiredSubSection, sharedService, router);
  }

  // Cargar permisos desde el backend si no están en memoria
  return sharedService.loadPermissions().pipe(
    map(() => checkPermissions(requiredSection, requiredSubSection, sharedService, router))
  );
};

// **Función para verificar los permisos**
function checkPermissions(
  section: string,
  subSection: string | null,
  sharedService: SharedService,
  router: Router
): boolean {
  if (sharedService.hasPermission(section, subSection)) {
    return true;
  } else {
    console.warn(`Acceso denegado: No tienes permiso para la sección "${section}" y subsección "${subSection}".`);
    router.navigate(['/unauthorized']);
    return false;
  }
}
