import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CpAuthDialogComponent } from '../cp-auth-dialog/cp-auth-dialog.component';
import { CpAuthDeleteDialogComponent } from '../cp-auth-delete-dialog/cp-auth-delete-dialog.component';
import { Router } from '@angular/router';
import { NbDialogService, NbToastrService } from '@nebular/theme';
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
      .subscribe((data: any) => {
        // Verificamos si la respuesta es un array
        if (Array.isArray(data)) {
          this.empleados = data;
        } else {
          this.empleados = []; // Evitamos el error en el *ngFor
          console.warn('La respuesta del backend no es un array:', data);
          this.mostrarToast('No hay socios pendientes', 'danger');
        }
      }, (error) => {
        console.error('Error al obtener empleados:', error);
        this.mostrarToast('Error al cargar empleados', 'danger');
        this.empleados = []; // Evitamos el error si hay un fallo en la petición
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
      folioSolicitud: this.selectedEmployee.requestFolio,
    };
  
    this.http.post<any>('https://siinad.mx/php/sucess_socioComercial.php', data)
      .subscribe(
        async (response: any) => {
          console.log('Socio aceptado con éxito', response);
  
          // Remover al empleado de la lista local
          this.empleados = this.empleados.filter(e => e.id !== this.selectedEmployee.id);
          this.selectedEmployee = null;
  
          if (response.success) {
            // Abrir el diálogo de Nebular
            this.dialogService.open(CpAuthDialogComponent, {

              closeOnBackdropClick: false,
            }).onClose.subscribe((modalData) => {
              if (modalData && modalData.continuarRegistro) {
                console.log('Continuar con el registro:', modalData);
                // Lógica adicional si se debe continuar
              } else {
                console.log('Navegar al home');
                this.router.navigate(['/home']);
              }
            });
          } else {
            // Mostrar toast de error
            this.mostrarToast(response.message || 'Error al aceptar al socio.', 'danger');
          }
        },
        (error) => {
          console.error('Error al aceptar al socio:', error);
          this.mostrarToast('Error al aceptar al socio.', 'danger');
        }
      );
  }
  

  rechazarSocio() {
    // Abre un diálogo de Nebular en vez del modal de Ionic
    this.presentModal();
  }

  async presentModal() {
    this.dialogService.open(CpAuthDeleteDialogComponent, {
      context: {
        continuarRegistro: false,
        mostrarMotivoRechazo: true,
        confirmarRechazoSocio: this.confirmarRechazoSocio.bind(this), // Pasar la función como propiedad al modal
      },
    }).onClose.subscribe((motivoRechazo) => {
      if (motivoRechazo) {
        console.log('Motivo recibido del modal:', motivoRechazo);
        this.confirmarRechazoSocio(motivoRechazo); // Llamar al método con el motivo recibido
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


