import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { employeeControlComponent } from './employee-control.component';
import { EmployeeViewComponent } from './employee-view/employee-view.component';

const routes: Routes = [
  {
    path: '',
    component: employeeControlComponent,
    children: [
        {
          path: 'employee-view',
          component: EmployeeViewComponent,
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