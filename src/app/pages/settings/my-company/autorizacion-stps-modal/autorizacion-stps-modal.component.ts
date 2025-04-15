import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbDialogRef } from '@nebular/theme';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-autorizacion-stps-modal',
  templateUrl: './autorizacion-stps-modal.component.html',
  styleUrls: ['./autorizacion-stps-modal.component.scss'],
})
export class AutorizacionStpsModalComponent implements OnInit {
  @Input() tarea: any;
  @Input() userId: string;
  @Input() companyId: string;

  fechaAutorizacion: string = '';
  registroAutorizacion: string = '';
  actividades: any[] = [{ actividad: '', folio: '' }];
  isSubmitting: boolean = false;

  constructor(
    private http: HttpClient,
    protected dialogRef: NbDialogRef<AutorizacionStpsModalComponent>
  ) {}

  ngOnInit() {
    this.cargarInformacion();
  }

  cargarInformacion() {
    this.http
      .get<any[]>(`${environment.apiBaseUrl}/getAutorizacionStps.php?companyId=${this.companyId}`)
      .subscribe(
        (response) => {
          if (response && response.length > 0) {
            const autorizacion = response[0];
            this.fechaAutorizacion = autorizacion.fechaAutorizacion;
            this.registroAutorizacion = autorizacion.registroAutorizacion;
            this.actividades = autorizacion.actividades;
          }
        },
        (error) => {
          console.error('Error al obtener la información de Autorización STPS:', error);
        }
      );
  }

  addActividad() {
    this.actividades.push({ actividad: '', folio: '' });
  }

  removeActividad(index: number) {
    if (this.actividades.length > 1) {
      this.actividades.splice(index, 1);
    }
  }

  // Cierra el diálogo sin devolver datos
  dismiss() {
    if (!this.isSubmitting) {
      this.dialogRef.close();
    }
  }

  // Envía la información y cierra el diálogo retornando los datos
  onSubmit() {
    this.isSubmitting = true;

    const formData = {
      fechaAutorizacion: this.fechaAutorizacion,
      registroAutorizacion: this.registroAutorizacion,
      actividades: this.actividades,
      userId: this.userId,
      companyId: this.companyId,
      tareaId: this.tarea?.id,
    };

    this.http.post(`${environment.apiBaseUrl}/saveAutorizacionStps.php`, formData).subscribe(
      (response) => {
        console.log('Respuesta del servidor:', response);
        this.isSubmitting = false;
        this.dialogRef.close(formData);
      },
      (error) => {
        console.error('Error al enviar los datos del formulario:', error);
        this.isSubmitting = false;
      }
    );
  }
}
