/*
  En este codigo se maneja la carga de documentos anuales de la empresa
*/
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
import { CompanyService } from '../../../../services/company.service';
import { NbComponentStatus } from '@nebular/theme';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { map } from 'rxjs/operators';
import { CustomToastrService } from '../../../../services/custom-toastr.service';


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

interface STPSData {
  rfc?: string;
  nombreEmpresa?: string;
  fechaAutorizacion?: string;
  numeroAutorizacion?: string;
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
  isUploading: boolean = false;
  private stpsData: STPSData = {};

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    public companyService: CompanyService,
    private nbDialogService: NbDialogService,
    private toastrService: CustomToastrService,
  ) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
  }

  ngOnInit() {
    this.isUploading = true;
    this.configurarTareas();
    this.obtenerEstadoArchivos();
    this.isUploading = false;
  }

  configurarTareas() {
    if (this.companyService.selectedCompany.rfc.length === 12) {
      this.tareas = [
        { id: 1, nombre: 'Acta Constitutiva', status: false },
        { id: 2, nombre: 'RFC', status: false },
        { id: 3, nombre: 'AFIL01', status: false },
        { id: 4, nombre: 'Autorización vigente STPS', status: false },
        { id: 5, nombre: 'Establecimientos', status: false },
        { id: 6, nombre: 'Contrato', status: false },
      ];
    } else if (this.companyService.selectedCompany.rfc.length === 13) {
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
    this.isUploading = true;
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
        companyId: this.companyService.selectedCompany.id,
      },
    });
    this.isUploading = false;
  }

  triggerFileInput(id: number) {
    const fileInput = document.getElementById(`fileInput${id}`) as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: Event, tarea: Tarea) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      tarea.archivo = input.files[0];
      this.uploadFile(tarea);
    }
  }

  async uploadFile(tarea: Tarea) {
    if (!tarea.archivo) return;

    const formData = new FormData();
    formData.append('file', tarea.archivo);
    formData.append('userId', this.authService.userId);
    formData.append('companyId', this.companyService.selectedCompany.id);
    formData.append('tareaId', tarea.id.toString());

    this.isUploading = true;

    try {
      // Subir archivo primero
      await this.http.post('https://siinad.mx/php/documentUpload.php', formData).toPromise();

      // Validar solo si es STPS
      if (tarea.nombre === 'Autorización vigente STPS') {
        await this.validarDocumentoSTPS(tarea.archivo);
      }

      tarea.status = true;
      tarea.cargado = true;
      tarea.estado = 'cargado';
      this.updateCounters();
      this.obtenerEstadoArchivos();
      this.toastrService.showSuccess("Archivo subido y validado correctamente", 'Exito');
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.toastrService.showError(errorMessage, 'Error');
    } finally {
      this.isUploading = false;
    }
  }


  private async leerPDF(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let text = '';

      console.log('Iniciando lectura de PDF...');

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const pageText = content.items
          .filter((item): item is TextItem => 'str' in item)
          .map(item => item.str)
          .join(' ');

        text += pageText;

        console.log(`Texto página ${i}:`, pageText); // <- Aquí el log por página
      }

      console.log('Texto completo extraído:', text); // <- Aquí el log completo
      return text;

    } catch (error) {
      console.error('Error en leerPDF:', error);
      throw new Error('Error leyendo PDF: ' + error);
    }
  }

  private extraerDataFromSTPS(text: string) {
    const cleanText = text.replace(/\s+/g, ' ').toUpperCase();

    this.stpsData = {
      rfc: this.extraerValor(cleanText, 'REGISTRO FEDERAL DE CONTRIBUYENTES:?'), // Nuevo regex
      // ... resto de las extracciones
    };

    console.log('Datos extraídos:', this.stpsData);
  }

  private extraerValor(text: string, patron: string): string | undefined {
    const regex = new RegExp(`${patron}\\s*([A-Z0-9]{12,13})`, 'i'); // Ajuste para RFCs
    const match = text.match(regex);
    return match?.[1]?.trim();
  }
  // Añadir en los imports del archivo:


  // Luego modificar el método:
  private validarCoincidenciaEmpresa() {
    const companyId = this.companyService.selectedCompany.id;

    return this.http.get<any>(`https://siinad.mx/php/get-company-data.php?company_id=${companyId}`).pipe(
      map(companyData => {
        const errors: string[] = [];

        // Acceder a los datos a través de la propiedad 'data'
        const company = companyData.data;

        if (this.stpsData.rfc && company.RFC !== this.stpsData.rfc) {
          errors.push(`RFC no coincide (BD: ${company.RFC} vs PDF: ${this.stpsData.rfc})`);
        }

        if (this.stpsData.nombreEmpresa &&
          !company.CorporateName.toUpperCase().includes(this.stpsData.nombreEmpresa)) {
          errors.push(`Nombre no coincide (BD: ${company.CorporateName} vs PDF: ${this.stpsData.nombreEmpresa})`);
        }

        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }

        return true;
      })
    );
  }

  private async validarDocumentoSTPS(file: File) {
    try {
      const text = await this.leerPDF(file);
      this.extraerDataFromSTPS(text);

      // Usar directamente el await con el observable convertido a promesa
      await this.validarCoincidenciaEmpresa().toPromise();

    } catch (error) {
      throw new Error('Error validando documento STPS: ' + error);
    }
  }
  // Resto de métodos permanecen igual...
  updateCounters() {
    this.cargados = this.tareas.filter(t => t.estado === 'cargado').length;
    this.completos = this.tareas.filter(t => t.estado === 'aceptado').length;
    this.incompletos = this.tareas.filter(t => t.estado === 'rechazado').length;
    this.noCargados = this.tareas.length - this.cargados - this.completos - this.incompletos;
  }

  descargarArchivo(tarea: Tarea) {
    if (tarea.file_path) {
      window.open(`https://siinad.mx/php/${tarea.file_path}`, '_blank');
    }
  }

  obtenerEstadoArchivos() {
    const companyId = this.companyService.selectedCompany.id;
    if (!companyId) return;

    this.http.get<any[]>(`https://siinad.mx/php/getDocumentStatus.php?companyId=${companyId}`)
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            response.forEach(doc => {
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
          }
        },
        error: (error) => console.error('Error obteniendo estados:', error)
      });
  }
}