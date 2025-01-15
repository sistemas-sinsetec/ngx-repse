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
import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Ng2SmartTableModule } from 'ng2-smart-table';
import { UploadLogoComponent } from './my-company/upload-logo/upload-logo.component';
import { CodeCompanyComponent } from './my-company/code-company/code-company.component';
import { DepartmentManagementComponent } from './my-company/department-management/department-management.component';
import { InitialPeriodsComponent } from './my-company/initial-periods/initial-periods.component';
import { CalendarKitFullCalendarShowcaseComponent } from '../extra-components/calendar-kit/calendar-kit.component';
import { CalendarKitMonthCellComponent } from '../extra-components/calendar-kit/month-cell/month-cell.component';
import { PeriodConfigurationComponent } from './my-company/period-configuration/period-configuration.component';
import { PeriodManagementComponent } from './my-company/period-management/period-management.component';
import { CompanyTaxDetailsComponent } from './my-company/company-tax-details/company-tax-details.component';
import { CompanyTaxDetailsModalComponent } from './my-company/company-tax-details-modal/company-tax-details-modal.component';
import { AnualReviewComponent } from './my-company/anual-review/anual-review.component';
import { AnualUploadComponent } from './my-company/anual-upload/anual-upload.component';
import { ReviewInfoModalComponent } from './my-company/review-info-modal/review-info-modal.component';
import { RejectionDialogComponent } from './my-company/rejection-dialog/rejection-dialog.component';
import { PermissionsSectionsComponent } from './permissions-sections/permissions-sections.component';
import { ActaConstitutivaModalComponent } from './my-company/acta-constitutiva-modal/acta-constitutiva-modal.component';
import { Afil01ModalComponent } from './my-company/afil01-modal/afil01-modal.component';
import { AutorizacionStpsModalComponent } from './my-company/autorizacion-stps-modal/autorizacion-stps-modal.component';
import { CompanyPermissionsSectionsComponent } from './site/company-permissions-sections/company-permissions-sections.component';
import { PremiumAuthComponent } from './site/premium-auth/premium-auth.component';

import { RegistroModalComponent } from './my-company/registro-modal/registro-modal.component';
import { CompaniesInfoComponent } from './site/companies-info/companies-info.component';
import { EditCompanyModalComponent } from './site/edit-company-modal/edit-company-modal.component';
import { RegisterComponent } from './users/register/register.component';
import { AgainDialogComponent } from './users/again-dialog/again-dialog.component';
import { MyUsersComponent } from './users/my-users/my-users.component';
import { MyProfileComponent } from './users/my-profile/my-profile.component';
import { RegCompanyComponent } from './site/reg-company/reg-company.component';
import { CpAuthDialogComponent } from './site/cp-auth-dialog/cp-auth-dialog.component';
import { CpAuthDeleteDialogComponent } from './site/cp-auth-delete-dialog/cp-auth-delete-dialog.component';
import { ProcessWeeklyListsComponent } from '../incident-control/process-weekly-lists/process-weekly-lists.component';
@NgModule({
  imports: [
    ThemeModule,
    NbCardModule,
    NbButtonModule,
    NbIconModule, // Añadimos el módulo de iconos aquí
    SettingsRoutingModule,
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
    NbUserModule

  ],
  declarations: [
    SettingsComponent,
    UploadLogoComponent,
    CodeCompanyComponent,
    DepartmentManagementComponent,
    InitialPeriodsComponent,
    PeriodConfigurationComponent,
    PeriodManagementComponent,
    CompanyTaxDetailsComponent,
    CompanyTaxDetailsModalComponent,
    AnualReviewComponent,
    AnualUploadComponent,
    ReviewInfoModalComponent,
    RejectionDialogComponent,
    PermissionsSectionsComponent,
    ActaConstitutivaModalComponent,
    Afil01ModalComponent,
    AutorizacionStpsModalComponent,
    CompanyPermissionsSectionsComponent,
    PremiumAuthComponent,

    CompaniesInfoComponent,
    EditCompanyModalComponent,
   
    RegistroModalComponent,
    RegisterComponent,
    AgainDialogComponent,
    MyUsersComponent,
    MyProfileComponent,
    RegCompanyComponent,
    CpAuthDialogComponent,
    CpAuthDeleteDialogComponent,
    ProcessWeeklyListsComponent,
  ],
})
export class SettingsModule { }
