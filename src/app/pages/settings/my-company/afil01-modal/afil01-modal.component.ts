import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'app-afil01-modal',
  templateUrl: './afil01-modal.component.html',
  styleUrls: ['./afil01-modal.component.scss'],
})
export class Afil01ModalComponent implements OnInit {
  @Input() tarea: any;
  @Input() userId: string;
  @Input() companyId: string;

  noPatronales: any[] = [
    { noRegPatronal: '', division: '', grupo: '', fraccion: '', clase: '', actividad: '', descripcion: '' },
  ];
  isSubmitting: boolean = false; // Para manejar el estado de envío

  constructor(
    private http: HttpClient,
    protected dialogRef: NbDialogRef<Afil01ModalComponent> // Inyectamos NbDialogRef
  ) {}

  ngOnInit() {
    this.cargarInformacion();
  }

  cargarInformacion() {
    this.http
      .get<any[]>(`https://siinad.mx/php/getAfil01.php?companyId=${this.companyId}`)
      .subscribe(
        (response) => {
          if (response && response.length > 0) {
            this.noPatronales = response;
          }
        },
        (error) => {
          console.error('Error al obtener la información de AFIL01:', error);
        }
      );
  }

  addNoPatronal() {
    this.noPatronales.push({
      noRegPatronal: '',
      division: '',
      grupo: '',
      fraccion: '',
      clase: '',
      actividad: '',
      descripcion: '',
    });
  }

  removeNoPatronal(index: number) {
    if (this.noPatronales.length > 1) {
      this.noPatronales.splice(index, 1);
    }
  }

  // Cierra el diálogo sin enviar datos
  dismiss() {
    if (!this.isSubmitting) {
      this.dialogRef.close();
    }
  }

  // Envía los datos al servidor y cierra el diálogo retornando la información
  onSubmit() {
    this.isSubmitting = true;

    const formData = {
      noPatronales: this.noPatronales,
      userId: this.userId,
      companyId: this.companyId,
      tareaId: this.tarea?.id,
    };

    console.log('Enviando datos:', JSON.stringify(formData, null, 2));

    this.http.post('https://siinad.mx/php/saveAfil01.php', formData).subscribe(
      (response) => {
        console.log('Respuesta del servidor:', response);
        this.isSubmitting = false;
        // Cerrar el diálogo y devolver los datos al componente que lo abrió
        this.dialogRef.close(formData);
      },
      (error) => {
        console.error('Error al enviar los datos del formulario:', error);
        this.isSubmitting = false;
      }
    );
  }
}
