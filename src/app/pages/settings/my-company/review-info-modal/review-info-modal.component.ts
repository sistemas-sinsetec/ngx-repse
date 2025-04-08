import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NbDialogRef } from '@nebular/theme';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

@Component({
  selector: 'ngx-review-info-modal',
  templateUrl: './review-info-modal.component.html',
  styleUrls: ['./review-info-modal.component.scss']
})
export class ReviewInfoModalComponent implements OnInit {

  // Propiedades recibidas a través del contexto del diálogo
  companyId: string;
  tareaId: number;
  tareaNombre: string;

  actasConstitutivas: any[] = [];
  afil01: any[] = [];
  rfc: any[] = [];
  autorizacion: any[] = [];
  establecimientos: any[] = [];
  error: string | null = null;
  isSubmitting: boolean = false;

  constructor(
    private http: HttpClient,
    protected dialogRef: NbDialogRef<ReviewInfoModalComponent>,
    private toastrService: CustomToastrService
  ) { }

  ngOnInit() {
    this.loadAdditionalInfo();
  }

  loadAdditionalInfo() {
    switch (this.tareaId) {
      case 1:
        this.obtenerActasConstitutivas();
        break;
      case 2:
        this.obtenerRfc();
        break;
      case 3:
        this.obtenerAfil01();
        break;
      case 4:
        this.obtenerAutorizacion();
        break;
      case 5:
        this.obtenerEstablecimientos();
        break;
      default:
        this.error = 'No hay información adicional disponible para esta tarea.';
    }
  }

  obtenerActasConstitutivas() {
    this.http.get<any[]>(`https://siinad.mx/php/getActasConstitutivas.php?companyId=${this.companyId}`)
      .subscribe(response => {
        this.actasConstitutivas = response;
      }, error => {
        this.error = 'Error al obtener las Actas Constitutivas';
      });
  }

  obtenerAfil01() {
    this.http.get<any[]>(`https://siinad.mx/php/getAfil01.php?companyId=${this.companyId}`)
      .subscribe(response => {
        this.afil01 = response;
      }, error => {
        this.error = 'Error al obtener AFIL01';
      });
  }

  obtenerRfc() {
    this.http.get<any[]>(`https://siinad.mx/php/getRfc.php?companyId=${this.companyId}`)
      .subscribe(response => {
        this.rfc = response;
      }, error => {
        this.error = 'Error al obtener RFC';
      });
  }

  obtenerAutorizacion() {
    this.http.get<any[]>(`https://siinad.mx/php/getAutorizacion.php?companyId=${this.companyId}`)
      .subscribe(response => {
        this.autorizacion = response;
      }, error => {
        this.error = 'Error al obtener Autorización';
      });
  }

  obtenerEstablecimientos(){
    this.http.get<any[]>(`https://siinad.mx/php/getEstablecimientos.php?companyId=${this.companyId}`)
      .subscribe(response => {
        this.establecimientos = response;
      }, error => {
        this.error = 'Error al obtener establecimientos';
      });
  }

  onSubmit() {
    this.isSubmitting = true;

    const data = {
      actasConstitutivas: this.actasConstitutivas,
      afil01: this.afil01,
      rfc: this.rfc,
      autorizacion: this.autorizacion,
      establecimientos: this.establecimientos,
    };

    this.http.post('https://siinad.mx/php/updateAdditionalInfo.php', data)
      .subscribe(response => {
        this.isSubmitting = false;
        console.log('Datos actualizados:', response);
        this.toastrService.showSuccess('Datos actualizados correctamente', 'Éxito');
        this.dismiss();
      }, error => {
        this.isSubmitting = false;
        console.error('Error al actualizar los datos:', error);
        this.toastrService.showError('Error al actualizar los datos', 'Error');
      });
  }

  dismiss() {
    this.dialogRef.close();
  }

}
