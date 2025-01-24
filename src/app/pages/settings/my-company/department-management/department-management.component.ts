import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../../../../services/company.service';
import { NbToastrService } from '@nebular/theme';
import { NbGlobalPhysicalPosition } from '@nebular/theme';
@Component({
  selector: 'ngx-department-management',
  templateUrl: './department-management.component.html',
  styleUrls: ['./department-management.component.scss']
})
export class DepartmentManagementComponent {
  departments: any[] = [];
  positions: any[] = [];
  shifts: any[] = [];
  newDepartment: any = { department_name: '', description: '', company_id: '' };
  newPosition: any = { position_name: '', description: '', company_id: '' };

    // Actualización del modelo de datos para manejar múltiples días de descanso
    newShift: any = {
      shift_name: '',
      description: '',
      start_time: '',
      end_time: '',
      lunch_start_time: '',
      lunch_end_time: '',
      second_lunch_start_time: '',
      second_lunch_end_time: '',
      rest_days: [], // Cambiar a un array para almacenar varios días de descanso
      company_id: ''
    };

    selectedDepartment: any = null;
    selectedPosition: any = null;
    selectedShift: any = null;
    isAddingPosition: boolean = false;
    isAddingShift: boolean = false;
    showSecondLunch: boolean = false;  // Variable para mostrar/ocultar segunda hora de comida

    constructor(
      private http: HttpClient,
      private companyService: CompanyService,
      private toastrService: NbToastrService,
    ) { }

    ngOnInit() {
      this.fetchDepartments();
      this.fetchPositions();
      this.fetchShifts();
    }


    async fetchDepartments() {
  
      const companyId = this.companyService.selectedCompany.id;
      this.http.get<any[]>(`https://siinad.mx/php/get_departments.php?company_id=${companyId}`).subscribe(
        data => {
          this.departments = Array.isArray(data) ? data : [];
       
        },
        error => {
          console.error('Error al cargar departamentos', error);
         
        
        }
      );
    }


    async fetchPositions() {
    
      const companyId = this.companyService.selectedCompany.id;
      this.http.get<any[]>(`https://siinad.mx/php/get_positions.php?company_id=${companyId}`).subscribe(
        data => {
          this.positions = Array.isArray(data) ? data : [];
         
        },
        error => {
          console.error('Error al cargar puestos', error);
      
         
        }
      );
    }

    async fetchShifts() {
    
      const companyId = this.companyService.selectedCompany.id;
      this.http.get<any[]>(`https://siinad.mx/php/get_shifts.php?company_id=${companyId}`).subscribe(
        data => {
          this.shifts = Array.isArray(data) ? data : [];
          
        },
        error => {
          console.error('Error al cargar turnos', error);
       
        }
      );
    }

    selectDepartment(department: any) {
      this.selectedDepartment = department;
    }

    selectPosition(position: any) {
      this.selectedPosition = position;
    }

    startAddPosition() {
      this.isAddingPosition = true;
      this.selectedPosition = null;
      this.newPosition = { position_name: '', description: '', company_id: this.companyService.selectedCompany.id };
    }

    selectShift(shift: any) {
      this.selectedShift = shift;
    }

    startAddShift() {
      this.isAddingShift = true;
      this.selectedShift = null;
      this.newShift = { shift_name: '', description: '', start_time: '', end_time: '', company_id: this.companyService.selectedCompany.id };
    }

    createNewDepartment() {
      this.selectedDepartment = { department_name: '', description: '', company_id: this.companyService.selectedCompany.id };
    }

    async saveDepartmentConfig() {
      if (this.selectedDepartment.department_name) {
      
        this.selectedDepartment.company_id =  this.companyService.selectedCompany.id;
        const url = this.selectedDepartment.department_id
          ? 'https://siinad.mx/php/edit_department.php'
          : 'https://siinad.mx/php/add_department.php';
  
        this.http.post(url, this.selectedDepartment).subscribe(
          () => {
          
            this.fetchDepartments();
            this.createNewDepartment();
            this.showToast('success', '¡Cambios guardados exitosamente!', 'Éxito');
           
          },
          error => {
            console.error('Error al guardar el departamento', error);
            this.showToast('danger', 'Error al guardar los cambios. Inténtelo de nuevo.', 'Error');
           
          }
        );
      }
    }

