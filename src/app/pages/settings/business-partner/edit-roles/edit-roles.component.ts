import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { CompanyService } from '../../../../services/company.service';
import { Router } from '@angular/router';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ngx-edit-roles',
  templateUrl: './edit-roles.component.html',
  styleUrls: ['./edit-roles.component.scss']
})
export class EditRolesComponent implements OnInit {
  sociosComerciales: any[] = [];
  rolesDisponibles: any[] = []; // Ahora se cargan desde el backend
  usuarioSeleccionado: string = '';
  socioComercialSeleccionado: any = null;
  nuevoRol: string = ''; // Capturará el id del rol

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastrService: CustomToastrService,
    public authService: AuthService,
    public companyService: CompanyService,
  ) { }

  ngOnInit() {
    // Llama a las funciones obtenerSociosComerciales y obtenerRoles cuando la página se inicialice
    this.obtenerSociosComerciales();
    this.obtenerRoles(); // Nueva función para obtener roles desde el backend
  }

  obtenerSociosComerciales() {
    const data = {
      association_id: this.companyService.selectedCompany.id // Cambia el parámetro por association_id
    };

    // Realiza la solicitud GET al archivo PHP con el parámetro association_id
    this.http.get(`${environment.apiBaseUrl}/getBusinessPartner.php`, { params: data }).subscribe(
      (response: any) => {
        if (response.length > 0) {
          this.sociosComerciales = response;
        } else {
          this.toastrService.showWarning('No se encontraron socios comerciales', 'warning');
        }
      },
      (error) => {
        console.error('Error al realizar la solicitud:', error);
        this.toastrService.showError('Error al realizar la solicitud', 'danger');
      }
    );
  }

  obtenerRoles() {
    // Realiza la solicitud GET para obtener los roles desde el backend
    this.http.get(`${environment.apiBaseUrl}/getRoles.php`).subscribe(
      (response: any) => {
        this.rolesDisponibles = response; // Asigna los roles obtenidos desde el backend
      },
      (error) => {
        console.error('Error al obtener los roles:', error);
        this.toastrService.showError('Error al obtener los roles', 'danger');
      }
    );
  }

  mostrarDatosSocioComercial() {
    this.socioComercialSeleccionado = this.sociosComerciales.find(
      socio => socio.businessPartnerId === this.usuarioSeleccionado
    );
  }

  actualizarRol() {
    const data = {
      companyId: this.companyService.selectedCompany.id,
      socioComercialId: this.socioComercialSeleccionado.businessPartnerId,
      nuevoRol: this.nuevoRol // Se pasa el id del rol seleccionado
    };

    // Realiza la solicitud POST al archivo PHP para actualizar el rol
    this.http.post(`${environment.apiBaseUrl}/saveUserRoles.php`, data).subscribe(
      (response: any) => {
        if (response.success) {
          this.toastrService.showSuccess(response.message, 'success');
        } else {
          this.toastrService.showError(response.error || 'Error al actualizar el rol', 'error');
        }
      },
      (error) => {
        console.error('Error al realizar la solicitud:', error);
        this.toastrService.showError('Error al realizar la solicitud', 'error');
      }
    );
  }
}
