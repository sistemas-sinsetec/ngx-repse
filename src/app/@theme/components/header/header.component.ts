// header.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  NbDialogService,
  NbMediaBreakpointsService,
  NbMenuService,
  NbSidebarService,
  NbThemeService,
} from '@nebular/theme';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { PeriodService } from '../../../services/period.service';
import { LayoutService } from '../../../@core/utils';
import { map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SelectCompanyPeriodDialogComponent } from '../../../select-company-period-dialog/select-company-period-dialog.component';

@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  private destroy$: Subject<void> = new Subject<void>();
  userPictureOnly: boolean = false;

  // Logo, empresa y período
  companyLogoUrl: string = 'assets/images/default-logo.png';
  currentCompanyName: string = '';  // Para mostrar el nombre de la empresa
  currentPeriodName: string = '';  // Para mostrar el período seleccionado

  // Datos del usuario
  user: any = {
    name: 'Invitado',
    picture: 'assets/images/avatar.png',
  };

  // Lista de temas disponibles
  themes = [
    { title: 'Light', value: 'default' },
    { title: 'Dark', value: 'dark' },
    { title: 'Cosmic', value: 'cosmic' },
    { title: 'Corporate', value: 'corporate' },
  ];

  currentTheme = 'default';

  // Menú del usuario
  userMenu = [
    { title: 'Perfil' },
    {
      title: 'Cambiar Tema',
      children: [
        { title: 'Light' },
        { title: 'Dark' },
        { title: 'Cosmic' },
        { title: 'Corporate' },
      ],
    },
    { title: 'Cambiar Empresa/Periodo' },
    { title: 'Cerrar sesión' },
  ];

  constructor(
    private sidebarService: NbSidebarService,
    private menuService: NbMenuService,
    private themeService: NbThemeService,
    private layoutService: LayoutService,
    private breakpointService: NbMediaBreakpointsService,
    private authService: AuthService,
    public companyService: CompanyService,
    public periodService: PeriodService,
    private dialogService: NbDialogService
  ) { }

  ngOnInit() {
    this.currentTheme = this.themeService.currentTheme;
  
    // Cargar valores iniciales desde los servicios
    this.loadInitialCompanyAndPeriod();
  
    // Suscribirse a los cambios de empresa
    this.companyService.onCompanyChange()
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ company, logoUrl }) => {
        this.companyLogoUrl = logoUrl;
        this.currentCompanyName = company.name || ''; // Actualiza el nombre de la empresa
      });
  
    // Suscribirse a cambios en el período seleccionado
    this.periodService.periodChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe(period => {
        this.currentPeriodName = period
          ? `${period.name} - ${period.year}`
          : 'Sin período';
      });
  
    // Cargar info del usuario
    this.loadUserInfo();
  
    // Manejo del menú
    this.menuService.onItemClick()
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const item = event.item.title;
  
        if (item === 'Cerrar sesión') {
          this.logout();
        } else if (item === 'Cambiar Empresa/Periodo') {
          this.openCompanyDialog();
        } else if (
          item === 'Light' ||
          item === 'Dark' ||
          item === 'Cosmic' ||
          item === 'Corporate'
        ) {
          // El usuario eligió un tema del submenú "Cambiar Tema"
          this.onThemeSelected(item);
        }
      });
  
    // Detectar cambios de pantalla
    const { xl } = this.breakpointService.getBreakpointsMap();
    this.themeService.onMediaQueryChange()
      .pipe(
        map(([, currentBreakpoint]) => currentBreakpoint.width < xl),
        takeUntil(this.destroy$),
      )
      .subscribe(isLessThanXl => this.userPictureOnly = isLessThanXl);
  
    // Cambios en el tema
    this.themeService.onThemeChange()
      .pipe(
        map(({ name }) => name),
        takeUntil(this.destroy$),
      )
      .subscribe(themeName => this.currentTheme = themeName);
  }
  
  /**
   * Cargar los valores iniciales de la empresa y el período desde los servicios.
   */
  private loadInitialCompanyAndPeriod(): void {
    const initialCompany = this.companyService.selectedCompany;
    if (initialCompany && initialCompany.id) {
      this.companyLogoUrl = initialCompany.logoUrl || 'assets/images/default-logo.png';
      this.currentCompanyName = initialCompany.name || '';
    }
  
    const initialPeriod = this.periodService.getSelectedPeriod();
    if (initialPeriod) {
      this.currentPeriodName = `${initialPeriod.name} - ${initialPeriod.year}`;
    }
  }

  onThemeSelected(themeTitle: string) {
    // Buscar en el array `themes` el que coincida con `themeTitle`
    const foundTheme = this.themes.find(t => t.title === themeTitle);
    if (foundTheme) {
      this.changeTheme(foundTheme.value);
    }
  }


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeTheme(themeName: string) {
    this.themeService.changeTheme(themeName);
  }

  toggleSidebar(): boolean {
    this.sidebarService.toggle(true, 'menu-sidebar');
    this.layoutService.changeLayoutSize();
    return false;
  }

  navigateHome() {
    this.menuService.navigateHome();
    return false;
  }

  loadUserInfo() {
    this.user.name = this.authService.username || 'Invitado';
    this.authService.loadCurrentAvatar(this.authService.userId)
      .then(avatarUrl => {
        this.user.picture = avatarUrl;
      })
      .catch(() => {
        this.user.picture = 'assets/images/avatar.png';
      });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/auth/login';
  }

  /**
   * Abrir diálogo para seleccionar empresa y período.
   */
  openCompanyDialog() {
    this.dialogService.open(SelectCompanyPeriodDialogComponent, {
      context: {
        title: 'Selecciona Empresa y Periodo',
      },
    }).onClose.subscribe(() => {
      // Actualizar el período seleccionado después de cerrar el diálogo
      this.currentPeriodName = this.periodService.selectedPeriod
        ? `${this.periodService.selectedPeriod.name} - ${this.periodService.selectedPeriod.year}`
        : 'Sin período';
    });
  }
}
