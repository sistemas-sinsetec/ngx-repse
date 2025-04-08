/*
  En este codigo se manejan las rutas para la seccion de control de incidencias.
  Se usa canActivate para manejar los permisos
*/
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IncidentControlComponent } from './incident-control.component';
import { IncidentViewerComponent } from './incident-viewer/incident-viewer.component';
import { ConfirmDayComponent } from './confirm-day/confirm-day.component';
import { ConfirmWeekComponent } from './confirm-week/confirm-week.component';
import { ProcessWeeklyListsComponent } from './process-weekly-lists/process-weekly-lists.component';
import { ProcessedAttendanceComponent } from './processed-attendance/processed-attendance.component';
import { authGuard } from '../../services/auth-guard';

const routes: Routes = [
  {
    path: '',
    component: IncidentControlComponent,
    children: [
        {
          path: 'incident-viewer',
          component: IncidentViewerComponent,
          canActivate: [authGuard],
          data: { section: 'Incidencias', subSection: 'Control de incidencias' } // Sección requerida para acceder
        },
        {
          path:'change-hours-modal',
          component: IncidentControlComponent
        },
        {
          path:'confirm-day',
          component: ConfirmDayComponent,
          canActivate: [authGuard],
          data: { section: 'Incidencias', subSection: 'Confirmar dia' } // Sección requerida para acceder
        },
        {
          path:'confirm-week',
          component: ConfirmWeekComponent,
          canActivate: [authGuard],
          data: { section: 'Incidencias', subSection: 'Confirmar semana' } // Sección requerida para acceder
        },
        {
          path:'process-weekly-lists',
          component: ProcessWeeklyListsComponent,
          canActivate: [authGuard],
          data: { section: 'Incidencias', subSection: 'Semanas procesadas' } // Sección requerida para acceder
        },
        {
          path:'processed-attendance',
          component: ProcessedAttendanceComponent,
          //canActivate: [authGuard],
          //data: { section: 'Incidencias', subSection: 'Lista de asistencias' } // Sección requerida para acceder
        },


    ],
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class IncidentControlRoutingModule {
}