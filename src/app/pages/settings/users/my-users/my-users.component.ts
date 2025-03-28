/*
  En este codigo se pueden ver y eliminar los diferentes usuarios de la pagina
*/
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import { NbDialogService, NbDialogRef } from '@nebular/theme';
import { CompanyService } from '../../../../services/company.service';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
@Component({
  selector: 'ngx-my-users',
  templateUrl: './my-users.component.html',
  styleUrls: ['./my-users.component.scss']
})
export class MyUsersComponent {

  filtroUsuarios: string = '';
  filtroRol: string = '';
  employees: any[] = [];
  filteredEmployees: any[] = [];
  busquedaActiva: boolean = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastrService: CustomToastrService,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    this.getEmployees();
  }


  async getEmployees() {
    const data = {
      companyId: this.companyService.selectedCompany.id
    };

    this.http.post('https://siinad.mx/php/searchUsers.php', data).subscribe(
      async (response: any) => {
        if (response.success) {
          this.employees = response.employees;
          this.filteredEmployees = this.employees; 
          console.log('Datos de empleados obtenidos:', this.employees);
        } else {
          await this.toastrService.showError('Error en la solicitud', 'error');
        }
      },
      async (error) => {
        console.error('Error al realizar la solicitud:', error);
        this.toastrService.showError('Error al realizar la solicitud', 'error');
      }
    );
  }

  buscarUsuarios() {
    console.log('Búsqueda iniciada con:', this.filtroUsuarios, this.filtroRol);
    if (this.filtroUsuarios.trim() !== '') {
      this.filteredEmployees = this.employees.filter(employee =>
        (employee.username.toLowerCase().includes(this.filtroUsuarios.toLowerCase()) ||
          employee.name.toLowerCase().includes(this.filtroUsuarios.toLowerCase())) &&
        (this.filtroRol === '' || employee.role === this.filtroRol)
      );
      console.log('Resultados filtrados:', this.filteredEmployees);
      this.busquedaActiva = true;
    } else if (this.filtroRol !== '') {
      this.filteredEmployees = this.employees.filter(employee =>
        employee.role === this.filtroRol
      );
      console.log('Resultados filtrados por rol:', this.filteredEmployees);
      this.busquedaActiva = true;
    } else {
      this.filteredEmployees = this.employees;
      this.busquedaActiva = false;
    }
  }


  eliminarUsuario(id: number) {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      this.http.delete(`https://siinad.mx/php/deleteUser.php?id=${id}`).subscribe(
        async (response: any) => {
          if (response.success) {
            await this.toastrService.showSuccess('Usuario eliminado exitosamente', 'Exito');
          } else {
            await this.toastrService.showError('Error al eliminar usuario: ' + response.message, 'Error');
          }
          this.getEmployees();
        },
        async (error) => {
          console.error('Error en la solicitud DELETE:', error);
          await this.toastrService.showError('Error al eliminar usuario.', 'Error');
          this.getEmployees();
        }
      );
    }
  }

  getRolLegible(rol: string): string {
    switch (rol) {
      case 'adminS':
        return 'Administrador único de la Página';
      case 'adminE':
        return 'Administrador único de la Empresa';
      case 'adminEE':
        return 'Administrador único de la Empresa';
      case 'adminPE':
        return 'Administrador único de la Empresa';
      case 'admin':
        return 'Administrador de la empresa';
      case 'superV':
        return 'Supervisor de la empresa';
      case 'adminU':
        return 'Administrativo de la empresa';
      default:
        return 'Rol desconocido';
    }
  }

}
