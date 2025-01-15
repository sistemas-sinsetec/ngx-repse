import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IncidentControlComponent } from './incident-control.component';
import { IncidentViewerComponent } from './incident-viewer/incident-viewer.component';
import { ConfirmDayComponent } from './confirm-day/confirm-day.component';
import { ConfirmWeekComponent } from './confirm-week/confirm-week.component';
import { ProcessWeeklyListsComponent } from './process-weekly-lists/process-weekly-lists.component';
import { ProcessedAttendanceComponent } from './processed-attendance/processed-attendance.component';

const routes: Routes = [
  {
    path: '',
    component: IncidentControlComponent,
    children: [
        {
          path: 'incident-viewer',
          component: IncidentViewerComponent
        },
        {
          path:'change-hours-modal',
          component: IncidentControlComponent
        },
        {
          path:'confirm-day',
          component: ConfirmDayComponent
        },
        {
          path:'confirm-week',
          component: ConfirmWeekComponent
        },
        {
          path:'process-weekly-lists',
          component: ProcessWeeklyListsComponent
        },
        {
          path:'processed-attendance',
          component: ProcessedAttendanceComponent
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