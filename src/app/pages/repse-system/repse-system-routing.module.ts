import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { RepseSystemComponent } from "./repse-system.component";
import { RequirementsAssignmentComponent } from "./requirements-assignment/requirements-assignment.component";
import { authGuard } from "../../services/auth-guard";
import { DocumentUploadComponent } from "./document-upload/document-upload.component";
import { DocumentReviewComponent } from "./document-review/document-review.component";

const routes: Routes = [
  {
    path: "",
    component: RepseSystemComponent,
    children: [
      {
        path: "requirements-assignment",
        component: RequirementsAssignmentComponent,
        canActivate: [authGuard],
      },
      {
        path: "document-upload",
        component: DocumentUploadComponent,
        canActivate: [authGuard],
      },
      {
        path: "document-review",
        component: DocumentReviewComponent,
        canActivate: [authGuard],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RepseSystemRoutingModule {}
