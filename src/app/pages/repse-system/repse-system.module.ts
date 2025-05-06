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
  NbTabsetModule,
  NbSpinnerModule,
} from "@nebular/theme";

import { NbMomentDateModule } from "@nebular/moment";

import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { RequirementsAssignmentComponent } from "./my-company/requirements-assignment/requirements-assignment.component";
import { DocumentUploadComponent } from "./my-company/document-upload/document-upload.component";
import { DocumentReviewComponent } from "./my-company/document-review/document-review.component";
import { DocumentService } from "../../services/repse/document.service";
import { RejectionCommentComponent } from "./my-company/rejection-comment/rejection-comment.component";
import { RequirementAssignmentComponent } from "./bussiness-partners/requirement-assignment/requirement-assignment.component";
import { CompaniesDocumentsViewComponent } from "./bussiness-partners/companies-documents-view/companies-documents-view.component";
import { DocumentCatalogComponent } from "./my-company/document-catalog/document-catalog.component";

@NgModule({
  declarations: [
    RepseSystemComponent,
    RequirementsAssignmentComponent,
    DocumentUploadComponent,
    DocumentReviewComponent,
    RejectionCommentComponent,
    RequirementAssignmentComponent,
    CompaniesDocumentsViewComponent,
    DocumentCatalogComponent,
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
    NbTabsetModule,
    NbTagModule,
    NbTreeGridModule,
    NbSpinnerModule,
  ],
  providers: [DocumentService],
})
export class RepseSystemModule {}
