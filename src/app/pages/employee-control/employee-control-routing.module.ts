import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { employeeControlComponent } from './employee-control.component';
import { EmployeeViewComponent } from './employee-view/employee-view.component';
import { EditEmployeeComponent } from './edit-employee/edit-employee.component';
import { RequestsEmployeesComponent } from './requests-employees/requests-employees.component';

const routes: Routes = [
  {
    path: '',
    component: employeeControlComponent,
    children: [
        {
          path: 'edit-employee',
          component: EditEmployeeComponent,
        },
        {
          path: 'requests-employees',
          component: RequestsEmployeesComponent,
        },
    ],
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmployeeControlRoutingModule {
}