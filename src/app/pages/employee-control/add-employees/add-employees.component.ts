/*
  En este codigo se maneja la logica para agregar un empleado, adicionalmente en una barra lateral se cargan
  las solicitudes de los ultimos 15 dias
*/

import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { NavController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { NbToastrService } from '@nebular/theme';
import { environment } from '../../../../environments/environment';
interface Empleado {
  [key: string]: any;
  departamento: string;
  puesto: string;
  turno: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  lugarNacimiento: string;
  estadoCivil: string;
  sexo: string;
  curp: string;
  numeroSeguroSocial: string;
  rfc: string;
  correoElectronico: string;
  telefono: string;
  contactoEmergencia: string;
  numEmergencia: string;
  fechaInicio: string;

  // Campos bancarios
  numeroCuenta: string;
  nombreBanco: string;
  sucursalBanco: string;
  clabeInterbancaria: string;
}


@Component({
  selector: 'ngx-add-employees',
  templateUrl: './add-employees.component.html',
  styleUrls: ['./add-employees.component.scss']
})
export class AddEmployeesComponent {


  isSubmitting = false; // Variable para controlar el envío

  empleado: Empleado = {
    departamento: '',
    puesto: '',
    turno: '',
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    lugarNacimiento: '',
    estadoCivil: '',
    sexo: '',
    curp: '',
    numeroSeguroSocial: '',
    rfc: '',
    correoElectronico: '',
    telefono: '',
    contactoEmergencia: '',
    numEmergencia: '',
    fechaInicio: '',

    // Campos bancarios
    numeroCuenta: '',
    nombreBanco: '',
    sucursalBanco: '',
    clabeInterbancaria: ''
  };

  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];
  genders: any[] = [];
  maritalStatuses: any[] = [];
  curpValidationMessage: string = '';
  mostrarInfonavit: boolean = false;
  files: { [key: string]: File } = {};
  allFieldsCompleted: boolean = false;

  solicitudes: any[] = [];

  
  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private navCtrl: NavController,
    private authService: AuthService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private companyService: CompanyService,
    private toastrService: NbToastrService
  ) { }

  ngOnInit() {
    this.fetchSolicitudesUltimos15Dias();
    this.fetchDepartamentos();
    this.fetchPuestos();
    this.fetchTurnos();
    this.fetchGenders();
    this.fetchMaritalStatuses();
  }


  async fetchSolicitudesUltimos15Dias() {
    const companyId = this.companyService.selectedCompany.id;  // ID de la empresa
    const userId = this.authService.userId;  // ID del usuario que inició sesión
    const today = new Date();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(today.getDate() - 15);
  
    const params = {
      company_id: companyId,
      user_id: userId,
      fechaInicio: fifteenDaysAgo.toISOString().split('T')[0],
      fechaFin: today.toISOString().split('T')[0],
    };
  
    // Crear y mostrar el spinner de Ionic
    const loading = await this.loadingController.create({
      message: 'Cargando solicitudes...',
      spinner: 'crescent',
    });
    await loading.present();
  
    this.http.get<any>(`${environment.apiBaseUrl}/get_employee_requests.php`, { params }).subscribe(
      data => {
        console.log('Solicitudes registradas:', data);
  
        // Verificar si 'data.solicitudes' es un array antes de asignarlo
        if (data && Array.isArray(data.solicitudes)) {
          this.solicitudes = data.solicitudes;
        } else {
          console.error('El dato recibido no es un array de solicitudes');
          this.solicitudes = [];
        }
        loading.dismiss(); // Oculta el spinner después de cargar los datos
      },
      error => {
        console.error('Error al cargar solicitudes registradas', error);
        this.solicitudes = [];
        loading.dismiss(); // Oculta el spinner si hay un error
      }
    );
  }

  soloLetrasEspacios(event: KeyboardEvent) {
    const allowedRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/;
    const key = event.key;
    if (!allowedRegex.test(key)) {
      event.preventDefault();
    }
  }

  soloNumeros(event: KeyboardEvent) {
    const allowedRegex = /^[0-9]$/;
    const key = event.key;
    if (!allowedRegex.test(key)) {
      event.preventDefault();
    }
  }
  
  
  


  getStatusDescription(status: string): string {
    switch (status.toLowerCase()) {  // Usar toLowerCase() para asegurarnos de que no haya errores por mayúsculas/minúsculas
      case 'incomplete':
        return 'Solicitud incompleta - Pendiente de información adicional';
      case 'pending':
        return 'Solicitud pendiente - En espera de aprobación por el administrador';
      case 'complete':
        return 'Solicitud completa - En espera de procesamiento por el administrativo';
      case 'finish':
        return 'Solicitud finalizada - Empleado dado de alta';
      default:
        return 'Estado desconocido';
    }
  }

  fetchDepartamentos() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<any[]>(`${environment.apiBaseUrl}/get_departments.php?company_id=${companyId}`).subscribe(
      data => {
        console.log('Departamentos:', data); // Verificar la respuesta
        this.departamentos = Array.isArray(data) ? data : []; // Asegurarse de que sea un array
      },
      error => {
        console.error('Error al cargar departamentos', error);
        this.departamentos = []; // En caso de error, asigna un array vacío
      }
    );
  }

  fetchPuestos() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<any[]>(`${environment.apiBaseUrl}/get_positions.php?company_id=${companyId}`).subscribe(
      data => {
        console.log('Puestos:', data); // Verificar la respuesta
        this.puestos = Array.isArray(data) ? data : []; // Asegurarse de que sea un array
      },
      error => {
        console.error('Error al cargar puestos', error);
        this.puestos = []; // En caso de error, asigna un array vacío
      }
    );
  }

  fetchTurnos() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<any[]>(`${environment.apiBaseUrl}/get_shifts.php?company_id=${companyId}`).subscribe(
      data => {
        console.log('Turnos:', data); // Verificar la respuesta
        this.turnos = Array.isArray(data) ? data : []; // Asegurarse de que sea un array
      },
      error => {
        console.error('Error al cargar turnos', error);
        this.turnos = []; // En caso de error, asigna un array vacío
      }
    );
  }

  fetchGenders() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/get_genders.php`).subscribe(
      data => this.genders = data,
      error => console.error('Error al cargar géneros', error)
    );
  }

  fetchMaritalStatuses() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/get_marital_statuses.php`).subscribe(
      data => this.maritalStatuses = data,
      error => console.error('Error al cargar estados civiles', error)
    );
  }


  onFileChange(event: any, fileType: string) {
    const file = event.target.files[0];
    if (file) {
      this.files[fileType] = file;
      console.log(`Archivo ${fileType} seleccionado:`, file);
      this.checkAllFieldsCompleted();
    }
  }

  mostrarOcultarCampo(selectedValue: any) {
    this.mostrarInfonavit = selectedValue === 'si';
  }
  
  async onSubmit(form: NgForm) {
    if (this.isSubmitting) return; // Evita doble envío
    this.isSubmitting = true; // Bloquea envíos adicionales
  
    // Crea y muestra el spinner de Ionic
    const loading = await this.loadingController.create({
      message: 'Procesando solicitud...',
      spinner: 'crescent',
    });
    await loading.present();
  
    if (form.valid) {
      const status = this.allFieldsCompleted ? 'Pending' : 'Incomplete';
      const data = {
        ...this.empleado,
        companyId: this.companyService.selectedCompany.id,
        userId: this.authService.userId,
        status,
      };
  
      this.http.post(`${environment.apiBaseUrl}/submit_employee.php`, data).subscribe(
        async (response: any) => {
          const employeeId = response.employee_id;
          const requestId = response.request_id;
  
          if (employeeId) {
            await this.uploadFiles(employeeId);
  
            // Mensaje de éxito con Nebular
            this.toastrService.success(
              status === 'Pending'
                ? `Empleado registrado exitosamente. Folio de solicitud: ${requestId}.`
                : `Información guardada. Tienes 3 días para completar la solicitud. Folio: ${requestId}.`,
              status === 'Pending' ? 'Solicitud Enviada' : 'Información Guardada',
              {
                duration: 4000,
                status: 'success',
              }
            );
          } else {
            // Toast de error con Nebular
            this.toastrService.danger(
              'Error al registrar empleado.',
              'Error',
              {
                duration: 2000,
                status: 'danger',
              }
            );
          }
          loading.dismiss(); // Oculta el spinner
          this.isSubmitting = false; // Libera el bloqueo
        },
        error => {
          // Toast de error con Nebular
          this.toastrService.danger(
            'Error al registrar empleado.',
            'Error',
            {
              duration: 2000,
              status: 'danger',
            }
          );
          loading.dismiss(); // Oculta el spinner
          this.isSubmitting = false; // Libera el bloqueo
        }
      );
    } else {
      // Toast de validación de formulario con Nebular
      this.toastrService.warning(
        'Por favor, complete todos los campos obligatorios.',
        'Validación',
        {
          duration: 2000,
          status: 'warning',
        }
      );
      this.validateAllFormFields(form);
      loading.dismiss(); // Oculta el spinner
      this.isSubmitting = false; // Libera el bloqueo
    }
  }
  
  




  checkAllFieldsCompleted() {
    this.allFieldsCompleted = !!(
      this.empleado.nombre &&
      this.empleado.apellidoPaterno &&
      this.empleado.apellidoMaterno &&
      this.empleado.curp &&
      this.empleado.numeroSeguroSocial &&
      this.empleado.rfc &&
      this.empleado.fechaInicio &&
      this.files['ineFrente'] &&
      this.files['ineReverso'] &&
      this.files['constanciaFiscal']
    );
  }


  async uploadFiles(employeeId: number) {
    const formData = new FormData();
    formData.append('employee_id', employeeId.toString());
  
    Object.keys(this.files).forEach(fileType => {
      formData.append(fileType, this.files[fileType]);
    });
  
    // Crear y mostrar el spinner de Ionic
    const loading = await this.loadingController.create({
      message: 'Subiendo archivos...',
      spinner: 'crescent',
    });
    await loading.present();
  
    this.http.post(`${environment.apiBaseUrl}/upload_employee_files.php`, formData).subscribe(
      response => {
        // Ocultar el spinner
        loading.dismiss();
  
        // Toast de éxito con Nebular
        this.toastrService.success(
          'Archivos del empleado subidos exitosamente.',
          'Éxito',
          {
            duration: 2000,
            status: 'success',
          }
        );
      },
      error => {
        // Ocultar el spinner
        loading.dismiss();
  
        // Toast de error con Nebular
        this.toastrService.danger(
          'Error al subir archivos del empleado.',
          'Error',
          {
            duration: 2000,
            status: 'danger',
          }
        );
        console.error('Error al subir archivos:', error);
      }
    );
  }
  
  

  validateAllFormFields(form: NgForm) {
    Object.keys(form.controls).forEach(field => {
      const control = form.controls[field];
      control?.markAsTouched({ onlySelf: true });
    });
  }

}
