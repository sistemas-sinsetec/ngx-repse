import { Component, OnInit } from '@angular/core';
import { MENU_ITEMS } from './pages-menu';
import { SharedService } from '../services/shared.service'; // Importa SharedService
import { NbMenuItem } from '@nebular/theme'; // Importa el tipo NbMenuItem
import { CustomMenuItem } from './custom-menu-item'; // Importa la clase personalizada

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

  constructor(private sharedService: SharedService) {} // Inyecta el SharedService

  ngOnInit(): void {
    this.loadMenu(); // Carga los permisos al iniciar
  }

  /**
   * Carga el menú filtrando los elementos según los permisos.
   */
  loadMenu(): void {
    this.sharedService.loadPermissions().subscribe((response: any) => {
      // Guarda los permisos en el servicio
      this.sharedService.permissions = response.permissions || [];

      // Filtra el menú según los permisos cargados
      this.menu = this.filterMenuItems(MENU_ITEMS);
    });
  }

  /**
   * Filtra el menú basado en los permisos del usuario.
   * @param items Lista de elementos del menú
   * @returns Elementos filtrados
   */
  filterMenuItems(items: CustomMenuItem[]): CustomMenuItem[] {
    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = this.filterMenuItems(item.children);
          return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
        }

        // Filtra según permisos
        if (item.permission) {
          return this.sharedService.hasPermission(
            item.permission.section,
            item.permission.subSection,
          )
            ? item
            : null;
        }

        return item; // Si no requiere permisos, se incluye por defecto
      })
      .filter((item) => item !== null) as CustomMenuItem[];
  }
}