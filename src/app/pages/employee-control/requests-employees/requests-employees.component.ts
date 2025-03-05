import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { CompanyService } from '../../../services/company.service';
import { SharedService } from '../../../services/shared.service';
import { NavController, ToastController, LoadingController, AlertController } from '@ionic/angular';
import { NbToastrService } from '@nebular/theme';
import { NgForm } from '@angular/forms';
interface Empleado {
  [key: string]: any;
  employee_id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  birth_date: string;
  birth_place: string;
  marital_status_id: number;
  gender_id: number;
  curp: string;
  social_security_number: string;
  rfc: string;
  email: string;
  phone_number: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  start_date: string;
  department_id: number;
  position_id: number;
  shift_id: number;
  status: string;
  net_balance?: number;  // Campo adicional para saldo neto
  daily_salary?: number; // Campo adicional para salario diario
  employee_code?: string; // Campo adicional para código del empleado
  bank_account_number: string;
  bank_name: string;
  bank_branch: string;
  clabe: string;

}

@Component({
  selector: 'ngx-requests-employees',
  templateUrl: './requests-employees.component.html',
  styleUrls: ['./requests-employees.component.scss']
})
export class RequestsEmployeesComponent {

  empleadosPendientes: Empleado[] = [];
  selectedEmployee: Empleado | null = null;
  departamentos: any[] = [];
  puestos: any[] = [];
  turnos: any[] = [];
  genders: any[] = [];
  maritalStatuses: any[] = [];
  curpValidationMessage: string = '';
  mostrarInfonavit: boolean = false;
  files: { [key: string]: File } = {};
  employeeFiles: any = {};
  allFieldsCompleted: boolean = false;
  buttonNameSucessEmployee: string = '';

  solicitudes: any[] = [];

  public selectedEmployeeId: number | null = null;   // Para guardar el ID


  constructor(
    private http: HttpClient,


    private authService: AuthService,
    public sharedService: SharedService,
    private companyService: CompanyService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private toastrService: NbToastrService
  ) { }


  ngOnInit() {
    this.fetchSolicitudesUltimos15Dias();
    this.loadPermissions();
  }