    showToast(status: string, message: string, title: string) {
      this.toastrService.show(message, title, {
        status: status,
        duration: 3000, // Duración de la alerta en milisegundos
        position:NbGlobalPhysicalPosition.TOP_RIGHT, // Posición de la alerta
      });
    }
    

    async savePositionConfig() {
      if (this.getCurrentPosition().position_name) {
      
        const positionData = { ...this.getCurrentPosition(), company_id:this.companyService.selectedCompany.id };
        const url = this.selectedPosition && this.selectedPosition.position_id
          ? 'https://siinad.mx/php/update_position.php'
          : 'https://siinad.mx/php/add_position.php';
  
        this.http.post(url, positionData).subscribe(
          () => {
            
            this.fetchPositions();
            this.isAddingPosition = false;
            this.selectedPosition = null;
            this.showToast('success', '¡Cambios guardados exitosamente!', 'Éxito');
         
          },
          error => {
            console.error('Error al guardar el puesto', error);
            this.showToast('danger', 'Error al guardar los cambios. Inténtelo de nuevo.', 'Error');

          }
        );
      }
    }

    async saveShiftConfig() {
      if (this.getCurrentShift().shift_name) {
    
        const shiftData = { 
          ...this.getCurrentShift(), 
          company_id: this.companyService.selectedCompany.id,
          rest_days: JSON.stringify(this.getCurrentShift().rest_days) // Convertir a JSON antes de enviar
        };
    
        const url = this.selectedShift && this.selectedShift.shift_id
          ? 'https://siinad.mx/php/update_shift.php'
          : 'https://siinad.mx/php/add_shift.php';
    
        this.http.post(url, shiftData).subscribe(
          () => {
         
            this.fetchShifts();
            this.isAddingShift = false;
            this.selectedShift = null;
            this.showToast('success', '¡Cambios guardados exitosamente!', 'Éxito');
           
          },
          error => {
            console.error('Error al guardar el turno', error);
            this.showToast('danger', 'Error al guardar los cambios. Inténtelo de nuevo.', 'Error');
         
          }
        );
      }
    }

    toggleSecondLunch() {
      this.showSecondLunch = !this.showSecondLunch;
    }
  
    // Helper functions to determine whether to return new or existing position and shift
    getCurrentPosition() {
      return this.selectedPosition || this.newPosition;
    }
  
    // Helper function to get the current shift (either new or selected)
    getCurrentShift() {
      return this.selectedShift || this.newShift;
    }
  
    // Delete selected department
    async deleteDepartment() {
      if (this.selectedDepartment?.department_id) {
        
        const companyId = this.companyService.selectedCompany.id;
        this.http.post('https://siinad.mx/php/delete_department.php', { department_id: this.selectedDepartment.department_id, company_id: companyId }).subscribe(
          () => {
           
            this.fetchDepartments();
            this.showToast('success', '¡Departamento eliminado correctamente!', 'Éxito');
            
       
          },
          error => {
            console.error('Error al borrar departamento', error);
            this.showToast('danger', 'No se pudo eliminar el departamento. Inténtelo de nuevo.', 'Error');
           
          }
        );
      }
    }

    
  // Delete selected position
  async deletePosition() {
    if (this.selectedPosition?.position_id) {
      
      const companyId = this.companyService.selectedCompany.id;
      this.http.post('https://siinad.mx/php/delete_position.php', { position_id: this.selectedPosition.position_id, company_id: companyId }).subscribe(
        () => {
         
          this.fetchPositions();
          this.showToast('success', '¡Puesto eliminado correctamente!', 'Éxito');
       
        },
        error => {
          console.error('Error al borrar puesto', error);
          this.showToast('danger', 'No se pudo eliminar el puesto. Inténtelo de nuevo.', 'Error');
        
        }
      );
    }
  }

  
  async deleteShift() {
    if (this.selectedShift?.shift_id) {
    
      const companyId = this.companyService.selectedCompany.id;
      this.http.post('https://siinad.mx/php/delete_shift.php', { shift_id: this.selectedShift.shift_id, company_id: companyId }).subscribe(
        () => {
        
          this.fetchShifts();
          this.showToast('success', '¡Turno eliminado correctamente!', 'Éxito');
      
        },
        error => {
          console.error('Error al borrar turno', error);
          this.showToast('success', '¡Turno eliminado correctamente!', 'Éxito');
      
        }
      );
    }
  }



}
