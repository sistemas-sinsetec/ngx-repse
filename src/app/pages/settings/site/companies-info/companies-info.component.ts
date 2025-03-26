// companies-info.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EditCompanyModalComponent } from '../edit-company-modal/edit-company-modal.component';
import { NbDialogService } from '@nebular/theme';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CompanyService } from '../../../../services/company.service';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

@Component({
  selector: 'ngx-companies-info',
  templateUrl: './companies-info.component.html',
  styleUrls: ['./companies-info.component.scss']
})
export class CompaniesInfoComponent implements OnInit, OnDestroy {
  logoUrl: string = ''
  companies: any[] = [];
  filteredCompanies: any[] = [];
  searchTerm: string = '';
  searchField: string = 'nameCompany'; // Campo de búsqueda por defecto
  searchPlaceholder: string = 'Buscar...'; // Placeholder por defecto

  // Paginación
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;

  // Para manejar debounce en la búsqueda
  private searchSubject: Subject<string> = new Subject();
  private searchSubscription: Subscription;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    private dialogService: NbDialogService,
    private companyService: CompanyService,
  ) { }

  ngOnInit() {
    this.obtenerEmpresas();

    // Suscribirse al Subject para implementar debounce
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300), // Espera 300ms después del último evento
      distinctUntilChanged()
    ).subscribe(() => {
      this.filterCompanies();
    });

    this.companyService.onCompanyChange().subscribe((data) => {
      this.logoUrl = data.logoUrl;
      console.log('Logo recibido:', this.logoUrl);
    });
  }

  /**
   * Obtiene la lista de empresas desde el backend.
   */
  obtenerEmpresas() {
    this.http.get<any[]>('https://siinad.mx/php/companies-info.php')
      .subscribe(
        (data: any[]) => {
          // Filtrar empresas según el nivel de usuario
          this.companies = data.filter(company =>
            ['adminE', 'adminEE', 'adminPE'].includes(company.levelUserName)
          );
          this.filteredCompanies = [...this.companies];
          this.totalItems = this.filteredCompanies.length;
        },
        (error) => {
          console.error('Error al obtener los datos de las empresas:', error);
          this.toastrService.showError('Error al obtener los datos de las empresas.', 'error');
        }
      );
  }

  /**
   * Filtra las empresas según el término de búsqueda y el campo seleccionado.
   */
  filterCompanies() {
    if (!this.searchTerm) {
      this.filteredCompanies = [...this.companies];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredCompanies = this.companies.filter(company => {
        const fieldValue = company[this.searchField];

        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }

        // Manejar diferentes tipos de campos
        switch (this.searchField) {
          case 'fecha_inicio':
          case 'fecha_fin':
            // Convertir a string de fecha
            const dateValue = new Date(fieldValue).toLocaleDateString('en-CA'); // Formato 'yyyy-mm-dd'
            return dateValue.includes(term);
          case 'isPremium':
            return (company.isPremium ? 'sí' : 'no').includes(term);
          default:
            return fieldValue.toString().toLowerCase().includes(term);
        }
      });
    }
    this.totalItems = this.filteredCompanies.length;
    this.currentPage = 1; // Reiniciar a la primera página
  }

  /**
   * Método llamado al hacer clic en el botón de búsqueda.
   */
  buscarEmpresas() {
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Formatea la entrada de fecha si se está buscando por fecha.
   * @param event Evento de entrada
   */
  formatDateInput(event: any) {
    if (this.searchField === 'fecha_inicio' || this.searchField === 'fecha_fin') {
      let input = event.target.value.replace(/[^0-9]/g, '');
      if (input.length > 4) {
        input = input.slice(0, 4) + '-' + input.slice(4);
      }
      if (input.length > 7) {
        input = input.slice(0, 7) + '-' + input.slice(7, 10);
      }
      this.searchTerm = input;
    } else {
      this.searchTerm = event.target.value;
    }
    // Opcional: activar el debounce automáticamente al escribir
    // this.searchSubject.next(this.searchTerm);
  }

  /**
   * Actualiza el placeholder del campo de búsqueda según el campo seleccionado.
   */
  updatePlaceholder() {
    if (this.searchField === 'fecha_inicio' || this.searchField === 'fecha_fin') {
      this.searchPlaceholder = 'yyyy-mm-dd';
    } else {
      this.searchPlaceholder = 'Buscar...';
    }
    // Limpiar el término de búsqueda al cambiar el campo
    this.searchTerm = '';
    this.filterCompanies();
  }

  /**
   * Muestra un toast con el mensaje y el color especificado.
   * @param mensaje Mensaje a mostrar
   * @param status Color del toast ('primary' | 'success' | 'info' | 'warning' | 'danger')
   */

  /**
   * Abre el modal para editar una empresa.
   * @param company Empresa a editar
   */
  editarEmpresa(company: any) {
    this.dialogService.open(EditCompanyModalComponent, {
      context: {
        company: company,
      },
    }).onClose.subscribe((result) => {
      if (result && result.updatedCompany) {
        // Actualiza la lista de empresas con los datos modificados
        const index = this.companies.findIndex(c => c.id === result.updatedCompany.id);
        if (index > -1) {
          this.companies[index] = result.updatedCompany;
          this.filterCompanies(); // Filtrar después de la edición
          this.toastrService.showSuccess('Empresa actualizada exitosamente.', 'Exito');
        }
      }
    });
  }

  /**
   * Maneja el cambio de página en la paginación.
   * @param page Nueva página seleccionada
   */
  onPageChange(page: number) {
    this.currentPage = page;
  }

  ngOnDestroy() {
    // Limpiar la suscripción al Subject para evitar memory leaks
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }
}
