/*
  En este codigo se revisan y aceptan o rechazan los documentos mensuales.
  Nota: Toda la seccion de documentos se estaba reestructurando actualmente
*/
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { NbDialogService } from '@nebular/theme';
import { CompanyService } from '../../../../services/company.service';
import { ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

interface Tarea {
  id: number;
  nombre: string;
  enero: boolean;
  febrero: boolean;
  marzo: boolean;
  abril: boolean;
  mayo: boolean;
  junio: boolean;
  julio: boolean;
  agosto: boolean;
  septiembre: boolean;
  octubre: boolean;
  noviembre: boolean;
  diciembre: boolean;
  estado: string;
  file_path?: string;  // propiedad legacy, se usará "documents" para múltiples registros
  documents?: Array<{ id: number; file_path: string; month: string; year: number; estado: string; comentario?: string }>;
  [key: string]: any;
}

@Component({
  selector: 'app-mensual-review',
  templateUrl: './mensual-review.component.html',
  styleUrls: ['./mensual-review.component.scss'],
})
export class MensualReviewComponent implements OnInit {
  // Lista de meses y años
  meses: string[] = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  years: number[] = [2023, 2024, 2025, 2026, 2027];

  // Por defecto se asigna el mes y año actuales
  selectedMonth: string = this.meses[new Date().getMonth()];
  selectedYear: number = new Date().getFullYear();

  filter: string = 'cargados';

  // Lista de tareas (puedes ajustarla según corresponda)
  tareas: Tarea[] = [
    { id: 1, nombre: 'Ause ISCOE', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 2, nombre: 'Ause SISUB', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 3, nombre: 'Archivo SUA', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 4, nombre: 'CFDI nómina (xml y PDF)', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 5, nombre: 'Declaración y Acuse De ISR', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 6, nombre: 'Declaración y Acuse De IVA', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 7, nombre: 'Lista Del Personal', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 8, nombre: 'Opinión Cumplimiento SAT', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 9, nombre: 'Opinión cumplimiento IMSS', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 10, nombre: 'Opinión de cumplimiento INFONAVIT', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 11, nombre: 'Pago Bancario De ISR', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 12, nombre: 'Pago Bancario De IVA', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 13, nombre: 'Pago Bancario IMSS', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 14, nombre: 'Reporte ISCOE', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
    { id: 15, nombre: 'Reporte SISUB', enero: false, febrero: false, marzo: false, abril: false, mayo: false, junio: false, julio: false, agosto: false, septiembre: false, octubre: false, noviembre: false, diciembre: false, estado: 'No cargado' },
  ];
  cargados: number = 0;
  completos: number = 0;
  incompletos: number = 0;
  noCargados: number = this.tareas.length;
  cargando: boolean = false;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private dialogService: NbDialogService,
    public companyservice: CompanyService,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.obtenerEstadoArchivos();
  }

  

  setFilter(filter: string) {
    this.filter = filter;
    // Opcional: Si requieres recargar o actualizar la vista.
    this.cdRef.detectChanges();
  }

  getRejectionComment(t: Tarea): string {
    if (!t.documents) return '-';
    const doc = t.documents.find(d =>
      d.month === this.selectedMonth &&
      d.year === this.selectedYear &&
      d.estado.toLowerCase() === 'rechazado'
    );
    return doc && doc.comentario ? doc.comentario : '-';
  }
  
  

  get archivosCargados(): number {
    let count = 0;
    this.tareas.forEach(t => {
      if (t.documents) {
        t.documents.forEach(doc => {
          if (doc.month === this.selectedMonth && doc.year === this.selectedYear && doc.estado.toLowerCase() === 'cargado') {
            count++;
          }
        });
      }
    });
    return count;
  }
  
  get archivosAceptados(): number {
    let count = 0;
    this.tareas.forEach(t => {
      if (t.documents) {
        t.documents.forEach(doc => {
          if (doc.month === this.selectedMonth && doc.year === this.selectedYear && doc.estado.toLowerCase() === 'aceptado') {
            count++;
          }
        });
      }
    });
    return count;
  }
  
  get archivosRechazados(): number {
    let count = 0;
    this.tareas.forEach(t => {
      if (t.documents) {
        t.documents.forEach(doc => {
          if (doc.month === this.selectedMonth && doc.year === this.selectedYear && doc.estado.toLowerCase() === 'rechazado') {
            count++;
          }
        });
      }
    });
    return count;
  }
  
  get archivosNoCargados(): number {
    // Asumimos que se espera un archivo por tarea. Si la tarea no tiene ningún documento para el mes y año, se considera "no cargado".
    let count = 0;
    this.tareas.forEach(t => {
      if (!t.documents || !t.documents.some(doc => doc.month === this.selectedMonth && doc.year === this.selectedYear)) {
        count++;
      }
    });
    return count;
  }

  get tareasFiltradas(): Tarea[] {
    if (this.filter === 'cargados') {
      return this.tareas.filter(t => t.documents && t.documents.some(doc => doc.month === this.selectedMonth && doc.year === this.selectedYear && doc.estado.toLowerCase() === 'cargado'));
    }
    if (this.filter === 'aceptados') {
      return this.tareas.filter(t => t.documents && t.documents.some(doc => doc.month === this.selectedMonth && doc.year === this.selectedYear && doc.estado.toLowerCase() === 'aceptado'));
    }
    if (this.filter === 'rechazados') {
      return this.tareas.filter(t => t.documents && t.documents.some(doc => doc.month === this.selectedMonth && doc.year === this.selectedYear && doc.estado.toLowerCase() === 'rechazado'));
    }
    // En caso de otro filtro, se retorna todas (o se podría definir otro comportamiento)
    return this.tareas;
  }
  

  // Retorna el icono según el estado del documento
  getIconForDocument(tarea: Tarea, month: string, year: number): string {
    const doc = tarea.documents?.find(d => d.month === month && d.year === year);
    if (!doc) return '';
    const estado = doc.estado.toLowerCase();
    if (estado === 'aceptado') return 'checkmark-outline';
    if (estado === 'rechazado') return 'close-outline';
    if (estado === 'cargado') return 'clock-outline';
    return 'clock-outline';
  }

  // Función para visualizar el archivo
  viewFile(tarea: Tarea, month: string, year: number) {
    const doc = tarea.documents?.find(d => d.month === month && d.year === year);
    if (doc && doc.file_path) {
      window.open(`${environment.apiBaseUrl}/${doc.file_path}`, '_blank');
    } else {
      console.error('No se encontró el archivo para visualizar.');
    }
  }

 // Función que actualiza el estado del documento usando updateArchivoStatus
 updateDocumentStatus(tarea: Tarea, month: string, year: number, newStatus: string, comentario: string = '') {
  // Localiza el documento a actualizar
  const doc = tarea.documents?.find(d => d.month === month && d.year === year);
  if (!doc) {
    console.error('Documento no encontrado para actualizar.');
    return;
  }

  const payload = {
    id: doc.id, // se usa el id del documento
    estado: newStatus,
    comentario: comentario
  };

  this.cargando = true;
  this.http.post(`${environment.apiBaseUrl}/updateArchivoStatus.php`, payload)
    .pipe(
      finalize(() => {
        this.cargando = false;
        this.cdRef.detectChanges();
      })
    )
    .subscribe(response => {
      console.log('Respuesta del update:', response);
      this.obtenerEstadoArchivos();
    }, error => {
      console.error('Error al actualizar estado:', error);
    });
}


approveDocument(tarea: Tarea, month: string, year: number) {
  if (window.confirm("¿Está seguro de que desea aprobar el documento?")) {
    // Se envía un comentario vacío para limpiar cualquier comentario previo
    this.updateDocumentStatus(tarea, month, year, 'aceptado', '');
  }
}


get filteredTareas(): Tarea[] {
  if (this.filter === 'cargados') {
    return this.tareas.filter(t =>
      t.documents && t.documents.some(doc =>
        doc.month === this.selectedMonth &&
        doc.year === this.selectedYear &&
        doc.estado.toLowerCase() === 'cargado'
      )
    );
  }
  if (this.filter === 'aceptados') {
    return this.tareas.filter(t =>
      t.documents && t.documents.some(doc =>
        doc.month === this.selectedMonth &&
        doc.year === this.selectedYear &&
        doc.estado.toLowerCase() === 'aceptado'
      )
    );
  }
  if (this.filter === 'rechazados') {
    return this.tareas.filter(t =>
      t.documents && t.documents.some(doc =>
        doc.month === this.selectedMonth &&
        doc.year === this.selectedYear &&
        doc.estado.toLowerCase() === 'rechazado'
      )
    );
  }
  // Si no hay filtro o se desea mostrar todas
  return this.tareas;
}



rejectDocument(tarea: Tarea, month: string, year: number) {
  const comentario = window.prompt("Ingrese el comentario para rechazar el documento:");
  if (comentario !== null) {
    this.updateDocumentStatus(tarea, month, year, 'rechazado', comentario);
  }
}

  // Función que verifica si existe un documento para el mes y año seleccionados
  hasDocumentForYear(tarea: Tarea, month: string, year: number): boolean {
    return tarea.documents?.some(d => d.month === month && d.year === year) ?? false;
  }

 // Obtiene los estados de los documentos desde el backend
 obtenerEstadoArchivos() {
  const companyId = this.companyservice.selectedCompany.id;
  if (!companyId) {
    console.error('Company ID is missing.');
    return;
  }
  console.log('Obteniendo estado de archivos para companyId:', companyId);
  this.cargando = true;
  this.http.get<any[]>(`${environment.apiBaseUrl}/getDocumentStatus.php?companyId=${companyId}`)
    .pipe(
      finalize(() => {
        this.cargando = false;
        this.cdRef.detectChanges();
      })
    )
    .subscribe({
      next: (response) => {
        console.log('Respuesta de la API:', response);
        if (Array.isArray(response)) {
          this.tareas.forEach(t => t.documents = []);
          response.forEach((doc) => {
            const tarea = this.tareas.find(t => t.id === parseInt(doc.tarea_id, 10));
            if (tarea) {
              // Se incluye el id del documento para usarlo en las actualizaciones
              tarea.documents.push({
                id: doc.id,
                file_path: doc.file_path,
                month: doc.month ?? '',
                estado: doc.estado ?? 'No cargado',
                year: doc.year ?? 0,
                comentario: doc.comentario ?? ''
              });
            }
          });
          this.updateCounters();
        } else {
          console.error('Formato de respuesta inesperado:', response);
        }
      },
      error: (error) => {
        console.error('Error al obtener el estado de los archivos:', error);
      },
      complete: () => {
        console.log('Llamada a la API completada');
      }
    });
}
  updateCounters() {
    this.cargados = this.tareas.filter(t => t.estado === 'cargado').length;
    this.completos = this.tareas.filter(t => t.estado === 'aceptado').length;
    this.incompletos = this.tareas.filter(t => t.estado === 'rechazado').length;
    this.noCargados = this.tareas.length - this.cargados - this.completos - this.incompletos;
    this.cdRef.detectChanges();
  }
}
