/*
  En este codigo se administran los datos de la sesion referentes a la empresa actual
*/
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { NbComponentStatus } from '@nebular/theme';

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  // Datos principales de la empresa
  principalCompanies: any[] = [];
  nonPrincipalCompanies: any[] = [];

  // Datos de la empresa seleccionada
  selectedCompany: any = null;

  // Subject para emitir cambios
  private companyChange$ = new Subject<{ company: any; logoUrl: string }>();

  constructor(private http: HttpClient) {
    // Cargar las empresas principales almacenadas en localStorage
    this.loadMappedPrincipalCompanies();

    // Cargar la empresa seleccionada desde localStorage
    this.loadSelectedCompanyFromLocalStorage();
  }

  /**
   * Observable para escuchar cambios de empresa
   */
  onCompanyChange(): Observable<{ company: any; logoUrl: string }> {
    return this.companyChange$.asObservable();
  }

  /**
   * Cargar empresas principales desde localStorage
   */
  loadMappedPrincipalCompanies(): void {
    const mappedPrincipalCompaniesString = localStorage.getItem('mappedPrincipalCompanies');
    if (mappedPrincipalCompaniesString) {
      this.principalCompanies = JSON.parse(mappedPrincipalCompaniesString);
      console.log('Empresas principales desde localStorage:', this.principalCompanies);
    } else {
      this.principalCompanies = [];
    }
  }

  /**
   * Guardar empresas principales en memoria y localStorage
   */
  setPrincipalCompanies(companies: any[]): void {
    // Mapear los datos recibidos
    const mapped = companies.map(c => ({
      id: c.idCompany,
      name: c.nameCompany,
      role: c.roleInCompany,
      rfc: c.rfcIncompany,
      levelUser: c.levelUser,
    }));

    this.principalCompanies = mapped;
    localStorage.setItem('mappedPrincipalCompanies', JSON.stringify(mapped));
    console.log('Empresas principales actualizadas (mapeadas):', this.principalCompanies);
  }

  /**
   * Guardar empresas no principales en memoria
   */
  setNonPrincipalCompanies(companies: any[]): void {
    this.nonPrincipalCompanies = companies;
    console.log('Empresas no principales actualizadas:', this.nonPrincipalCompanies);
  }

  /**
   * Obtener empresas no principales desde el backend
   */
  loadNonPrincipalCompanies(companyId: string): Observable<any> {
    const data = { company_id: companyId };
    return this.http.post('https://siinad.mx/php/loadCompanies.php', data);
  }

  /**
   * Guardar la empresa seleccionada
   */
  setSelectedCompany(company: any): void {
    this.selectedCompany = {
      id: company.id || '',
      name: company.name || '',
      rfc: company.rfc || '',
      levelUser: company.levelUser || '',
      role: company.role || '',
      logoUrl: company.logoUrl || '', // Se asignará posteriormente
    };

    console.log('Empresa seleccionada:', this.selectedCompany);
  }

  /**
   * Obtener el logo de la empresa desde el backend
   */
  loadCompanyLogo(companyId: string): Promise<string> {
    return this.http
      .get(`https://siinad.mx/php/getCompanyLogo.php?companyId=${companyId}`)
      .toPromise()
      .then((response: any) => {
        if (response && response.logoUrl) {
          console.log('Logo cargado:', response.logoUrl);
          return response.logoUrl;
        }
        console.error('Falta el logoUrl:', response);
        return 'assets/images/default-logo.png';
      })
      .catch((error) => {
        console.error('Error al cargar el logo:', error);
        return 'assets/images/default-logo.png';
      });
  }

  /**
   * Cargar la empresa seleccionada desde localStorage
   */
  async loadSelectedCompanyFromLocalStorage(): Promise<void> {
    const selectedCompanyString = localStorage.getItem('selectedCompany');

    if (selectedCompanyString) {
      this.selectedCompany = JSON.parse(selectedCompanyString);

      // Emitir el cambio con los datos actuales
      this.companyChange$.next({
        company: { id: this.selectedCompany.id, name: this.selectedCompany.name },
        logoUrl: this.selectedCompany.logoUrl || 'assets/images/default-logo.png',
      });

      console.log('Empresa seleccionada cargada desde localStorage:', this.selectedCompany);
    }
  }

  /**
   * Actualizar el logo en el servicio y en el almacenamiento local
   */
  updateLogo(newLogoUrl: string): void {
    if (this.selectedCompany) {
      // Actualizar el logo en el servicio
      this.selectedCompany.logoUrl = newLogoUrl;

      // Guardar el objeto completo de la empresa en localStorage
      localStorage.setItem('selectedCompany', JSON.stringify(this.selectedCompany));

      // Emitir el cambio
      this.companyChange$.next({
        company: { id: this.selectedCompany.id, name: this.selectedCompany.name },
        logoUrl: this.selectedCompany.logoUrl,
      });

      console.log('Logo actualizado en el servicio y en localStorage:', this.selectedCompany);
    }
  }

  /**
   * ========================
   * MÉTODO UNIFICADO
   * ========================
   * Selecciona una empresa, carga las empresas no principales y el logo,
   * guarda todo en localStorage y emite el cambio a través del Subject.
   */
  async selectAndLoadCompany(company: any): Promise<void> {
    // 1. Asignar la empresa seleccionada
    this.setSelectedCompany(company);

    // 2. Cargar empresas no principales asociadas
    try {
      const response: any = await this.loadNonPrincipalCompanies(company.id).toPromise();

      if (response && response.success) {
        const mappedCompanies = response.nonPrincipalCompanies.map((c: any) => ({
          id: c.idAssociation,
          name: c.nameCompany,
          role: c.roleInCompany,
          rfc: c.rfcIncompany,
          status: c.statusCompany,
          levelUser: c.levelUser,
        }));
        this.setNonPrincipalCompanies(mappedCompanies);
        console.log('Empresas no principales asociadas:', this.nonPrincipalCompanies);
      } else {
        console.error('Error cargando empresas no principales:', response?.message);
      }

      // 3. Cargar el logo y actualizar el objeto seleccionado
      const logoUrl = await this.loadCompanyLogo(company.id);
      this.selectedCompany.logoUrl = logoUrl;

      // 4. Guardar el objeto completo de la empresa en localStorage
      localStorage.setItem('selectedCompany', JSON.stringify(this.selectedCompany));

      // 5. Emitir el cambio
      this.companyChange$.next({
        company: { id: this.selectedCompany.id, name: this.selectedCompany.name },
        logoUrl: this.selectedCompany.logoUrl,
      });

    } catch (error) {
      console.error('Error al cargar información de la empresa:', error);
      const fallbackLogo = 'assets/images/default-logo.png';
      this.selectedCompany.logoUrl = fallbackLogo;

      // Guardar el objeto completo de la empresa en localStorage
      localStorage.setItem('selectedCompany', JSON.stringify(this.selectedCompany));

      this.companyChange$.next({
        company: { id: this.selectedCompany.id, name: this.selectedCompany.name },
        logoUrl: fallbackLogo,
      });
    }
  }
}