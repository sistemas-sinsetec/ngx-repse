import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { EditCompanyModalComponent } from '../edit-company-modal/edit-company-modal.component';
import { NbToastrService, NbDialogService, NbDialogRef } from '@nebular/theme';
@Component({
  selector: 'ngx-companies-info',
  templateUrl: './companies-info.component.html',
  styleUrls: ['./companies-info.component.scss']
})
export class CompaniesInfoComponent {
  companies: any[] = [];
  filteredCompanies: any[] = [];
  searchTerm: string = '';
  searchField: string = 'nameCompany'; // Default search field
  searchPlaceholder: string = 'Buscar...'; // Placeholder por defecto

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: NbToastrService,
    private dialogService: NbDialogService,
    private dialogRef: NbDialogRef<CompaniesInfoComponent>,
  ) { }

  ngOnInit() {
    this.obtenerEmpresas();
  }

  obtenerEmpresas() {
    this.http.get<any[]>('https://siinad.mx/php/companies-info.php')
      .subscribe(
        (data: any[]) => {
          this.companies = data.filter(company => 
            ['adminE', 'adminEE', 'adminPE'].includes(company.levelUserName)
          );
          this.filteredCompanies = [...this.companies];
        },
        (error) => {
          console.error('Error al obtener los datos de las empresas:', error);
          this.mostrarToast('Error al obtener los datos de las empresas.', 'danger');
        }
      );
  }

  filterCompanies() {
    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredCompanies = this.companies.filter(company => 
      company[this.searchField].toLowerCase().includes(searchTermLower)
    );
  }


  formatDateInput(event: any) {
    if (this.searchField === 'fecha_inicio' || this.searchField === 'fecha_fin') {
      let input = event.target.value.replace(/-/g, '');
      if (input.length > 4) {
        input = input.slice(0, 4) + '-' + input.slice(4);
      }
      if (input.length > 7) {
        input = input.slice(0, 7) + '-' + input.slice(7);
      }
      this.searchTerm = input;
    } else {
      this.searchTerm = event.target.value;
    }
    this.filterCompanies();
  }

  getCompaniesInfo() {
    this.http.get<any[]>('https://siinad.mx/php/companies-info.php')
      .subscribe(
        (data: any[]) => {
          this.companies = data.filter(company => 
            ['adminE', 'adminEE', 'adminPE'].includes(company.levelUserName)
          );
          this.filteredCompanies = [...this.companies];
        },
        (error) => {
          console.error('Error al obtener los datos de las empresas:', error);
          this.mostrarToast('Error al obtener los datos de las empresas.', 'danger');
        }
      );
  }

  updatePlaceholder() {
    if (this.searchField === 'fecha_inicio' || this.searchField === 'fecha_fin') {
      this.searchPlaceholder = 'yyyy-mm-dd';
    } else {
      this.searchPlaceholder = 'Buscar...';
    }
  }

  mostrarToast(mensaje: string, color: string) {
    this.toastrService.show(mensaje, '', { status: color, duration: 3000 });
  }

  async editarEmpresa(company: any) {
    const dialogRef: NbDialogRef<any> = this.dialogService.open(EditCompanyModalComponent, {
      context: { company: company }
    });

    dialogRef.onClose.subscribe((result) => {
      if (result && result.updatedCompany) {
        // Actualiza la lista de empresas con los datos modificados
        const index = this.companies.findIndex(c => c.id === result.updatedCompany.id);
        if (index > -1) {
          this.companies[index] = result.updatedCompany;
          this.filterCompanies(); // Filtrar después de la edición
        }
      }
    });
  }

  goBack() {
    this.router.navigate(['../']);
  }
}







