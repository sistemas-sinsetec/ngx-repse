import { NgModule } from '@angular/core';
import {
  NbButtonModule,
  NbCardModule,
  NbIconModule,
  NbAlertModule,
  NbToastrModule,
  NbListModule,
  NbCheckboxModule,
  NbCalendarKitModule,
  NbCalendarModule,
  NbCalendarRangeModule,
  NbSelectModule,
  NbOptionModule,
  NbDatepickerModule,
  NbBadgeModule, // Importa NbBadgeModule aquí
  NbLayoutModule, // Importa NbLayoutModule si usas nb-layout
  NbFormFieldModule,
  NbAccordionModule,
  NbInputModule,
  NbTagModule,
  NbUserModule
} from '@nebular/theme';
import { ThemeModule } from '../../@theme/theme.module';
import { IncidentControlRoutingModule } from './incident-control-routing.module';
import { CommonModule } from '@angular/common';
import { IncidentControlComponent } from './incident-control.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { IncidentViewerComponent } from './incident-viewer/incident-viewer.component';
import { ConfirmDayComponent } from './confirm-day/confirm-day.component';
import { ProcessedAttendanceComponent } from './processed-attendance/processed-attendance.component';
import { ChangeHoursModalComponent } from './change-hours-modal/change-hours-modal.component';
import { IncidentModalComponent } from './incident-modal/incident-modal.component';
import { ConfirmWeekComponent } from './confirm-week/confirm-week.component';
import { ProcessWeeklyListsComponent } from './process-weekly-lists/process-weekly-lists.component';
import { IonicModule } from '@ionic/angular';
import { ProcessedListDialogComponent } from './processed-list-dialog/processed-list-dialog.component';


@NgModule({
  declarations: [
    IncidentControlComponent,
    IncidentViewerComponent,
    ConfirmDayComponent,
    ProcessedAttendanceComponent,
    ChangeHoursModalComponent,
    IncidentModalComponent,
    ConfirmWeekComponent,
    ProcessWeeklyListsComponent,
    ProcessedListDialogComponent,

  ],
  imports: [
    CommonModule,
    ThemeModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule, // Añadimos el módulo de iconos aquí
    IncidentControlRoutingModule,
    NbAlertModule, // Importamos NbAlertModule
    NbToastrModule, // Para notificaciones
    NbListModule,
    NbCheckboxModule,
    FormsModule,
    NbCalendarModule,
    NbCalendarKitModule,
    NbCalendarRangeModule,
    NbDatepickerModule.forRoot(),
    NbOptionModule, // Aquí añadimos el Datepicker
    Ng2SmartTableModule,
    NbSelectModule,
    NbBadgeModule, // Añade NbBadgeModule aquí
    NbLayoutModule, // Añade NbLayoutModule si usas nb-layout
    NbFormFieldModule,
    NbAccordionModule,
    NbInputModule,
    NbTagModule,
    NbUserModule,
    IonicModule

  ]
})
export class IncidentControlModule { }