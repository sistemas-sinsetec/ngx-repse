import { NgModule } from '@angular/core';
import { NbMenuModule, NbCardModule } from '@nebular/theme';
import { FormsModule } from '@angular/forms'; // Importa FormsModule
import { SettingsModule } from './settings/settings.module';
import { ProjectControlModule } from './project-control/project-control.module';
import { ThemeModule } from '../@theme/theme.module';
import { PagesComponent } from './pages.component';
import { DashboardModule } from './dashboard/dashboard.module';
import { ECommerceModule } from './e-commerce/e-commerce.module';
import { PagesRoutingModule } from './pages-routing.module';
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
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


  ],
})
export class PagesModule {
}
