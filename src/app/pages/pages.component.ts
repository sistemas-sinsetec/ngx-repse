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
  
    // Primer filtrado: se eliminan ítems según permisos, requiredLevel y children.
    const filtered = items
      .map((item) => {
        // Si el item tiene restricción de nivel y no coincide, se descarta.
        if (item.requiredLevel && !item.requiredLevel.includes(levelUser)) {
          return null;
        }
  
        // Si el ítem tiene hijos, se filtran recursivamente.
        if (item.children) {
          const filteredChildren = this.filterMenuItems(item.children);
          if (filteredChildren.length === 0) {
            return null; // Si después del filtrado no quedan hijos, se descarta el padre.
          }
          return { ...item, children: filteredChildren };
        }
  
        // Si el ítem requiere permiso y no es un grupo, se verifica el permiso.
        if (item.permission && !item.group) {
          const hasPermission = this.sharedService.hasPermission(
            item.permission.section,
            item.permission.subSection,
          );
          if (!hasPermission) {
            return null;
          }
        }
  
        // Si no cumple ninguna condición de eliminación, se devuelve el ítem.
        return item;
      })
      .filter((item) => item !== null) as CustomMenuItem[];
  
    // Segundo filtrado: se eliminan los grupos sin secciones.
    // Dado que en tu estructura los títulos (grupos) son elementos separados,
    // se recorre el arreglo filtrado y se descartan aquellos grupos que no tienen un ítem de sección a continuación.
    const finalFiltered: CustomMenuItem[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const currentItem = filtered[i];
      if (currentItem.group) {
        // Se asume que los ítems pertenecientes al grupo son los que siguen hasta encontrar otro grupo o llegar al final.
        let j = i + 1;
        let foundSection = false;
        while (j < filtered.length && !filtered[j].group) {
          // Si se encuentra al menos un elemento que no es grupo, se considera que el grupo tiene secciones.
          foundSection = true;
          break;
        }
        if (foundSection) {
          finalFiltered.push(currentItem);
        }
        // Si no se encontró ningún ítem, se omite el grupo.
      } else {
        finalFiltered.push(currentItem);
      }
    }
  
    return finalFiltered;
  }
  
  
}