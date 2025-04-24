import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { RepseSystemRoutingModule } from "./repse-system-routing.module";
import { RepseSystemComponent } from "./repse-system.component";

import {
  NbCardModule,
  NbSelectModule,
  NbInputModule,
  NbButtonModule,
  NbCheckboxModule,
  NbDialogModule,
  NbFormFieldModule,
  NbIconModule,
  NbDatepickerModule,
  NbTagModule,
  NbAlertModule,
} from "@nebular/theme";

// Importa el adaptador aquí, en el mismo módulo donde usas Datepicker:
import { NbMomentDateModule } from "@nebular/moment";

import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { RequirementsAssignmentComponent } from "./requirements-assignment/requirements-assignment.component";
import { DocumentUploadComponent } from "./document-upload/document-upload.component";
import { DocumentReviewComponent } from "./document-review/document-review.component";
import { DocumentService } from "../../services/repse/document.service";

@NgModule({
  declarations: [
    RepseSystemComponent,
    RequirementsAssignmentComponent,
    DocumentUploadComponent,
    DocumentReviewComponent,
  ],
  imports: [
    CommonModule,
    RepseSystemRoutingModule,
    FormsModule,
    ReactiveFormsModule,

    NbAlertModule,
    NbCardModule,

    // En módulos hijos NO uses .forRoot()
    NbDatepickerModule,
    NbMomentDateModule, // ← aquí el adapter

    NbSelectModule,
    NbInputModule,
    NbButtonModule,
    NbCheckboxModule,
    NbDialogModule.forChild(),
    NbFormFieldModule,
    NbIconModule,
    NbTagModule,
  ],
  providers: [DocumentService],
})
export class RepseSystemModule {}
