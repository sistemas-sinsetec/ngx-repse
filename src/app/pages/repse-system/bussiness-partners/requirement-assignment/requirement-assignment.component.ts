import { Component, OnInit } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { map } from "rxjs/operators";
import { environment } from "../../../../../environments/environment";
import { CompanyService } from "../../../../services/company.service";
import * as moment from "moment";

interface Requirement {
  id: number;
  documentType: string;
  isActive: boolean;
  isPeriodic: boolean;
  periodAmount?: number;
  periodType?: string;
  startDate?: moment.Moment;
  minQuantity: number;
  partners: string[];
  partnerCount: number;
  company_name?: string;
  status?: string;
}

interface Partner {
  id: number;
  name: string;
  affiliation: string;
  selected: boolean;
}

@Component({
  selector: "ngx-requirement-assignment",
  templateUrl: "./requirement-assignment.component.html",
  styleUrls: ["./requirement-assignment.component.scss"],
})
export class RequirementAssignmentComponent implements OnInit {
  businessPartners: Partner[] = [];
  requirements: Requirement[] = [];
  documentTypes: { id: number; name: string }[] = [];
  availableFormats: { id: number; name: string; extension: string }[] = [];

  private fileTypesUrl = `${environment.apiBaseUrl}/file_types.php`;
  private assignedRequirementsUrl = `${environment.apiBaseUrl}/company_assigned_requirements.php`;
  private fileFormatsUrl = `${environment.apiBaseUrl}/file_formats.php`;
  private bpUrl = `${environment.apiBaseUrl}/getBusinessPartner.php`;

  constructor(
    private http: HttpClient,
    private companyService: CompanyService
  ) {}

  get companyId(): number {
    return this.companyService.selectedCompany.id;
  }

  ngOnInit(): void {
    this.loadDocumentTypes();
    this.loadAssignedRequirements();
    this.loadFileFormats();
    this.loadBusinessPartners();
  }

  loadAssignedRequirements(): void {
    const params = new HttpParams().set(
      "assigned_by",
      this.companyId.toString()
    );

    this.http.get<any[]>(this.assignedRequirementsUrl, { params }).subscribe({
      next: (configs) => {
        this.requirements = configs.map((cfg) => ({
          id: cfg.required_file_id,
          documentType: cfg.document_name,
          isPeriodic: cfg.is_periodic === 1,
          periodAmount: cfg.periodicity_count,
          periodType: cfg.periodicity_type,
          startDate: cfg.current_period
            ? moment(cfg.current_period.start_date)
            : undefined,
          minQuantity: cfg.min_documents_needed,
          partnerCount: cfg.partner_count,
          company_name: cfg.company_name,
          status: cfg.status,
          isActive: true,
          partners: [],
        }));
      },
      error: (err) => console.error("Error cargando requisitos", err),
    });
  }

  private loadDocumentTypes(): void {
    this.http.get<any[]>(this.fileTypesUrl).subscribe({
      next: (types) => {
        this.documentTypes = types
          .filter((t) => Number(t.is_active) === 1)
          .map((t) => ({ id: Number(t.file_type_id), name: t.name }));
      },
      error: (err) => console.error("Error cargando tipos de documento", err),
    });
  }

  private loadFileFormats(): void {
    this.http
      .get<{ code: string; name: string; mime: string }[]>(this.fileFormatsUrl)
      .subscribe({
        next: (list) => {
          this.availableFormats = list.map((f, i) => ({
            id: i + 1,
            name: f.name,
            extension: f.code,
          }));
        },
        error: (err) => console.error("Error cargando formatos", err),
      });
  }

  private loadBusinessPartners(): void {
    const params = new HttpParams().set(
      "association_id",
      this.companyId.toString()
    );

    this.http
      .get<any[]>(this.bpUrl, { params })
      .pipe(
        map((list) =>
          list
            .filter((p) => p.roleName.toLowerCase() === "proveedor")
            .map((p) => ({
              id: +p.businessPartnerId,
              name: p.nameCompany,
              affiliation: p.roleName,
              selected: false,
            }))
        )
      )
      .subscribe({
        next: (partners) => (this.businessPartners = partners),
        error: (err) => console.error("Error cargando proveedores", err),
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
