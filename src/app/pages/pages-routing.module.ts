/*
  En este codigo se manejan las diferentes rutas de la pagina principal
  *Ver el servicio "Auth-guard"* el cual maneja los permisos
*/
import { RouterModule, Routes } from "@angular/router";
import { NgModule } from "@angular/core";
import { PagesComponent } from "./pages.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { NotFoundComponent } from "./miscellaneous/not-found/not-found.component";
import { authGuard } from "../services/auth-guard";
const routes: Routes = [
  {
    path: "",
    component: PagesComponent,
    children: [
      {
        path: "dashboard",
        component: DashboardComponent,
      },
      {
        path: "employee-control",
        loadChildren: () =>
          import("./employee-control/employee-control.module").then(
            (m) => m.EmployeeControlModule
          ),
      },
      {
        path: "miscellaneous",
        loadChildren: () =>
          import("./miscellaneous/miscellaneous.module").then(
            (m) => m.MiscellaneousModule
          ),
      },
      {
        path: "settings",
        loadChildren: () =>
          import("./settings/settings.module").then((m) => m.SettingsModule),
      },
      {
        path: "incident-control",
        loadChildren: () =>
          import("./incident-control/incident-control.module").then(
            (m) => m.IncidentControlModule
          ),
      },
      {
        path: "project-control",
        loadChildren: () =>
          import("./project-control/project-control.module").then(
            (m) => m.ProjectControlModule
          ),
      },
      {
        path: "employee-control",
        loadChildren: () =>
          import("./employee-control/employee-control.module").then(
            (m) => m.EmployeeControlModule
          ),
      },
      {
        path: "",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
      {
        path: "**",
        component: NotFoundComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
