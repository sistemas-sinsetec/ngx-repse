import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';

import { Router } from '@angular/router';
import { NbDialogService, NbToastrService } from '@nebular/theme';

import { CpAuthModalComponent } from '../cp-auth-modal/cp-auth-modal.component';
import { CpAuthModalDeleteComponent } from '../cp-auth-modal-delete/cp-auth-modal-delete.component';

import { CompanyService } from '../../../../services/company.service';
@Component({
  selector: 'ngx-premium-auth',
  templateUrl: './premium-auth.component.html',
  styleUrls: ['./premium-auth.component.scss']
})
export class PremiumAuthComponent {

  empleados: any[] = [];
  selectedEmployee: any;


  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private dialogService: NbDialogService,     // Reemplaza ModalController
    private toastrService: NbToastrService,     // Reemplaza ToastController
    private companyService: CompanyService
  ) 
  { }



  ngOnInit() {
    this.obtenerEmpleadosNoConfirmados();
  }


  obtenerEmpleadosNoConfirmados() {
    this.http.get<any[]>('https://siinad.mx/php/get_infoSocioComercial.php')
      .subscribe((data: any[]) => {
        this.empleados = data;
      }, (error) => {
        console.error('Error al obtener empleados:', error);
        this.mostrarToast('Error al cargar empleados', 'danger');
      });
  }

  getEmployeeDetails() {
    // Solo para depurar
    console.log('Detalles del empleado seleccionado:', this.selectedEmployee);
  }

  async aceptarSocio() {
    const data = {
      userId: this.selectedEmployee.id,
      username: this.selectedEmployee.username,
      name: this.selectedEmployee.name,
      email: this.selectedEmployee.email,
      phone: this.selectedEmployee.phone,
      rfc: this.selectedEmployee.rfc,
      nameCompany: this.selectedEmployee.nameCompany,
      fecha_inicio: this.selectedEmployee.fecha_inicio,
      fecha_fin: this.selectedEmployee.fecha_fin,
      fecha_inicio_request: this.selectedEmployee.fecha_inicio_request,
      fecha_fin_request: this.selectedEmployee.fecha_fin_request,
      folioSolicitud: this.selectedEmployee.requestFolio
    };

    this.http.post<any>('https://siinad.mx/php/sucess_socioComercial.php', data)
      .subscribe(async (response: any) => {
        console.log('Socio aceptado con éxito', response);
        this.empleados = this.empleados.filter(e => e.id !== this.selectedEmployee.id);
        this.selectedEmployee = null;

        if (response.success) {
          // Abrimos el diálogo de Nebular en lugar del modal de Ionic
          this.dialogService.open(CpAuthModalComponent, {
            context: { continuarRegistro: false },
            closeOnBackdropClick: false,
          })
          .onClose.subscribe((modalData) => {
            // modalData es lo que devuelva el diálogo al cerrarse
            if (modalData && modalData.continuarRegistro) {
              // Lógica adicional si se continúa
            } else {
              this.router.navigate(['/home']);
            }
          });
        } else {
          this.mostrarToast(response.message, 'danger');
        }
      }, (error) => {
        console.error('Error al aceptar al socio:', error);
        this.mostrarToast('Error al aceptar al socio', 'danger');
      });
  }

  rechazarSocio() {
    // Abre un diálogo de Nebular en vez del modal de Ionic
    this.presentModal();
  }

  async presentModal() {
    this.dialogService.open(CpAuthModalDeleteComponent, {
      context: {
        continuarRegistro: false,
        mostrarMotivoRechazo: true,
      },
      closeOnBackdropClick: false,
    })
    .onClose.subscribe((motivoRechazo) => {
      // Si el componente CpAuthModalDeleteComponent cierra devolviendo un motivo
      if (motivoRechazo) {
        this.confirmarRechazoSocio(motivoRechazo);
      }
    });
  }

  async confirmarRechazoSocio(motivo: string) {
    const data = {
      userId: this.selectedEmployee.id,
      companyId: this.companyService.selectedCompany.id,
      motivo: motivo
    };

    try {
      const response: any = await this.http.post('https://siinad.mx/php/deleteSolicitud.php', data).toPromise();
      this.mostrarToast(response.message, 'success');
      this.empleados = this.empleados.filter(e => e.id !== this.selectedEmployee.id);
      this.selectedEmployee = null;
    } catch (error) {
      console.error('Error al rechazar al socio:', error);
      this.mostrarToast('Error al rechazar al socio', 'danger');
    }
  }

  mostrarToast(message: string, status: 'success' | 'danger') {
    if (status === 'success') {
      this.toastrService.success(message, 'Información');
    } else {
      this.toastrService.danger(message, 'Error');
    }
  }
}


