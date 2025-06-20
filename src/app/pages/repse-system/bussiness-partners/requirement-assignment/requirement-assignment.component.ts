import { Component, OnInit } from "@angular/core";
import { CompanyService } from "../../../../services/company.service";
import {
  DocumentService,
  DocumentType,
} from "../../../../services/repse/document.service";
import { DatePipe } from "@angular/common"; //Importar DatePipe y agregarlo a los providers del componente

import {
  AssignedRequiredFileView,
  Partner,
} from "../../../../services/repse/document.service";
@Component({
  selector: "ngx-requirement-assignment",
  templateUrl: "./requirement-assignment.component.html",
  styleUrls: ["./requirement-assignment.component.scss"],
  providers: [DatePipe], //Añadir esto en el decorador
})
export class RequirementAssignmentComponent implements OnInit {
  businessPartners: Partner[] = [];
  requirements: AssignedRequiredFileView[] = [];
  documentTypes: DocumentType[] = [];
  availableFormats: { id: number; name: string; extension: string }[] = [];

  constructor(
    private companyService: CompanyService,
    private documentService: DocumentService,
    private datePipe: DatePipe // Añadir esto
  ) {}
  // indificacion de mas de +10
  // Añadir esta función pública para que sea accesible desde el HTML
  public isExtremeFutureDate(dateString: string): boolean {
    if (!dateString) return false;

    // Usando moment.js para mejor manejo de zonas horarias
    const date = new Date(dateString);
    const threshold = new Date();
    threshold.setFullYear(threshold.getFullYear() + 10);

    return date > threshold;
  }
  // En el componente
  getFormattedEndDate(endDate: string): string {
    if (!endDate) return "-";

    if (this.isExtremeFutureDate(endDate)) {
      return "N/A";
    }

    return this.datePipe.transform(endDate, "dd/MM/yyyy") || "-";
  }

  get companyId(): number {
    return this.companyService.selectedCompany.id;
  }

  ngOnInit(): void {
    this.documentService.getDocumentTypes({ onlyActive: true }).subscribe({
      next: (types) => (this.documentTypes = types),
      error: (err) =>
        console.error("Error cargando tipos de documento activos", err),
    });

    this.documentService.getAvailableFormats().subscribe({
      next: (formats) => (this.availableFormats = formats),
      error: (err) => console.error("Error cargando formatos", err),
    });

    this.documentService.getBusinessPartners(this.companyId).subscribe({
      next: (partners) => {
        this.businessPartners = partners.filter(
          (p) => p.affiliation.toLowerCase() === "proveedor"
        );
        this.loadAssignedRequirements(); // ← Se mueve aquí
      },
      error: (err) => console.error("Error cargando proveedores", err),
    });
  }

  loadAssignedRequirements(): void {
    this.documentService.getAssignedRequiredFiles(this.companyId).subscribe({
      next: (configs) => {
        // Si ya cargaron los partners, podemos hacer el merge aquí
        this.requirements = configs.map((req) => {
          const matchingPartner = this.businessPartners.find(
            (p) => Number(p.id) === Number(req.companyId)
          );
          return {
            ...req,
            company_name: matchingPartner?.name || `Empresa ${req.companyId}`,
          };
        });
      },
      error: (err) => console.error("Error cargando requisitos", err),
    });
  }

  getStatusColor(status: string): string {
    return (
      {
        complete: "success",
        partial: "warning",
        pending: "info",
        overdue: "danger",
      }[status] || "basic"
    );
  }

  getStatusLabel(status: string): string {
    return (
      {
        complete: "Completo",
        partial: "Parcial",
        pending: "Pendiente",
        overdue: "Atrasado",
      }[status] || status
    );
  }
}
