/*
  En este codigo se muestran y crean los departamentos, puestos y horarios de la empresa.
*/
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CompanyService } from '../../../../services/company.service';
import { CustomToastrService } from '../../../../services/custom-toastr.service';
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
  newPosition: any = { position_name: '', description: '', company_id: '', position_range: null };

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
      private toastrService: CustomToastrService,
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
          // Ordenar y filtrar, excluyendo puestos cuyo rango sea 0
          this.positions = Array.isArray(data)
            ? data.sort((a, b) => a.position_range - b.position_range)
                  .filter(position => position.position_range !== 0)
            : [];
        },
        error => {
          console.error('Error al cargar puestos', error);
        }
      );
    }
    

    async fetchShifts() {
      const companyId = this.companyService.selectedCompany.id;
      this.http.get<any[]>(`https://siinad.mx/php/get_shifts.php?company_id=${companyId}`)
        .subscribe(
          data => {
            // Mapear cada turno para convertir la cadena JSON de 'rest_days' en array
            this.shifts = Array.isArray(data) ? data.map(shift => {
              if (shift.rest_days) {
                try {
                  // Convertir la cadena JSON en un array real
                  shift.rest_days = JSON.parse(shift.rest_days);
                } catch (error) {
                  console.error('Error al convertir rest_days:', error);
                  shift.rest_days = [];
                }
              } else {
                shift.rest_days = [];
              }
              return shift;
            }) : [];
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
      this.newPosition = { position_name: '', description: '', position_range: null, company_id: this.companyService.selectedCompany.id };
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

    restrictInput(event: KeyboardEvent) {
      const inputElement = event.target as HTMLInputElement;
    
      // Solo permitir números, Backspace y Delete
      if (!/^[0-9]$/.test(event.key) && event.key !== 'Backspace' && event.key !== 'Delete') {
        event.preventDefault();
        return;
      }
    
      // Permite que el campo quede vacío sin forzar un valor inmediato
      setTimeout(() => {
        let value = inputElement.value.trim();
    
        // Si el campo está vacío, permitirlo
        if (value === '') {
          this.getCurrentPosition().position_range = null;
          return;
        }
    
        let numericValue = parseInt(value, 10);
    
        // Limitar el valor entre 1 y 50
        if (isNaN(numericValue) || numericValue < 1) {
          inputElement.value = '';
          this.getCurrentPosition().position_range = null;
        } else if (numericValue > 50) {
          inputElement.value = '50';
          this.getCurrentPosition().position_range = 50;
        }
      }, 10);
    }
    
    
    validatePositionRange() {
      if (this.getCurrentPosition().position_range > 50) {
        this.getCurrentPosition().position_range = 50;
      } else if (this.getCurrentPosition().position_range < 1) {
        this.getCurrentPosition().position_range = 1;
      }
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
            this.toastrService.showSuccess('¡Cambios guardados exitosamente!', 'Éxito');
           
          },
          error => {
            console.error('Error al guardar el departamento', error);
            this.toastrService.showError('Error al guardar los cambios. Inténtelo de nuevo.', 'Error');
           
          }
        );
      }
    }
    

    async savePositionConfig() {
      const current = this.getCurrentPosition();
    
      // Validar que el nombre y el rango estén definidos
      if (!current.position_name || current.position_range == null) {
        this.toastrService.showError('Debe ingresar el nombre y el rango del puesto.', 'Error');
        return;
      }
    
      // Validar que el rango esté entre 1 y 50
      if (current.position_range < 1 || current.position_range > 50) {
        this.toastrService.showError('El rango debe estar entre 1 y 50.', 'Error');
        return;
      }
    
      const positionData = { ...current, company_id: this.companyService.selectedCompany.id };
      const url = this.selectedPosition && this.selectedPosition.position_id
        ? 'https://siinad.mx/php/update_position.php'
        : 'https://siinad.mx/php/add_position.php';
    
      this.http.post(url, JSON.stringify(positionData), { headers: { 'Content-Type': 'application/json' } })
        .subscribe(
          () => {
            this.fetchPositions();
            this.isAddingPosition = false;
            this.selectedPosition = null;
            this.toastrService.showSuccess('¡Cambios guardados exitosamente!', 'Éxito');
          },
          error => {
            console.error('Error al guardar el puesto', error);
            this.toastrService.showError('Error al guardar los cambios. Inténtelo de nuevo.', 'Error');
          }
        );
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
            this.toastrService.showSuccess('¡Cambios guardados exitosamente!', 'Éxito');
           
          },
          error => {
            console.error('Error al guardar el turno', error);
            this.toastrService.showError('Error al guardar los cambios. Inténtelo de nuevo.', 'Error');
         
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
            this.toastrService.showSuccess('¡Departamento eliminado correctamente!', 'Éxito');
            
       
          },
          error => {
            console.error('Error al borrar departamento', error);
            this.toastrService.showError('No se pudo eliminar el departamento. Inténtelo de nuevo.', 'Error');
           
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
          this.toastrService.showSuccess('¡Puesto eliminado correctamente!', 'Éxito');
       
        },
        error => {
          console.error('Error al borrar puesto', error);
          this.toastrService.showError('No se pudo eliminar el puesto. Inténtelo de nuevo.', 'Error');
        
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
          this.toastrService.showSuccess('¡Turno eliminado correctamente!', 'Éxito');
      
        },
        error => {
          console.error('Error al borrar turno', error);
          this.toastrService.showSuccess('¡Turno eliminado correctamente!', 'Éxito');
      
        }
      );
    }
  }



}
