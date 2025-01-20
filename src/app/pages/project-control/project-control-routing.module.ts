import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProjectControlComponent } from './project-control.component';

const routes: Routes = [{ path: '', component: ProjectControlComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProjectControlRoutingModule { }
