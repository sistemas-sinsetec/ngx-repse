import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { NbDialogService, NbDialogRef } from "@nebular/theme";
import { HttpClient, HttpParams } from "@angular/common/http";
import { LoadingController } from "@ionic/angular";
import { CustomToastrService } from "../../../../services/custom-toastr.service";
import { environment } from "../../../../../environments/environment";

interface DocumentType {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

@Component({
  selector: "ngx-document-config",
  templateUrl: "./document-config.component.html",
  styleUrls: ["./document-config.component.scss"],
})
export class DocumentConfigComponent implements OnInit {
  @ViewChild("editModal") editModalTemplate: TemplateRef<any>;
  @ViewChild("deleteModal") deleteModalTemplate: TemplateRef<any>;

  documentForm: FormGroup;
  documentTypes: DocumentType[] = [];
  editingDocument: DocumentType | null = null;
  documentToDelete: DocumentType | null = null;
  private dialogRef: NbDialogRef<any>;

  private baseUrl = `${environment.apiBaseUrl}/file_types.php`;

  constructor(
    private fb: FormBuilder,
    private dialogService: NbDialogService,
    private http: HttpClient,
    private loadingCtrl: LoadingController,
    private toastr: CustomToastrService
  ) {
    this.documentForm = this.fb.group({
      name: ["", Validators.required],
      description: ["", Validators.required],
      active: [true],
    });
  }

  ngOnInit(): void {
    this.loadAll();
  }

  private async loadAll() {
    const loader = await this.loadingCtrl.create({
      message: "Cargando tipos de documento...",
    });
    await loader.present();

    this.http.get<any[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.documentTypes = data.map((item) => ({
          id: item.file_type_id,
          name: item.name,
          description: item.description,
          active: item.is_active === 1,
        }));
      },
      error: (err) => {
        console.error("Error loading document types", err);
        this.toastr.showError("Error al cargar los tipos de documento.");
      },
      complete: () => loader.dismiss(),
    });
  }

  async onSubmit() {
    if (!this.documentForm.valid) return;

    const loader = await this.loadingCtrl.create({
      message: "Guardando tipo de documento...",
    });
    await loader.present();

    const newDoc = {
      name: this.documentForm.value.name,
      description: this.documentForm.value.description,
      is_active: this.documentForm.value.active ? 1 : 0,
    };

    this.http
      .post<{ success: boolean; file_type_id: number }>(this.baseUrl, newDoc)
      .subscribe({
        next: (res) => {
          this.documentTypes.push({
            id: res.file_type_id,
            name: newDoc.name,
            description: newDoc.description,
            active: !!newDoc.is_active,
          });
          this.documentForm.reset({ active: true });
          this.toastr.showSuccess("Tipo de documento creado correctamente.");
        },
        error: (err) => {
          console.error("Create error", err);
          this.toastr.showError("Error al crear el tipo de documento.");
        },
        complete: () => loader.dismiss(),
      });
  }

  onEdit(doc: DocumentType) {
    this.editingDocument = { ...doc };
    this.dialogRef = this.dialogService.open(this.editModalTemplate, {
      context: this.editingDocument,
    });
  }

  async confirmEdit() {
    if (!this.editingDocument) return;

    const loader = await this.loadingCtrl.create({
      message: "Actualizando tipo de documento...",
    });
    await loader.present();

    const payload = {
      file_type_id: this.editingDocument.id,
      name: this.editingDocument.name,
      description: this.editingDocument.description,
      is_active: this.editingDocument.active ? 1 : 0,
    };

    this.http
      .put<{ success: boolean; affected_rows: number }>(this.baseUrl, payload)
      .subscribe({
        next: () => {
          const idx = this.documentTypes.findIndex(
            (d) => d.id === payload.file_type_id
          );
          if (idx > -1) {
            this.documentTypes[idx] = {
              id: payload.file_type_id,
              name: payload.name,
              description: payload.description,
              active: !!payload.is_active,
            };
          }
          this.toastr.showSuccess(
            "Tipo de documento actualizado correctamente."
          );
          this.cancelEdit();
        },
        error: (err) => {
          console.error("Update error", err);
          this.toastr.showError("Error al actualizar el tipo de documento.");
        },
        complete: () => loader.dismiss(),
      });
  }

  cancelEdit() {
    this.editingDocument = null;
    this.dialogRef.close();
  }

  onDelete(doc: DocumentType) {
    this.documentToDelete = doc;
    this.dialogRef = this.dialogService.open(this.deleteModalTemplate, {
      context: this.documentToDelete,
    });
  }

  async confirmDelete() {
    if (!this.documentToDelete) return;

    const loader = await this.loadingCtrl.create({
      message: "Eliminando tipo de documento...",
    });
    await loader.present();

    const params = new HttpParams().set(
      "id",
      this.documentToDelete.id.toString()
    );

    this.http
      .delete<{ success: boolean; affected_rows: number }>(this.baseUrl, {
        params,
      })
      .subscribe({
        next: () => {
          this.documentTypes = this.documentTypes.filter(
            (d) => d.id !== this.documentToDelete!.id
          );
          this.toastr.showSuccess("Tipo de documento eliminado correctamente.");
          this.cancelDelete();
        },
        error: (err) => {
          console.error("Delete error", err);
          this.toastr.showError("Error al eliminar el tipo de documento.");
        },
        complete: () => loader.dismiss(),
      });
  }

  cancelDelete() {
    this.documentToDelete = null;
    this.dialogRef.close();
  }
}
