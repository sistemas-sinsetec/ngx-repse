import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { ProjectControlRoutingModule } from './project-control-routing.module';
import { ProjectControlComponent } from './project-control.component';
import { AssignProjectsComponent } from './assign-projects/assign-projects.component';
import { AssignmentSummaryComponent } from './assignment-summary/assignment-summary.component';
import { FormsModule } from '@angular/forms';
import { DeployProjectsComponent } from './deploy-projects/deploy-projects.component';
import { Ng2SmartTableModule } from 'ng2-smart-table'; // Importa Ng2SmartTableModule

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
  NbUserModule
} from '@nebular/theme';

@NgModule({
  declarations: [
    ProjectControlComponent,
    AssignProjectsComponent,
    AssignmentSummaryComponent,
    DeployProjectsComponent,

  ],
  imports: [
        NbCardModule,
        NbButtonModule,
        NbIconModule, // Añadimos el módulo de iconos aquí
        NbAlertModule, // Importamos NbAlertModule
        NbToastrModule, // Para notificaciones
        NbListModule,
        NbCheckboxModule,
        NbCalendarModule,
        NbCalendarKitModule,
        NbCalendarRangeModule,
        NbDatepickerModule.forRoot(),
        NbOptionModule, // Aquí añadimos el Datepicker
        NbSelectModule,
        NbBadgeModule, // Añade NbBadgeModule aquí
        NbLayoutModule, // Añade NbLayoutModule si usas nb-layout
        NbFormFieldModule,
        NbAccordionModule,
        NbInputModule,
        NbTagModule,
        NbUserModule,
        ProjectControlRoutingModule,
        FormsModule,
        RouterOutlet,
        CommonModule,
        Ng2SmartTableModule, // Añade Ng2SmartTableModule aquí
        
  ]
})
export class ProjectControlModule { }
