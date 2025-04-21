/*
  En este codigo se manejan las rutas para la seccion de "Gestion de empleados"
*/
import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { employeeControlComponent } from "./employee-control.component";
import { RequestsEmployeesComponent } from "./requests-employees/requests-employees.component";
import { AddEmployeesComponent } from "./add-employees/add-employees.component";
import { EmployeeViewComponent } from "./employee-view/employee-view.component";
import { VacationsKardexComponent } from "./vacations-kardex/vacations-kardex.component";
import { EditEmployeeComponent } from "./edit-employee/edit-employee.component";
import { authGuard } from "../../services/auth-guard";

const routes: Routes = [
  {
    path: "",
    component: employeeControlComponent,
    children: [
      {
        path: "add-employees",
        component: AddEmployeesComponent,
        canActivate: [authGuard],
        data: {
          section: "Empleados",
          subSection: "Registrar solicitudes de empleados",
        }, // Sección requerida para acceder
      },
      {
        path: "edit-employees",
        component: RequestsEmployeesComponent,

        canActivate: [authGuard],
        data: {
          section: "Empleados",
          subSection: "Editar solicitudes de empleados",
        }, // Sección requerida para acceder
      },
      {
        path: "accept-requests",
        component: RequestsEmployeesComponent,
        canActivate: [authGuard],
        data: {
          section: "Empleados",
          subSection: "Aceptar solicitudes de empleados",
        }, // Sección requerida para acceder
      },
      {
        path: "process-employees",
        component: RequestsEmployeesComponent,
        canActivate: [authGuard],
        data: { section: "Empleados", subSection: "Procesar empleados" },
      },
      {
        path: "employee-view",
        component: EmployeeViewComponent,
        canActivate: [authGuard],
        data: { section: "Empleados", subSection: "Ver empleados registrados" }, // Sección requerida para acceder
      },
      {
        path: "vacations-kardex",

        component: VacationsKardexComponent,
        canActivate: [authGuard],
        data: { section: "Empleados", subSection: "Kardex de vacaciones" }, // Sección requerida para acceder
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EmployeeControlRoutingModule {}
