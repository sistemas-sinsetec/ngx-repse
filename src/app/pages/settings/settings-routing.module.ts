import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import {SettingsComponent } from './settings.component';

import { UploadLogoComponent } from './my-company/upload-logo/upload-logo.component';
import { CodeCompanyComponent } from './my-company/code-company/code-company.component';
import { DepartmentManagementComponent } from './my-company/department-management/department-management.component';
import { InitialPeriodsComponent } from './my-company/initial-periods/initial-periods.component';
import { PeriodConfigurationComponent } from './my-company/period-configuration/period-configuration.component';
import { PeriodManagementComponent } from './my-company/period-management/period-management.component';
import { CompanyTaxDetailsComponent } from './my-company/company-tax-details/company-tax-details.component';
import { AnualUploadComponent } from './my-company/anual-upload/anual-upload.component';
import { AnualReviewComponent } from './my-company/anual-review/anual-review.component';
import { CompanyPermissionsSectionsComponent } from './site/company-permissions-sections/company-permissions-sections.component';
const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      {
        path: 'my-company/upload-logo',
        component: UploadLogoComponent,
      },
      {
        path: 'my-company/code-company',
        component: CodeCompanyComponent,
      },
      {
        path: 'my-company/department-management',
        component: DepartmentManagementComponent,
      },
      {
        path: 'my-company/initial-periods',
        component: InitialPeriodsComponent,
      },
      {
        path: 'my-company/period-configuration',
        component: PeriodConfigurationComponent,
      },
      {
        path: 'my-company/period-management',
        component: PeriodManagementComponent
      },
      {
        path: 'my-company/company-tax-details',
        component: CompanyTaxDetailsComponent
      },
      {
        path: 'my-company/anual-review',
        component: AnualReviewComponent
      },
      
      {
        path: 'my-company/anual-upload',
        component: AnualUploadComponent
      },



      //site routes
      {
        path: 'site/company-permissions-sections',
        component: CompanyPermissionsSectionsComponent
      }
      
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SettingsRoutingModule {
}
