import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProjectControlRoutingModule } from './project-control-routing.module';
import { ProjectControlComponent } from './project-control.component';
import { AssignProjectsComponent } from './assign-projects/assign-projects.component';
import { AssignmentSummaryComponent } from './assignment-summary/assignment-summary.component';


@NgModule({
  declarations: [
    ProjectControlComponent,
    AssignProjectsComponent,
    AssignmentSummaryComponent
  ],
  imports: [
    CommonModule,
    ProjectControlRoutingModule
  ]
})
export class ProjectControlModule { }
