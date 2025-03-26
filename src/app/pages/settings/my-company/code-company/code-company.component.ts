import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { NbComponentStatus } from '@nebular/theme';
import { CustomToastrService } from '../../../../services/custom-toastr.service';

@Component({
  selector: 'ngx-code-company',
  templateUrl: './code-company.component.html',
  styleUrls: ['./code-company.component.scss']
})
export class CodeCompanyComponent implements OnInit {

  codigoEmpresa: string = ''; // Código de la empresa
  labelCodigoDeEmpresa: string = 'Código de Empresa';
  labelTitleCodeCompany: string = 'Mi código de empresa';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private companyService: CompanyService,
    private toastrService: CustomToastrService, // Servicio de notificaciones
  
  ) {}

  ngOnInit() {
    // Cargar el código de la empresa al iniciar
    this.loadCompanyCode();
  }

  async loadCompanyCode() {
    // Mostrar indicador de carga
   

    try {
      // Obtener el ID de la empresa desde el servicio
      const companyId = this.companyService.selectedCompany?.id;

      if (!companyId) {
        this.toastrService.showWarning('No se ha seleccionado una empresa.', 'warning');
        return;
      }

      const data = { companyId: companyId };

      // Enviar solicitud HTTP para obtener el código
      this.http.post('https://siinad.mx/php/loadCompanyCode.php', data).subscribe(
        (response: any) => {
    

          if (response.success) {
            this.codigoEmpresa = response.codigoEmpresa;
            console.log('Código cargado correctamente.');
          } else {
            this.toastrService.showError('No se pudo cargar el código de empresa.', 'danger');
          }
        },
        (error) => {
          
          console.error('Error en la solicitud POST:', error);
          this.toastrService.showError('Error al cargar el código de empresa.', 'danger');
        }
      );
    } catch (error) {
     
      console.error('Error inesperado:', error);
      this.toastrService.showError('Ocurrió un error inesperado.', 'danger');
    }
  }

  async copiarCodigo() {
    if (this.codigoEmpresa) {
      try {
        // Copiar el código al portapapeles
        await navigator.clipboard.writeText(this.codigoEmpresa);
        this.toastrService.showSuccess('Código copiado al portapapeles.', 'success');
      } catch (error) {
        console.error('Error al copiar:', error);
        this.toastrService.showError('No se pudo copiar el código.', 'danger');
      }
    } else {
      this.toastrService.showWarning('No hay código disponible para copiar.', 'warning');
    }
  }

}
