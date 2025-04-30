import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { RepseSystemComponent } from "./repse-system.component";
import { authGuard } from "../../services/auth-guard";
import { DocumentReviewComponent } from "./my-company/document-review/document-review.component";
import { RequirementsAssignmentComponent } from "./my-company/requirements-assignment/requirements-assignment.component";
import { DocumentUploadComponent } from "./my-company/document-upload/document-upload.component";
import { RequirementAssignmentComponent } from "./bussiness-partners/requirement-assignment/requirement-assignment.component";

const routes: Routes = [
  {
    path: "",
    component: RepseSystemComponent,
    children: [
      {
        path: "my-company/requirements-assignment",
        component: RequirementsAssignmentComponent,
        canActivate: [authGuard],
        data: {
          section: "Sistema REPSE",
          subSection: "Asignacion de requisitos de empresa",
        }, // Sección requerida para acceder
      },
      {
        path: "my-company/document-upload",
        component: DocumentUploadComponent,
        canActivate: [authGuard],
        data: {
          section: "Sistema REPSE",
          subSection: "Carga de documentos de empresa",
        }, // Sección requerida para acceder
      },
      {
        path: "my-company/document-review",
        component: DocumentReviewComponent,
        canActivate: [authGuard],
        data: {
          section: "Sistema REPSE",
          subSection: "Revision de documentos",
        }, // Sección requerida para acceder
      },
      {
        path: "bussiness-partners/requirements-assignment",
        component: RequirementAssignmentComponent,
        canActivate: [authGuard],
        data: {
          section: "Sistema REPSE",
          subSection: "Asignacion de requisitos de socios comerciales",
        }, // Sección requerida para acceder
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RepseSystemRoutingModule {}
