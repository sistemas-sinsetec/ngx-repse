import { Component, OnInit, TemplateRef, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { NbDialogService, NbDialogRef } from "@nebular/theme";

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

  constructor(private fb: FormBuilder, private dialogService: NbDialogService) {
    this.documentForm = this.fb.group({
      name: ["", Validators.required],
      description: ["", Validators.required],
      active: [true],
    });
  }

  ngOnInit(): void {
    // Load initial data (mock for now)
    this.documentTypes = [
      {
        id: 1,
        name: "RFC",
        description: "Registro Federal de Contribuyentes",
        active: true,
      },
      {
        id: 2,
        name: "CURP",
        description: "Clave Única de Registro de Población",
        active: false,
      },
    ];
  }

  onSubmit() {
    if (this.documentForm.valid) {
      const newDocument: DocumentType = {
        id:
          this.documentTypes.length > 0
            ? Math.max(...this.documentTypes.map((d) => d.id)) + 1
            : 1,
        name: this.documentForm.value.name,
        description: this.documentForm.value.description,
        active: this.documentForm.value.active,
      };

      this.documentTypes.push(newDocument);
      this.documentForm.reset({ active: true });
    }
  }

  onEdit(document: DocumentType) {
    this.editingDocument = { ...document };
    this.dialogRef = this.dialogService.open(this.editModalTemplate, {
      context: this.editingDocument,
    });
  }

  onDelete(document: DocumentType) {
    this.documentToDelete = document;
    this.dialogRef = this.dialogService.open(this.deleteModalTemplate, {
      context: this.documentToDelete,
    });
  }

  confirmEdit() {
    if (this.editingDocument) {
      const index = this.documentTypes.findIndex(
        (d) => d.id === this.editingDocument?.id
      );
      if (index !== -1) {
        this.documentTypes[index] = { ...this.editingDocument };
      }
      this.cancelEdit();
    }
  }

  cancelEdit() {
    this.editingDocument = null;
    this.dialogRef.close();
  }

  confirmDelete() {
    if (this.documentToDelete) {
      this.documentTypes = this.documentTypes.filter(
        (d) => d.id !== this.documentToDelete?.id
      );
      this.cancelDelete();
    }
  }

  cancelDelete() {
    this.documentToDelete = null;
    this.dialogRef.close();
  }
}
