import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectControlComponent } from './project-control.component';
import { ProjectControlModule } from './project-control.module';
import { AssignProjectsComponent } from './assign-projects/assign-projects.component';
import { DeployProjectsComponent } from './deploy-projects/deploy-projects.component';

const routes: Routes = [
  {
    path: '',
    component: ProjectControlComponent,
    children: [
      {
        path: 'assign-projects',
        component: AssignProjectsComponent,
      },
      {
        path: 'deploy-projects',
        component: DeployProjectsComponent
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectControlRoutingModule {}
