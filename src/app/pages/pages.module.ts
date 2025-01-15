import { NgModule } from '@angular/core';
import { NbMenuModule, NbCardModule } from '@nebular/theme';
import { FormsModule } from '@angular/forms'; // Importa FormsModule
import { SettingsModule } from './settings/settings.module';
import { ThemeModule } from '../@theme/theme.module';
import { PagesComponent } from './pages.component';
import { DashboardModule } from './dashboard/dashboard.module';
import { ECommerceModule } from './e-commerce/e-commerce.module';
import { PagesRoutingModule } from './pages-routing.module';
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
import { ConfirmDayComponent } from './incident-control/confirm-day/confirm-day.component';
import { ConfirmWeekComponent } from './incident-control/confirm-week/confirm-week.component';
import { IncidentModalComponent } from './incident-control/incident-modal/incident-modal.component';
import { IncidentViewerComponent } from './incident-control/incident-viewer/incident-viewer.component';
import { ChangeHoursModalComponent } from './incident-control/change-hours-modal/change-hours-modal.component';
<<<<<<< HEAD
import { ProcessWeeklyListsComponent } from './incident-control/process-weekly-lists/process-weekly-lists.component';
=======
>>>>>>> 5524a08684ccdfa61eb5edae567262804b01fe37
import { ProcessedAttendanceComponent } from './incident-control/processed-attendance/processed-attendance.component';
@NgModule({
  imports: [
    PagesRoutingModule,
    ThemeModule,
    NbMenuModule,
    FormsModule, // Añade FormsModule aquí
    DashboardModule,
    ECommerceModule,
    MiscellaneousModule,
    SettingsModule,
    NbCardModule
  ],
  declarations: [
    PagesComponent,
    ConfirmDayComponent,
    ConfirmWeekComponent,
    IncidentModalComponent,
    IncidentViewerComponent,
    ChangeHoursModalComponent,
<<<<<<< HEAD
    ProcessWeeklyListsComponent,
=======
>>>>>>> 5524a08684ccdfa61eb5edae567262804b01fe37
    ProcessedAttendanceComponent,

  ],
})
export class PagesModule {
}
