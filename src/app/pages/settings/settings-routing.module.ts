import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SettingsComponent } from './settings.component';

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
import { PermissionsSectionsComponent } from './permissions-sections/permissions-sections.component';
import { RegisterComponent } from './users/register/register.component';
import { MyUsersComponent } from './users/my-users/my-users.component';
import { MyProfileComponent } from './users/my-profile/my-profile.component';
import { CompaniesInfoComponent } from './site/companies-info/companies-info.component';
import { RegCompanyComponent } from './site/reg-company/reg-company.component';
import { PremiumAuthComponent } from './site/premium-auth/premium-auth.component';
import { CpAuthComponent } from './business-partner/cp-auth/cp-auth.component';
import { EditRolesComponent } from './business-partner/edit-roles/edit-roles.component';
import { authGuard } from '../../services/auth-guard';
import { BusinessPartnerRegisterComponent } from './business-partner/business-partner-register/business-partner-register.component';
import { PermissionsBusineesPartnerComponent } from './business-partner/permissions-businees-partner/permissions-businees-partner.component';
import { DepartmentRangesComponent } from './my-company/department-ranges/department-ranges.component';


const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      {
        path: 'my-company/upload-logo',
        component: UploadLogoComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Asignar logo de la empresa' } 
      },
      {
        path: 'my-company/code-company',
        component: CodeCompanyComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Código de la empresa' } 
      },
      {
        path: 'my-company/department-management',
        component: DepartmentManagementComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Departamentos' } 
      },
      {
        path: 'my-company/department-ranges',
        component: DepartmentRangesComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Departamentos' } 
      },
      {
        path: 'my-company/initial-periods',
        component: InitialPeriodsComponent,
        
      },
      {
        path: 'my-company/period-configuration',
        component: PeriodConfigurationComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Tipos de período' } 
      },
      {
        path: 'my-company/period-management',
        component: PeriodManagementComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Catálogo de períodos' } 
      },
      {
        path: 'my-company/company-tax-details',
        component: CompanyTaxDetailsComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Mi informacion fiscal' } 
      },
      {
        path: 'my-company/anual-review',
        component: AnualReviewComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Confirmar expendientes digitales' } 
      },

      {
        path: 'my-company/anual-upload',
        component: AnualUploadComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de mi empresa', subSection: 'Subir expendientes digitales' } 
      },

      //user permissions 
      {
        path: 'permissions-sections',
        component: PermissionsSectionsComponent,
      },

      // business partners settings
      {
        path: 'business-partner/cp-auth',
        component: CpAuthComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de socios comerciales', subSection: 'Autorizar socio comercial' } 
      },
      {
        path: 'business-partner/edit-roles',
        component: EditRolesComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de socios comerciales', subSection: 'Editar roles de los socios comerciales' } 
      },
      {
        path: 'business-partner/business-partner-register',
        component: BusinessPartnerRegisterComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de socios comerciales', subSection: 'Registrar socio comercial' } 
      },
      {
        path: 'business-partner/permissions-businees-partner',
        component: PermissionsBusineesPartnerComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de socios comerciales', subSection: 'Secciones visibles de los socios comerciales' }
      },


      //site routes
      {
        path: 'site/company-permissions-sections',
        component: CompanyPermissionsSectionsComponent,
      },
      {
        path: 'site/companies-info',
        component: CompaniesInfoComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de sitio', subSection: 'Empresas registradas en la página' }
      },
      {
        path: 'site/reg-company',
        component: RegCompanyComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de sitio', subSection: 'Registrar empresas' }
      },
      {
        path: 'site/premium-auth',
        component: PremiumAuthComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de sitio', subSection: 'Confirmar solicitudes premium' }
      },

      //user routes
      {
        path: 'users/register',
        component: RegisterComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de usuarios', subSection: 'Registrar usuarios' } 
      },
      {
        path: 'users/my-users',
        component: MyUsersComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de usuarios', subSection: 'Mis usuarios' } 
      },
      {
        path: 'users/my-profile',

        component: MyProfileComponent,
        canActivate: [authGuard],
        data: { section: 'Configuracion de usuarios', subSection: 'Editar mi usuario' } 
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
