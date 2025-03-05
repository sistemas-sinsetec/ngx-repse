import { Component, OnInit } from '@angular/core';
import { NbDialogRef } from '@nebular/theme';

@Component({
  selector: 'ngx-rejection-dialog',
  templateUrl: './rejection-dialog.component.html',
  styleUrls: ['./rejection-dialog.component.scss']
})
export class RejectionDialogComponent implements OnInit {

  archivo: any; // Recibido a través del contexto del diálogo
  comentario: string = '';

  constructor(
    protected dialogRef: NbDialogRef<RejectionDialogComponent>
  ) { }

  ngOnInit(): void {
    // Puedes realizar alguna inicialización si es necesario
    console.log('Archivo recibido:', this.archivo);
  }

  close() {
    this.dialogRef.close();
  }

  rechazar() {
    if (this.comentario.trim() === '') {
      // Opcional: Puedes añadir validaciones adicionales
      return;
    }
    this.dialogRef.close({ comentario: this.comentario });
  }

}
