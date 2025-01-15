import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
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

import { IncidentControlRoutingModule } from './incident-control-routing.module';
import { IncidentControlComponent } from './incident-control.component';




@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ]
})
export class IncidentControlModule { }