  fetchSolicitudesUltimos15Dias() {
    const companyId = this.companyService.selectedCompany.id;  // ID de la empresa
    const userId = this.authService.userId;  // ID del usuario que inició sesión (asegúrate de que esto esté disponible)
    const today = new Date();
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(today.getDate() - 15);

    const params = {
      company_id: companyId,
      user_id: userId,  // Se añade el parámetro del usuario
      fechaInicio: fifteenDaysAgo.toISOString().split('T')[0],
      fechaFin: today.toISOString().split('T')[0],
    };

    this.http.get<any>('https://siinad.mx/php/get_employee_requests.php', { params }).subscribe(
      data => {
        console.log('Solicitudes registradas:', data); // Verifica los datos recibidos

        // Verificar si 'data.solicitudes' es un array antes de asignarlo
        if (data && Array.isArray(data.solicitudes)) {
          this.solicitudes = data.solicitudes;
        } else {
          console.error('El dato recibido no es un array de solicitudes');
          this.solicitudes = []; // Asigna un array vacío si no es un array
        }
      },
      error => {
        console.error('Error al cargar solicitudes registradas', error);
        this.solicitudes = [];
      }
    );
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



  async loadPermissions() {
    const loading = await this.loadingController.create({
      message: 'Cargando permisos...',
      spinner: 'crescent'
    });
    await loading.present();

    this.sharedService.loadPermissions().subscribe(
      async (response: any) => {
        if (response.success) {
          this.sharedService.permissions = response.permissions.map((perm: any) => ({
            section: perm.section,
            subSection: perm.subSection
          }));
          console.log('Permisos cargados:', this.sharedService.permissions); // Depuración

          this.buttonNameSucessEmployee = this.sharedService.hasPermission('Empleados', 'Procesar empleados')
            ? 'Aceptar empleado'
            : 'Enviar Solicitud Pendiente';

          this.loadInitialData();
        } else {
          console.error('Error en la respuesta de permisos:', response.error);
        }
        await loading.dismiss();
      },
      async (error) => {
        console.error('Error en la solicitud POST:', error);
        await loading.dismiss();
      }
    );
  }

  loadInitialData() {
    this.fetchPendingEmployees();
    this.fetchGenders();
    this.fetchMaritalStatuses();
    this.fetchDepartamentos();
    this.fetchPuestos();
    this.fetchTurnos();
  }


  async fetchPendingEmployees() {
    const loading = await this.loadingController.create({
      message: 'Cargando empleados pendientes...',
      spinner: 'crescent'
    });
    await loading.present();

    const companyId = this.companyService.selectedCompany.id;
    let endpoint = '';

    if (this.sharedService.hasPermission('Empleados', 'Editar solicitudes de empleados')) {
      endpoint = 'get_incomplete_employees.php';
    } else if (this.sharedService.hasPermission('Empleados', 'Aceptar solicitudes de empleados')) {
      endpoint = 'get_pending_employees.php';
    } else if (this.sharedService.hasPermission('Empleados', 'Procesar empleados')) {
      endpoint = 'get_complete_employees.php';
    }

    this.http.get<any[]>(`https://siinad.mx/php/${endpoint}?company_id=${companyId}`).subscribe(
      data => {
        console.log('Respuesta del servidor:', data);
        if (Array.isArray(data)) {
          this.empleadosPendientes = data;
        } else {
          console.error('Error: la respuesta no es un array');
        }

      },
      error => console.error('Error al cargar empleados pendientes', error)
    ).add(() => {
      loading.dismiss();
    });
  }


  fetchDepartamentos() {
    const companyId = this.companyService.selectedCompany.id;
    this.http.get<any[]>(`https://siinad.mx/php/get_departments.php?company_id=${companyId}`).subscribe(
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
    this.http.get<any[]>(`https://siinad.mx/php/get_positions.php?company_id=${companyId}`).subscribe(
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
    this.http.get<any[]>(`https://siinad.mx/php/get_shifts.php?company_id=${companyId}`).subscribe(
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

  async fetchGenders() {
    const loading = await this.loadingController.create({
      message: 'Cargando géneros...',
      spinner: 'crescent'
    });
    await loading.present();

    this.http.get<any[]>('https://siinad.mx/php/get_genders.php').subscribe(
      data => {
        this.genders = data;

      },
      error => console.error('Error al cargar géneros', error)
    ).add(() => {
      loading.dismiss();
    });
  }


  async fetchMaritalStatuses() {
    const loading = await this.loadingController.create({
      message: 'Cargando estados civiles...',
      spinner: 'crescent'
    });
    await loading.present();

    this.http.get<any[]>('https://siinad.mx/php/get_marital_statuses.php').subscribe(
      data => {
        this.maritalStatuses = data;

      },
      error => console.error('Error al cargar estados civiles', error)
    ).add(() => {
      loading.dismiss();
    });
  }


  async fetchEmployeeFiles(employeeId: number) {
    const loading = await this.loadingController.create({
      message: 'Cargando archivos del empleado...',
      spinner: 'crescent'
    });
    await loading.present();

    this.http.get<any>(`https://siinad.mx/php/get_employee_files.php?employee_id=${employeeId}`).subscribe(
      data => {
        this.employeeFiles = data;
        this.checkAllFieldsCompleted();

      },
      error => console.error('Error al cargar archivos del empleado', error)
    ).add(() => {
      loading.dismiss();
    });
  }

  onSelectEmployee(employeeId: number) {
    // El $event trae directamente el employee_id
    this.selectedEmployeeId = employeeId;
    this.selectedEmployee = this.empleadosPendientes.find(
      (emp) => emp.employee_id === employeeId
    ) || null;

    if (this.selectedEmployee) {
      this.fetchEmployeeFiles(this.selectedEmployee.employee_id);
      this.checkAllFieldsCompleted();
    }
  }

  async eliminarSolicitud() {
    if (this.selectedEmployee) {
      const loading = await this.loadingController.create({
        message: 'Eliminando solicitud...',
        spinner: 'crescent'
      });
      await loading.present();

      const employeeId = this.selectedEmployee.employee_id;
      this.http.post('https://siinad.mx/php/delete_employee_request.php', { employee_id: employeeId }).subscribe(
        async (response: any) => {
          this.toastrService.success(
            'Solicitud de empleado eliminada exitosamente.',
            'Éxito',
            {
              duration: 2000, // tiempo en milisegundos
              status: 'success',
            }
          );
          this.fetchPendingEmployees();
          this.selectedEmployee = null;
        },
        async error => {
          this.toastrService.danger(
            'Error al eliminar solicitud de empleado.',
            'Error',
            {
              duration: 2000,
              status: 'danger',
            }
          );

        }
      ).add(() => {
        loading.dismiss();
      });
    }
  }

  async rechazarSolicitud() {
    if (this.selectedEmployee) {
      const loading = await this.loadingController.create({
        message: 'Rechazando solicitud...',
        spinner: 'crescent',
      });
      await loading.present();

      const data = {
        employee_id: this.selectedEmployee.employee_id,
        status: 'Rejected',
      };

      this.http
        .post('https://siinad.mx/php/update_employee_status.php', data)
        .subscribe(
          (response: any) => {
            // Toast de éxito con Nebular
            this.toastrService.warning(
              'Solicitud de empleado rechazada exitosamente.',
              'Solicitud Rechazada',
              {
                duration: 2000,
                status: 'warning',
              }
            );
            this.fetchPendingEmployees();
            this.selectedEmployee = null;
          },
          (error) => {
            // Toast de error con Nebular
            this.toastrService.danger(
              'Error al rechazar la solicitud de empleado.',
              'Error',
              {
                duration: 2000,
                status: 'danger',
              }
            );
            console.error(error);
          }
        )
        .add(() => {
          loading.dismiss();
        });
    }
  }



  onFileChange(event: any, fileType: string) {
    const file = event.target.files[0];
    if (file) {
      this.files[fileType] = file;
      this.checkAllFieldsCompleted();
    }
  }




  eliminarArchivo(fileId: number) {
    this.http.post('https://siinad.mx/php/delete_employee_file.php', { file_id: fileId }).subscribe(
      response => {
        if (this.selectedEmployee) {
          this.fetchEmployeeFiles(this.selectedEmployee.employee_id);
        }
      },
      error => console.error('Error al eliminar archivo', error)
    );
  }


  checkAllFieldsCompleted() {
    console.log('Verificando permisos y campos completados');

    if (this.sharedService.hasPermission('Empleados', 'Editar solicitudes de empleados')) {
      // Verificación para 'superV'
      this.allFieldsCompleted = !!(
        this.selectedEmployee?.first_name &&
        this.selectedEmployee?.last_name &&
        this.selectedEmployee?.middle_name &&
        this.selectedEmployee?.curp &&
        this.selectedEmployee?.social_security_number &&
        this.selectedEmployee?.rfc &&
        this.selectedEmployee?.start_date &&
        (this.files['ineFrente'] || (this.employeeFiles['ineFrente'] && this.employeeFiles['ineFrente'].length > 0)) &&
        (this.files['ineReverso'] || (this.employeeFiles['ineReverso'] && this.employeeFiles['ineReverso'].length > 0)) &&
        (this.files['constanciaFiscal'] || (this.employeeFiles['constanciaFiscal'] && this.employeeFiles['constanciaFiscal'].length > 0))
      );
    } else if (this.sharedService.hasPermission('Empleados', 'Aceptar solicitudes de empleados')) {
      // Verificación para 'admin'
      this.allFieldsCompleted = !!(
        this.selectedEmployee?.first_name &&
        this.selectedEmployee?.last_name &&
        this.selectedEmployee?.middle_name &&
        this.selectedEmployee?.curp &&
        this.selectedEmployee?.social_security_number &&
        this.selectedEmployee?.rfc &&
        this.selectedEmployee?.start_date &&
        this.selectedEmployee?.net_balance &&
        this.selectedEmployee?.email &&
        this.selectedEmployee?.phone_number &&
        (this.files['ineFrente'] || (this.employeeFiles['ineFrente'] && this.employeeFiles['ineFrente'].length > 0)) &&
        (this.files['ineReverso'] || (this.employeeFiles['ineReverso'] && this.employeeFiles['ineReverso'].length > 0)) &&
        (this.files['constanciaFiscal'] || (this.employeeFiles['constanciaFiscal'] && this.employeeFiles['constanciaFiscal'].length > 0)) &&
        (this.files['cuentaInterbancaria'] || (this.employeeFiles['cuentaInterbancaria'] && this.employeeFiles['cuentaInterbancaria'].length > 0))
      );
    } else if (this.sharedService.hasPermission('Empleados', 'Procesar empleados')) {
      // Verificación para 'adminU'
      this.allFieldsCompleted = !!(
        this.selectedEmployee?.employee_code &&
        this.selectedEmployee?.daily_salary
      );
    }


  }


  onSubmit(form: NgForm) {
    console.log('Formulario enviado:', form.value); // Ver los valores del formulario
    console.log('Formulario válido:', form.valid); // Ver si el formulario es válido
    console.log('Empleado seleccionado:', this.selectedEmployee); // Ver el empleado seleccionado

    if (form.valid && this.selectedEmployee) {
      const data: any = {
        id: this.selectedEmployee.employee_id,
        departamento: this.selectedEmployee.department_id,
        puesto: this.selectedEmployee.position_id,
        turno: this.selectedEmployee.shift_id,
        nombre: this.selectedEmployee.first_name,
        apellidoPaterno: this.selectedEmployee.last_name,
        apellidoMaterno: this.selectedEmployee.middle_name,
        fechaNacimiento: this.selectedEmployee.birth_date,
        estadoCivil: this.selectedEmployee.marital_status_id,
        sexo: this.selectedEmployee.gender_id,
        curp: this.selectedEmployee.curp,
        numeroSeguroSocial: this.selectedEmployee.social_security_number,
        rfc: this.selectedEmployee.rfc,
        correoElectronico: this.selectedEmployee.email,
        telefono: this.selectedEmployee.phone_number,
        contactoEmergencia: this.selectedEmployee.emergency_contact_name,
        numEmergencia: this.selectedEmployee.emergency_contact_number,
        fechaInicio: this.selectedEmployee.start_date,
        lugarNacimiento: this.selectedEmployee.birth_place,
        numeroCuentaBancaria: this.selectedEmployee.bank_account_number,
        nombreBanco: this.selectedEmployee.bank_name,
        sucursalBanco: this.selectedEmployee.bank_branch,
        clabeInterbancaria: this.selectedEmployee.clabe,
        companyId: this.companyService.selectedCompany.id,
      };

      if (this.sharedService.hasPermission('Empleados', 'Aceptar solicitudes de empleados')) {
        data.net_balance = this.selectedEmployee.net_balance;
      }

      if (this.sharedService.hasPermission('Empleados', 'Procesar empleados')) {
        data.daily_salary = this.selectedEmployee.daily_salary;
        data.employee_code = this.selectedEmployee.employee_code;
      }

      this.http.post('https://siinad.mx/php/update_employee.php', data).subscribe(
        (response: any) => {
          this.uploadFiles();
          // Toast de éxito con Nebular
          this.toastrService.success(
            'Empleado actualizado exitosamente.',
            'Éxito',
            {
              duration: 2000,
              status: 'success',
            }
          );
        },
        (error) => {
          // Toast de error con Nebular
          this.toastrService.danger(
            'Error al actualizar empleado.',
            'Error',
            {
              duration: 2000,
              status: 'danger',
            }
          );
          console.error(error);
        }
      );
    } else {
      this.validateAllFormFields(form);
    }
  }


  async uploadFiles() {
    if (!this.selectedEmployee || Object.keys(this.files).length === 0) {
      console.warn('No hay empleado seleccionado o archivos para subir.');
      this.toastrService.warning(
        'Debe seleccionar un empleado y archivos antes de continuar.',
        'Advertencia',
        {
          duration: 2000,
          status: 'warning',
        }
      );
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Subiendo archivos...',
      spinner: 'crescent',
    });
    await loading.present();

    const formData = new FormData();
    formData.append('employee_id', this.selectedEmployee.employee_id.toString());

    for (const fileType in this.files) {
      if (this.files.hasOwnProperty(fileType)) {
        formData.append(fileType, this.files[fileType]);
      }
    }

    try {
      const response = await this.http.post('https://siinad.mx/php/update_upload_files.php', formData).toPromise();

      // Toast de éxito con Nebular
      this.toastrService.success(
        'Archivos actualizados exitosamente.',
        'Éxito',
        {
          duration: 2000,
          status: 'success',
        }
      );

      this.fetchPendingEmployees();
      this.selectedEmployee = null;
    } catch (error) {
      // Toast de error con Nebular
      this.toastrService.danger(
        'Error al actualizar archivos.',
        'Error',
        {
          duration: 2000,
          status: 'danger',
        }
      );
      console.error('Error al subir archivos:', error);
    } finally {
      loading.dismiss();
    }
  }



  async enviarSolicitudPendiente(form: NgForm) {

    this.onSubmit(form);

    if (this.selectedEmployee) {
      const loading = await this.loadingController.create({
        message: 'Enviando solicitud pendiente...',
        spinner: 'crescent'
      });
      await loading.present();

      let newStatus = 'Pending';
      let employeeStatus = '';

      if (this.sharedService.hasPermission('Empleados', 'Aceptar solicitudes de empleados')) {
        newStatus = 'Complete';
        employeeStatus = 'A';
      } else if (this.sharedService.hasPermission('Empleados', 'Editar solicitudes de empleados')) {
        newStatus = 'Pending';
      } else if (this.sharedService.hasPermission('Empleados', 'Procesar empleados')) {
        newStatus = 'Finish';
      }

      const data: any = {
        employee_id: this.selectedEmployee.employee_id,
        status: newStatus
      };

      if (newStatus === 'Complete') {
        data.employee_status = employeeStatus;
      }

      // Enviar la solicitud al backend
      this.http.post('https://siinad.mx/php/update_employee_status.php', data).subscribe(
        async (response: any) => {
          if (response && response.folio) {
            console.log('Folio recibido:', response.folio);  // Aquí recibes el folio y lo puedes utilizar
            await this.uploadFiles();

            // Mostrar alertas dependiendo del estado
            if (newStatus === 'Pending') {
              const alert = await this.alertController.create({
                header: 'Solicitud Enviada',
                message: `La solicitud ha sido enviada al administrador para su aprobación. Folio: ${response.folio}`,
                buttons: ['OK']
              });
              await alert.present();
            } else if (newStatus === 'Complete') {
              const alert = await this.alertController.create({
                header: 'Solicitud en Proceso',
                message: `La solicitud está en espera de procesamiento por un administrativo. Folio: ${response.folio}`,
                buttons: ['OK']
              });
              await alert.present();
            } else if (newStatus === 'Finish') {
              const alert = await this.alertController.create({
                header: 'Empleado Dado de Alta',
                message: `El empleado ha sido dado de alta exitosamente. Folio: ${response.folio}`,
                buttons: ['OK']
              });
              await alert.present();
            }

            this.fetchSolicitudesUltimos15Dias();
            this.fetchPendingEmployees();
            this.selectedEmployee = null;
          } else {
            // Toast de error con Nebular
            this.toastrService.danger(
              'Error: No se recibió el folio de la solicitud.',
              'Error',
              {
                duration: 2000,
                status: 'danger',
              }
            );
          }

          async (error) => {
            // Toast de error con Nebular
            this.toastrService.danger(
              'Error al actualizar el estado de la solicitud.',
              'Error',
              {
                duration: 2000,
                status: 'danger',
              }
            );
            console.error(error);
          };


        }
      ).add(() => {
        loading.dismiss();
      });
    }

  }


  validateAllFormFields(form: NgForm) {
    Object.keys(form.controls).forEach(field => {
      const control = form.controls[field];
      control?.markAsTouched({ onlySelf: true });
    });
  }

  selectEmployee(employee: Empleado | null) {
    this.selectedEmployee = employee;
    this.checkAllFieldsCompleted();
  }

  cancelarYResetear() {
    this.selectedEmployee = null;
    const employeeSelect = document.getElementById('employeeSelect') as HTMLSelectElement;
    if (employeeSelect) {
      employeeSelect.value = ''; // Resetea el valor seleccionado
    }
  }

  downloadFile(filePath: string) {
    const fullUrl = `https://www.siinad.mx/php/${filePath}`; // URL completa del archivo
    window.open(fullUrl, '_blank'); // Abrir el archivo en una nueva pestaña o iniciar la descarga
  }

  mostrarOcultarCampo(selectedValue: any) {
    this.mostrarInfonavit = selectedValue === 'si';
  }


}
