import { Component, OnInit } from '@angular/core';
import { MENU_ITEMS } from './pages-menu';
import { SharedService } from '../services/shared.service'; // Importa SharedService
import { NbMenuItem } from '@nebular/theme'; // Importa el tipo NbMenuItem
import { CustomMenuItem } from './custom-menu-item'; // Importa la clase personalizada
import { CompanyService } from '../services/company.service'; // Importa CompanyService

@Component({
  selector: 'ngx-pages',
  styleUrls: ['pages.component.scss'],
  template: `
    <ngx-one-column-layout>
      <nb-menu [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-one-column-layout>
  `,
})
export class PagesComponent implements OnInit {
  menu: NbMenuItem[] = []; // Inicializa como arreglo vacío

  constructor(
    private sharedService: SharedService, // Inyecta el SharedService
    private companyService: CompanyService, // Inyecta el CompanyService
  ) {}

  ngOnInit(): void {
    // Cargar el menú al iniciar
    this.loadMenu();

    // Escuchar cambios de empresa
    this.companyService.onCompanyChange().subscribe(() => {
      this.loadMenu();
    });
  }

  /**
   * Carga el menú filtrando los elementos según los permisos y el levelUser.
   */
  loadMenu(): void {
    this.sharedService.loadPermissions().subscribe((response: any) => {
      // Guarda los permisos en el servicio
      this.sharedService.permissions = response.permissions || [];

      // Filtra el menú según los permisos cargados y el levelUser
      this.menu = this.filterMenuItems(MENU_ITEMS);
    });
  }

  /**
   * Filtra el menú basado en los permisos del usuario y el levelUser.
   * @param items Lista de elementos del menú
   * @returns Elementos filtrados
   */
  filterMenuItems(items: CustomMenuItem[]): CustomMenuItem[] {
    const levelUser = this.companyService.selectedCompany?.levelUser || '';
    console.log('LevelUser actual:', levelUser);
  
    return items
      .map((item) => {
        console.log('Procesando elemento:', item.title);
  
        // 1. Verificar si el elemento padre cumple con el requiredLevel
        if (item.requiredLevel && !item.requiredLevel.includes(levelUser)) {
          console.log(`Elemento "${item.title}" oculto por levelUser incorrecto.`);
          return null; // Oculta el elemento padre y todos sus hijos
        }
  
        // 2. Filtrar los hijos si existen
        if (item.children) {
          const filteredChildren = this.filterMenuItems(item.children);
          if (filteredChildren.length === 0) {
            return null; // Si no hay hijos válidos, oculta el padre
          }
          return { ...item, children: filteredChildren };
        }
  
        // 3. Verificar permisos solo si no es un grupo
        if (item.permission && !item.group) {
          const hasPermission = this.sharedService.hasPermission(
            item.permission.section,
            item.permission.subSection,
          );
          if (!hasPermission) {
            console.log(`Elemento "${item.title}" oculto por falta de permisos.`);
            return null;
          }
        }
  
        return item;
      })
      .filter((item) => item !== null) as CustomMenuItem[];
  }
}