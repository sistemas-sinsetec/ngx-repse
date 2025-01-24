import { Component, Input, OnInit } from '@angular/core';
import { NbDialogRef } from '@nebular/theme'; // Para manejar el cierre del diálogo/modal
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'ngx-processed-list-dialog',
  templateUrl: './processed-list-dialog.component.html',
  styleUrls: ['./processed-list-dialog.component.scss']
})
export class ProcessedListDialogComponent {
  processedFiles: any[] = []; // Lista de archivos procesados
  isCardVisible: boolean = true; // Controla la visibilidad del card

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private dialogRef: NbDialogRef<ProcessedListDialogComponent>,
    private companyService: CompanyService // Referencia al modal
  ) {}

  ngOnInit() {
    this.loadProcessedFiles();
  }

  // Cargar los archivos procesados
  async loadProcessedFiles() {
    const companyId = this.companyService.selectedCompany.id;
    const url = `https://siinad.mx/php/get_processed_files.php?company_id=${companyId}`;
    
    this.http.get(url).subscribe((data: any) => {
      this.processedFiles = data; // Guardar los archivos procesados en la lista
    });
  }

  // Cerrar el modal
  closeDialog() {
    this.dialogRef.close();
  }
  



}