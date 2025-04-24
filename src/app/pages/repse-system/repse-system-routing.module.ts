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
        data: {
          section: "Sistema REPSE",
          subSection: "Asignacion de requisitos",
        }, // Sección requerida para acceder
      },
      {
        path: "document-upload",
        component: DocumentUploadComponent,
        canActivate: [authGuard],
        data: {
          section: "Sistema REPSE",
          subSection: "Carga de documentos",
        }, // Sección requerida para acceder
      },
      {
        path: "document-review",
        component: DocumentReviewComponent,
        canActivate: [authGuard],
        data: {
          section: "Sistema REPSE",
          subSection: "Revision de documentos",
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
