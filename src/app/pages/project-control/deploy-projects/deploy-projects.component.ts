import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular'; // Importar LoadingController
import { CompanyService } from '../../../services/company.service';
import * as XLSX from 'xlsx'; // Importar la librería xlsx

@Component({
  selector: 'ngx-deploy-projects',
  templateUrl: './deploy-projects.component.html',
  styleUrls: ['./deploy-projects.component.scss']
})
export class DeployProjectsComponent implements OnInit {
  // Configuración de la tabla
  settings = {
    columns: {
      project_id: {
        title: 'ID del Proyecto',
        type: 'string',
      },
      project_name: {
        title: 'Nombre del Proyecto',
        type: 'string',
      },
      start_date: {
        title: 'Fecha de Inicio',
        type: 'string',
      },
      end_date: {
        title: 'Fecha de Fin',
        type: 'string',
      },
      project_status: {
        title: 'Estatus del Proyecto', // Nueva columna
        type: 'string',
      },
    },
    actions: {
      add: false,      // Deshabilitar botón de agregar
      edit: false,     // Deshabilitar botón de editar
      delete: false,   // Deshabilitar botón de eliminar
    },
    pager: {
      display: true,   // Habilitar paginación
      perPage: 10,     // Número de filas por página
    },
  };

  // Fuente de datos para la tabla
  source: any[] = [];
  filteredSource: any[] = []; // Datos filtrados por año

  // Selector de año
  selectedYear: string = '';
  availableYears: string[] = []; // Lista de años disponibles

  constructor(
    private http: HttpClient,
    private companyService: CompanyService,
    private loadingController: LoadingController // Inyectar LoadingController
  ) {}

  ngOnInit(): void {
    // Llamar al método para obtener los datos al inicializar el componente
    this.getProjects();
  }

  // Método para obtener los datos desde getProjects.php
  async getProjects() {
    // Crear y mostrar el loading
    const loading = await this.loadingController.create({
      message: 'Cargando proyectos...',
      spinner: 'crescent', // Tipo de spinner
      duration: 5000, // Duración máxima del loading (opcional)
    });

    try {
      await loading.present(); // Mostrar el loading

      const companyId = this.companyService.selectedCompany.id;
      const data = { company_id: companyId }; // Obtener el company_id desde el servicio

      // Realizar la solicitud HTTP POST
      this.http.post<any>('https://siinad.mx/php/get_projects.php', data).subscribe(
        (response) => {
          // Asignar los datos a la fuente de la tabla
          this.source = response.data;
          this.filteredSource = this.source; // Inicialmente, mostrar todos los datos

          // Extraer los años únicos de los proyectos
          this.availableYears = this.extractUniqueYears(this.source);
        },
        (error) => {
          console.error('Error al obtener los datos:', error);
        },
        () => {
          loading.dismiss(); // Ocultar el loading cuando la solicitud finalice
        }
      );
    } catch (e) {
      console.error('Error al presentar el loading:', e);
      if (loading) {
        await loading.dismiss(); // Asegurarse de ocultar el loading en caso de error
      }
    }
  }

  // Método para extraer años únicos de los proyectos
  extractUniqueYears(projects: any[]): string[] {
    const years = projects.map(project => {
      const startDate = new Date(project.start_date);
      return startDate.getFullYear().toString();
    });
    return [...new Set(years)]; // Eliminar duplicados
  }

  // Método para filtrar los proyectos por año
  filterByYear() {
    if (this.selectedYear) {
      this.filteredSource = this.source.filter(project => {
        const startDate = new Date(project.start_date);
        return startDate.getFullYear().toString() === this.selectedYear;
      });
    } else {
      this.filteredSource = this.source; // Si no se selecciona un año, mostrar todos los proyectos
    }
  }

  // Método para reiniciar el filtro
  resetFilter() {
    this.selectedYear = ''; // Reiniciar el año seleccionado
    this.filteredSource = this.source; // Mostrar todos los proyectos
  }

  // Método para descargar el Excel
  downloadExcel() {
    // Crear una hoja de trabajo de Excel
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredSource);

    // Crear un libro de trabajo y agregar la hoja de trabajo
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');

    // Escribir el archivo Excel y generar un enlace de descarga
    XLSX.writeFile(wb, 'proyectos.xlsx');
  }
}