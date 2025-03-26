import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; // Importa FormsModule
import { CoreModule } from './@core/core.module';
import { ThemeModule } from './@theme/theme.module';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { IonicModule } from '@ionic/angular';

import {
  NbChatModule,
  NbActionsModule,
  NbDatepickerModule,
  NbDialogModule,
  NbMenuModule,
  NbSidebarModule,
  NbToastrModule,
  NbWindowModule,
  NbInputModule,
  NbButtonModule,
  NbAlertModule,
  NbCheckboxModule,
  NbCardModule,       // <-- Importa NbCardModule para usar <nb-card>
  NbSelectModule,     // <-- Importa NbSelectModule para usar <nb-select>
  NbIconModule,  

       // <-- Importa NbIconModule si usas <nb-icon>
} from '@nebular/theme';

import { NbAuthModule } from '@nebular/auth'; 
import { CustomLoginComponent } from './custom-login/custom-login.component';
import { AuthService } from './services/auth.service';
import { SelectCompanyPeriodDialogComponent } from './select-company-period-dialog/select-company-period-dialog.component';

@NgModule({
  declarations: [

    AppComponent,
    CustomLoginComponent,
    SelectCompanyPeriodDialogComponent,
   ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule, // Para manejar [(ngModel)]
    NbSidebarModule.forRoot(),
    NbMenuModule.forRoot(),
    NbDatepickerModule.forRoot(),
    NbDialogModule.forRoot(),
    NbWindowModule.forRoot(),
    NbToastrModule.forRoot(),
    IonicModule.forRoot(),
    NbChatModule.forRoot({
      messageGoogleMapKey: 'AIzaSyA_wNuCzia92MAmdLRzmqitRGvCF7wCZPY',
    }),

    // Módulos Nebular para componentes
    NbInputModule,       
    NbButtonModule,      
    NbAlertModule,       
    NbCheckboxModule,
    NbCardModule,        // <-- Asegúrate de estar importando NbCardModule
    NbSelectModule,      // <-- Asegúrate de estar importando NbSelectModule
    NbIconModule,   // <-- Asegúrate de estar importando NbIconModule si usas <nb-icon>
    NbActionsModule,     
    NbAuthModule.forRoot({
      strategies: [],
      forms: {
        login: {
          redirectDelay: 500,
          strategy: 'email',
          rememberMe: true,
          showMessages: {
            success: true,
            error: true,
          },
        },
      },
    }),
    CoreModule.forRoot(),
    ThemeModule.forRoot(),
  ],
  providers: [
    AuthService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
