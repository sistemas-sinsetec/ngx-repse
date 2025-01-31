import { NgModule } from '@angular/core';
import {
  NbButtonModule,
  NbCardModule,
  NbIconModule,
  NbAlertModule,
  NbToastrModule,
  NbListModule,
  NbCheckboxModule,
  NbCalendarKitModule,
  NbCalendarModule,
  NbCalendarRangeModule,
  NbSelectModule,
  NbOptionModule,
  NbDatepickerModule,
  NbBadgeModule, // Importa NbBadgeModule aquí
  NbLayoutModule, // Importa NbLayoutModule si usas nb-layout
  NbFormFieldModule,
  NbAccordionModule,
  NbInputModule,
  NbTagModule,
  NbUserModule,
  NbLayoutComponent,
  NbSelectLabelComponent,
  NbSidebarComponent,
  NbSidebarModule,
  NbTreeGridComponent,
  NbTreeGridModule,
} from '@nebular/theme';
import { ThemeModule } from '../../@theme/theme.module';

import { CommonModule } from '@angular/common';
import { employeeControlComponent } from './employee-control.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { EmployeeControlRoutingModule } from './employee-control-routing.module';

import { IonicModule } from '@ionic/angular';
import { RequestsEmployeesComponent } from './requests-employees/requests-employees.component';
import { EmployeeViewComponent } from './employee-view/employee-view.component';
import { EmployeeDetailsComponent } from './employee-details/employee-details.component';
import { EditEmployeeComponent } from './edit-employee/edit-employee.component';
import { AddEmployeesComponent } from './add-employees/add-employees.component';
import { VacationsKardexComponent } from './vacations-kardex/vacations-kardex.component';


@NgModule({
  declarations: [
    employeeControlComponent,
   RequestsEmployeesComponent,
    EmployeeViewComponent,
    EmployeeDetailsComponent,
    EditEmployeeComponent,
    AddEmployeesComponent,
    VacationsKardexComponent

   

  ],
  imports: [
    NbTreeGridModule,
    CommonModule,
    ThemeModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule, // Añadimos el módulo de iconos aquí
    EmployeeControlRoutingModule,
    NbAlertModule, // Importamos NbAlertModule
    NbToastrModule, // Para notificaciones
    NbListModule,
    NbCheckboxModule,
    FormsModule,
    NbCalendarModule,
    NbCalendarKitModule,
    NbCalendarRangeModule,
    NbDatepickerModule.forRoot(),
    NbOptionModule, // Aquí añadimos el Datepicker
    Ng2SmartTableModule,
    NbSelectModule,
    NbBadgeModule, // Añade NbBadgeModule aquí
    NbLayoutModule, // Añade NbLayoutModule si usas nb-layout
    NbFormFieldModule,
    NbAccordionModule,
    NbInputModule,
    NbTagModule,
    NbUserModule,
    IonicModule,
    NbSidebarModule,

  ]
})
export class EmployeeControlModule { }