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
  NbTreeGridModule,
} from "@nebular/theme";

import { NbMomentDateModule } from "@nebular/moment";

import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { RequirementsAssignmentComponent } from "./my-company/requirements-assignment/requirements-assignment.component";
import { DocumentUploadComponent } from "./my-company/document-upload/document-upload.component";
import { DocumentReviewComponent } from "./my-company/document-review/document-review.component";
import { DocumentService } from "../../services/repse/document.service";
import { RejectionCommentComponent } from "./my-company/rejection-comment/rejection-comment.component";

@NgModule({
  declarations: [
    RepseSystemComponent,
    RequirementsAssignmentComponent,
    DocumentUploadComponent,
    DocumentReviewComponent,
    RejectionCommentComponent,
  ],
  imports: [
    CommonModule,
    RepseSystemRoutingModule,
    FormsModule,
    ReactiveFormsModule,

    NbAlertModule,
    NbCardModule,

    NbDatepickerModule,
    NbMomentDateModule,

    NbSelectModule,
    NbInputModule,
    NbButtonModule,
    NbCheckboxModule,
    NbDialogModule.forChild(),
    NbFormFieldModule,
    NbIconModule,
    NbTagModule,
    NbTreeGridModule,
  ],
  providers: [DocumentService],
})
export class RepseSystemModule {}
