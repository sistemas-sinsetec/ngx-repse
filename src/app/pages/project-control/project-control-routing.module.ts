import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ProjectControlComponent } from "./project-control.component";
import { ProjectControlModule } from "./project-control.module";
import { AssignProjectsComponent } from "./assign-projects/assign-projects.component";
import { DeployProjectsComponent } from "./deploy-projects/deploy-projects.component";
import { authGuard } from "../../services/auth-guard";

const routes: Routes = [
  {
    path: "",
    component: ProjectControlComponent,
    children: [
      {
        path: "assign-projects",
        component: AssignProjectsComponent,
        canActivate: [authGuard],
        data: {
          section: "Control de proyectos",
          subSection: "Asignacion de proyectos",
        }, // Sección requerida para acceder
      },
      {
        path: "deploy-projects",
        component: DeployProjectsComponent,
        canActivate: [authGuard],
        data: {
          section: "Control de proyectos",
          subSection: "Vizualizar proyectos",
        }, // Sección requerida para acceder
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectControlRoutingModule {}
