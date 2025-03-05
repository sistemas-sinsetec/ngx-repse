import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { RejectionDialogComponent } from '../rejection-dialog/rejection-dialog.component';
import { ReviewInfoModalComponent } from '../review-info-modal/review-info-modal.component';

interface Tarea {
  id: number;
  nombre: string;
  status: boolean;
  archivo?: File;
  cargado?: boolean;
  estado?: string;
}

interface Archivo {
  id: number;
  tarea_id: number;
  file_path: string;
  upload_date: string;
  user_id: number;
  uploaded_by: string;
  tarea_nombre?: string;  // Campo adicional para el nombre de la tarea
  estado?: string;  // Estado del archivo (aceptado/rechazado/pendiente)
  comentario?: string;  // Comentario en caso de rechazo
}

@Component({
  selector: 'ngx-anual-review',
  templateUrl: './anual-review.component.html',
  styleUrls: ['./anual-review.component.scss']
})
export class AnualReviewComponent implements OnInit {

  archivos: Archivo[] = [];
  archivosCargados: Archivo[] = [];
  archivosAceptados: Archivo[] = [];
  archivosRechazados: Archivo[] = [];
  tareas: Tarea[] = [
    { id: 1, nombre: 'Acta Constitutiva', status: false },
    { id: 2, nombre: 'RFC', status: false },
    { id: 3, nombre: 'AFIL01', status: false },
    { id: 4, nombre: 'Autorización vigente STPS', status: false },
    { id: 5, nombre: 'Establecimientos', status: false },
    { id: 6, nombre: 'Contrato', status: false },
    { id: 7, nombre: 'Estado Bancario', status: false },  // Nueva tarea
    { id: 8, nombre: 'Identificación del Representante Legal', status: false },  // Nueva tarea
    { id: 9, nombre: 'Autorización REPSE', status: false },  // Nueva tarea
    { id: 10, nombre: 'Domicilios', status: false }  // Nueva tarea
  ];

  selectedCompanyId: number | null = null;

  cargados: number = 0;
  completos: number = 0;
  incompletos: number = 0;
  noCargados: number = this.tareas.length;
  filter: string = 'cargados';

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    public companyService: CompanyService,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
  ) { }

  ngOnInit() {
    this.selectedCompanyId = Number(this.companyService.selectedCompany?.id);
    if (this.selectedCompanyId) {
      this.obtenerArchivos(this.selectedCompanyId);
    }
  }

  obtenerArchivos(idCompany: number) {
    this.http.get<Archivo[]>(`https://siinad.mx/php/getDocumentStatus.php?companyId=${idCompany}`)
      .subscribe(response => {
        console.log('Document status response:', response); // Verificar la respuesta

        // Imprimir tareas para verificar coincidencias
        console.log('Lista de tareas:', this.tareas);

        this.archivos = response.map(archivo => {
          const tarea = this.tareas.find(t => t.id === parseInt(archivo.tarea_id as any, 10));
          console.log(`Archivo: ${archivo.file_path}, tarea_id: ${archivo.tarea_id}, Matching tarea:`, tarea); // Verificar tarea coincidente
          if (tarea) {
            archivo.tarea_nombre = tarea.nombre;
            tarea.status = true; // Asume que si el archivo está en la base de datos, está cargado
            tarea.estado = archivo.estado;  // Asignar el estado del archivo a la tarea
          }
          return archivo;
        });

        this.categorizarArchivos();
        this.updateCounters();
        console.log('Processed archivos:', this.archivos); // Verificar los archivos procesados
      }, error => {
        console.error('Error al obtener los archivos:', error);
      });
  }

  categorizarArchivos() {
    this.archivosCargados = this.archivos.filter(a => a.estado === 'cargado');
    this.archivosAceptados = this.archivos.filter(a => a.estado === 'aceptado');
    this.archivosRechazados = this.archivos.filter(a => a.estado === 'rechazado');
  }

  updateCounters() {
    this.cargados = this.archivosCargados.length;
    this.completos = this.archivosAceptados.length;
    this.incompletos = this.archivosRechazados.length;
    this.noCargados = this.tareas.length - this.cargados - this.completos - this.incompletos;
  }

  setFilter(filter: string) {
    this.filter = filter;
  }

  aceptarArchivo(archivo: Archivo) {
    archivo.estado = 'aceptado';
    if (this.selectedCompanyId !== null) {
      this.http.post('https://siinad.mx/php/updateArchivoStatus.php', { id: archivo.id, estado: archivo.estado })
        .subscribe(response => {
          console.log('Archivo aceptado:', response);
          this.obtenerArchivos(this.selectedCompanyId!);
          this.toastrService.success('Archivo aceptado correctamente', 'Éxito');
        }, error => {
          console.error('Error al aceptar el archivo:', error);
          this.toastrService.danger('Error al aceptar el archivo', 'Error');
        });
    }
  }



  rechazarArchivo(archivo: Archivo) {
    this.dialogService.open(RejectionDialogComponent, {
      context: { archivo }
    }).onClose.subscribe(result => {
      if (result) {
        archivo.estado = 'rechazado';
        archivo.comentario = result.comentario;
        if (this.selectedCompanyId !== null) {
          this.http.post('https://siinad.mx/php/updateArchivoStatus.php', {
            id: archivo.id,
            estado: archivo.estado,
            comentario: archivo.comentario
          }).subscribe(response => {
            console.log('Archivo rechazado:', response);
            this.obtenerArchivos(this.selectedCompanyId!);
            this.toastrService.success('Archivo rechazado correctamente', 'Éxito');
          }, error => {
            console.error('Error al rechazar el archivo:', error);
            this.toastrService.danger('Error al rechazar el archivo', 'Error');
          });
        }
      }
    });
  }

  revisarInformacionAdicional(archivo: Archivo) {
    const tarea = this.tareas.find(t => t.id === archivo.tarea_id);
    if (!tarea) {
      console.error('No se encontró la tarea correspondiente');
      this.toastrService.danger('No se encontró la tarea correspondiente', 'Error');
      return;
    }

    if (this.selectedCompanyId !== null) {
      this.dialogService.open(ReviewInfoModalComponent, {
        context: {
          companyId: this.companyService.selectedCompany.id,
          tareaId: archivo.tarea_id,
          tareaNombre: tarea.nombre
        },
        closeOnBackdropClick: false,
        closeOnEsc: true,
      }).onClose.subscribe(result => {
        if (result) {
          // Manejar el resultado si es necesario
          this.toastrService.success('Información adicional revisada correctamente', 'Éxito');
          this.obtenerArchivos(this.selectedCompanyId!);
        }
      });
    }
  }
}
