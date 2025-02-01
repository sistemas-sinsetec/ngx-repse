import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { employeeControlComponent } from './employee-control.component';
import { RequestsEmployeesComponent } from './requests-employees/requests-employees.component';
import { AddEmployeesComponent } from './add-employees/add-employees.component';
import { EmployeeViewComponent } from './employee-view/employee-view.component';
import { VacationsKardexComponent } from './vacations-kardex/vacations-kardex.component';

const routes: Routes = [
  {
    path: '',
    component: employeeControlComponent,
    children: [
      {
        path: 'add-employees',
        component: AddEmployeesComponent
      },
      {
        path: 'requests-employees',
        component: RequestsEmployeesComponent
      },
      {
        path: 'employee-view',
        component: EmployeeViewComponent
      },
      {
        path: 'vacations-kardex',
        component: VacationsKardexComponent
      }
    ],
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmployeeControlRoutingModule {
}