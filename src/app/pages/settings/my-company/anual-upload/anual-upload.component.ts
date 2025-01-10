import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { NbDialogService } from '@nebular/theme';
import { ActaConstitutivaModalComponent } from '../acta-constitutiva-modal/acta-constitutiva-modal.component';
import { RfcModalComponent } from '../rfc-modal/rfc-modal.component';
import { Afil01ModalComponent } from '../afil01-modal/afil01-modal.component';
import { AutorizacionStpsModalComponent } from '../autorizacion-stps-modal/autorizacion-stps-modal.component';
import { EstablecimientosModalComponent } from '../establecimientos-modal/establecimientos-modal.component';
import { ContratoModalComponent } from '../contrato-modal/contrato-modal.component';



interface Tarea {
  id: number;
  nombre: string;
  status: boolean;
  archivo?: File;
  cargado?: boolean;
  comentario?: string;
  estado?: string;
  file_path?: string;
}

@Component({
  selector: 'ngx-anual-upload',
  templateUrl: './anual-upload.component.html',
  styleUrls: ['./anual-upload.component.scss']
})
export class AnualUploadComponent implements OnInit {
  tareas: Tarea[] = [
    { id: 1, nombre: 'Acta Constitutiva', status: false },
    { id: 2, nombre: 'RFC', status: false },
    { id: 3, nombre: 'AFIL01', status: false },
    { id: 4, nombre: 'Autorización vigente STPS', status: false },
    { id: 5, nombre: 'Establecimientos', status: false },
    { id: 6, nombre: 'Contrato', status: false },
  ];

  cargados: number = 0;
  completos: number = 0;
  incompletos: number = 0;
  noCargados: number = this.tareas.length;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private nbDialogService: NbDialogService
  ) {}

  ngOnInit() {
    this.configurarTareas();
    this.obtenerEstadoArchivos();
  }

  configurarTareas() {
    if (this.authService.selectedRFC.length === 12) {
      this.tareas = [
        { id: 1, nombre: 'Acta Constitutiva', status: false },
        { id: 2, nombre: 'RFC', status: false },
        { id: 3, nombre: 'AFIL01', status: false },
        { id: 4, nombre: 'Autorización vigente STPS', status: false },
        { id: 5, nombre: 'Establecimientos', status: false },
        { id: 6, nombre: 'Contrato', status: false },
      ];
    } else if (this.authService.selectedRFC.length === 13) {
      this.tareas = [
        { id: 2, nombre: 'RFC', status: false },
        { id: 3, nombre: 'AFIL01', status: false },
        { id: 4, nombre: 'Autorización vigente STPS', status: false },
        { id: 5, nombre: 'Establecimientos', status: false },
        { id: 6, nombre: 'Contrato', status: false },
      ];
    }
    this.noCargados = this.tareas.length;
  }


  async openModal(tarea: Tarea) {
    let component;

    switch (tarea.nombre) {
      case 'Acta Constitutiva':
        component = ActaConstitutivaModalComponent;
        break;
      case 'RFC':
        component = RfcModalComponent;
        break;
      case 'AFIL01':
        component = Afil01ModalComponent;
        break;
      case 'Autorización vigente STPS':
        component = AutorizacionStpsModalComponent;
        break;
      case 'Establecimientos':
        component = EstablecimientosModalComponent;
        break;
      case 'Contrato':
        component = ContratoModalComponent;
        break;
      default:
        console.error('No hay un modal definido para esta tarea.');
        return;
    }

    this.nbDialogService.open(component, {
      context: {
        tarea: tarea,
        userId: this.authService.userId,
        companyId: this.authService.selectedId,
      },
    });
  }

  triggerFileInput(id: number) {
    const fileInput = document.getElementById(`fileInput${id}`) as HTMLInputElement | null;
    if (fileInput) {
      fileInput.click();
    } else {
      console.error(`Element with id fileInput${id} not found`);
    }
  }

  onFileSelected(event: Event, tarea: Tarea) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file: File = input.files[0];
      tarea.archivo = file;
      console.log(`Archivo seleccionado para ${tarea.nombre}:`, file.name);
      this.uploadFile(tarea);
    }
  }

  uploadFile(tarea: Tarea) {
    if (tarea.archivo) {
      const formData: FormData = new FormData();
      formData.append('file', tarea.archivo);
      formData.append('userId', this.authService.userId);
      formData.append('companyId', this.authService.selectedId);
      formData.append('tareaId', tarea.id.toString());

      this.http.post('https://siinad.mx/php/documentUpload.php', formData)
        .subscribe(response => {
          console.log('Respuesta del servidor:', response);
          tarea.status = true;
          tarea.cargado = true;
          tarea.estado = 'cargado';
          this.updateCounters();
          this.obtenerEstadoArchivos();
        }, error => {
          console.error('Error al subir el archivo:', error);
        });
    } else {
      console.error('No file found for upload.');
    }
  }

  updateCounters() {
    this.cargados = this.tareas.filter(t => t.estado === 'cargado').length;
    this.completos = this.tareas.filter(t => t.estado === 'aceptado').length;
    this.incompletos = this.tareas.filter(t => t.estado === 'rechazado').length;
    this.noCargados = this.tareas.length - this.cargados - this.completos - this.incompletos;
  }

  descargarArchivo(tarea: Tarea) {
    if (tarea.file_path) {
      window.open(`https://siinad.mx/php/${tarea.file_path}`, '_blank');
    } else {
      console.error('No file path found for download.');
    }
  }

  obtenerEstadoArchivos() {
    const companyId = this.authService.selectedId;

    if (!companyId) {
      console.error('Company ID is missing.');
      return;
    }

    this.http.get<any[]>(`https://siinad.mx/php/getDocumentStatus.php?companyId=${companyId}`)
      .subscribe(response => {
        console.log('Document status response:', response);
        if (Array.isArray(response)) {
          response.forEach((doc) => {
            const tarea = this.tareas.find(t => t.id === parseInt(doc.tarea_id, 10));
            if (tarea) {
              tarea.status = true;
              tarea.cargado = true;
              tarea.comentario = doc.comentario ?? 'Sin comentarios';
              tarea.estado = doc.estado ?? 'No cargado';
              tarea.file_path = doc.file_path;
            }
          });
          this.updateCounters();
        } else {
          console.error('Unexpected response format:', response);
        }
      }, error => {
        console.error('Error al obtener el estado de los archivos:', error);
      });
  }
}
