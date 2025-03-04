import { Component, OnInit } from '@angular/core';
import { NbWindowRef } from '@nebular/theme';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../../../services/company.service';

@Component({
  selector: 'ngx-register-user',
  templateUrl: './register-user.component.html',
  styleUrls: ['./register-user.component.scss']
})
export class RegisterUserComponent implements OnInit {
  employee: any;
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  employeeName: string = '';
  employeeEmail: string = '';
  errorMessage: string = '';

  // Nuevas propiedades
  levelUsers: any[] = [];
  selectedLevelUserId: string = '';
  companyId: string = '';

  constructor(
    protected windowRef: NbWindowRef,
    private http: HttpClient,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    // Obtener datos del empleado (vienen por contexto)
    const context = this.windowRef.config.context as { employee: any };
    this.employee = context.employee;
    if (this.employee) {
      this.employeeName = `${this.employee.first_name} ${this.employee.middle_name ? this.employee.middle_name + ' ' : ''}${this.employee.last_name}`;
      this.employeeEmail = this.employee.email;
    }

    // Obtener el company_id del service
    this.companyId = this.companyService.selectedCompany.id;

    // Obtener la lista de niveles de usuario desde get-level-users.php
    this.http.get<any>('https://siinad.mx/php/get-level-users.php')
      .subscribe(
        data => {
          this.levelUsers = data; // Se asume que se retorna un arreglo de objetos { id, levelUserName, ... }
          // Seleccionar por defecto el primer nivel (o se puede ajustar para asignar Supervisor si se desea)
          if (this.levelUsers && this.levelUsers.length > 0) {
            this.selectedLevelUserId = this.levelUsers[0].id;
          }
        },
        error => {
          console.error('Error al obtener los niveles de usuario:', error);
        }
      );
  }

  register() {
    // Validaciones simples
    if (!this.username || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Por favor complete todos los campos obligatorios.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    const formData = new FormData();
    formData.append('employee_id', this.employee.employee_id);
    formData.append('username', this.username);
    formData.append('name', this.employeeName);
    formData.append('email', this.employeeEmail);
    formData.append('password', this.password);
    formData.append('company_id', this.companyId);
    formData.append('levelUserId', this.selectedLevelUserId);

    this.http.post<any>('https://siinad.mx/php/postUser.php', formData)
      .subscribe(
        response => {
          if (response.success) {
            alert('Usuario creado exitosamente');
            this.windowRef.close(response);
          } else {
            this.errorMessage = response.message;
          }
        },
        error => {
          console.error(error);
          this.errorMessage = 'Error al crear el usuario.';
        }
      );
  }

  cancel() {
    this.windowRef.close();
  }
}
