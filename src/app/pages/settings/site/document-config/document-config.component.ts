import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { NbDialogService, NbDialogRef } from "@nebular/theme";
import { LoadingController } from "@ionic/angular";
import { CustomToastrService } from "../../../../services/custom-toastr.service";
import { environment } from "../../../../../environments/environment";
import { DocumentService } from "../../../../services/repse/document.service";

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
    private documentService: DocumentService,
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

    this.documentService.getDocumentTypes().subscribe({
      next: (data) => (this.documentTypes = data),
      error: () =>
        this.toastr.showError("Error al cargar los tipos de documento."),
      complete: () => loader.dismiss(),
    });
  }

  async onSubmit() {
    if (!this.documentForm.valid) return;

    const loader = await this.loadingCtrl.create({
      message: "Guardando tipo de documento...",
    });
    await loader.present();

    const doc = this.documentForm.value;

    this.documentService.saveOrUpdateDocumentType(doc).subscribe({
      next: (res) => {
        this.documentTypes.push({
          id: res.file_type_id!,
          name: doc.name,
          description: doc.description,
          active: doc.active,
        });
        this.documentForm.reset({ active: true });
        this.toastr.showSuccess("Tipo de documento creado correctamente.");
      },
      error: () =>
        this.toastr.showError("Error al crear el tipo de documento."),
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

    const { id, name, description, active } = this.editingDocument;

    this.documentService
      .saveOrUpdateDocumentType({ name, description, active }, id)
      .subscribe({
        next: () => {
          const idx = this.documentTypes.findIndex((d) => d.id === id);
          if (idx > -1) {
            this.documentTypes[idx] = { id, name, description, active };
          }
          this.toastr.showSuccess(
            "Tipo de documento actualizado correctamente."
          );
          this.cancelEdit();
        },
        error: () =>
          this.toastr.showError("Error al actualizar el tipo de documento."),
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

    this.documentService
      .deleteDocumentType(this.documentToDelete.id)
      .subscribe({
        next: () => {
          this.documentTypes = this.documentTypes.filter(
            (d) => d.id !== this.documentToDelete!.id
          );
          this.toastr.showSuccess("Tipo de documento eliminado correctamente.");
          this.cancelDelete();
        },
        error: () =>
          this.toastr.showError("Error al eliminar el tipo de documento."),
        complete: () => loader.dismiss(),
      });
  }

  cancelDelete() {
    this.documentToDelete = null;
    this.dialogRef.close();
  }
}
