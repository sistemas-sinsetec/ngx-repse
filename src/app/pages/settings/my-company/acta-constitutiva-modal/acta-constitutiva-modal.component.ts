import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbDialogRef } from '@nebular/theme';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ngx-acta-constitutiva-modal',
  templateUrl: './acta-constitutiva-modal.component.html',
  styleUrls: ['./acta-constitutiva-modal.component.scss'],
})
export class ActaConstitutivaModalComponent implements OnInit {
  @Input() tarea: any;
  @Input() userId: string;
  @Input() companyId: string;

  actaConstitutiva: any = {
    domicilioSocial: '',
    nombreRepresentante: '',
    numeroEscritura: '',
    folioMercantil: '',
    fechaConstitucion: '',
    nombreNotario: '',
    nombreNotaria: '',
    lugarFacultad: '',
    seguroSocial: ''
  };

  constructor(
    private http: HttpClient,
    protected dialogRef: NbDialogRef<ActaConstitutivaModalComponent>
  ) {}

  ngOnInit() {
    this.cargarInformacion();
  }

  cargarInformacion() {
    this.http
      .get<any[]>(`${environment.apiBaseUrl}/getActasConstitutivas.php?companyId=${this.companyId}`)
      .subscribe(
        (response) => {
          if (response && response.length > 0) {
            // Asigna el primer resultado a la variable actaConstitutiva
            this.actaConstitutiva = response[0]; 
          }
        },
        (error) => {
          console.error('Error al obtener la información del acta constitutiva:', error);
        }
      );
  }

  // Cierra el diálogo sin enviar datos
  dismiss() {
    this.dialogRef.close();
  }

  // Envía el formulario y cierra el diálogo
  onSubmit(form: { value: any }) {
    const formData = {
      ...form.value,
      userId: this.userId,
      companyId: this.companyId,
      tareaId: this.tarea?.id,
    };

    this.http
      .post(`${environment.apiBaseUrl}/saveActaConstitutiva.php`, formData)
      .subscribe(
        (response) => {
          console.log('Respuesta del servidor:', response);
          // Cerrar el diálogo y retornar formData al componente que lo abrió
          this.dialogRef.close(formData);
        },
        (error) => {
          console.error('Error al enviar los datos del formulario:', error);
        }
      );
  }
}
