/*
  En esta parte se manejan los permisos de tus socios comerciales para ver ciertas secciones 
  Además, se incluye el filtrado por tipo de socio (por ejemplo: Todos, Proveedor, Cliente).
  Ahora, dependiendo del rol del socio, se mostrarán diferentes secciones disponibles.
*/
import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { CustomToastrService } from "../../../../services/custom-toastr.service";
import { AuthService } from "../../../../services/auth.service";
import { LoadingController } from "@ionic/angular";
import { environment } from "../../../../../environments/environment";
import { NbDialogService } from "@nebular/theme";
import { DeleteModalComponent } from "../../site/delete-modal/delete-modal.component";
import { CompanyService } from "../../../../services/company.service";

@Component({
  selector: "ngx-permissions-businees-partner",
  templateUrl: "./permissions-businees-partner.component.html",
  styleUrls: ["./permissions-businees-partner.component.scss"],
})
export class PermissionsBusineesPartnerComponent implements OnInit {
  // Propiedad para el filtro de socios comerciales
  selectedUserType: string = "all";
  // Listado original de socios comerciales
  partners: any[] = [];
  // Listado filtrado de socios comerciales
  filteredPartners: any[] = [];
  // ID del socio seleccionado
  selectedPartnerId: string;
  // Sección seleccionada (única) para asignar permisos
  selectedSection: string;
  // Permisos asignados
  permissions: any[] = [];
  // Lista de socios comerciales
  commercialPartners: any[] = [];

  /**
   * Mapeo de secciones disponibles por rol.
   * Ajusta los nombres de las secciones según tus necesidades.
   */
  private sectionsByRole = {
    proveedor: [
      "Dashboard Proveedor",
      "Gestión de Productos",
      "Reportes Proveedor",
    ],
    cliente: ["Dashboard Cliente", "Historial de Pedidos", "Soporte"],
    "cliente-proveedor": [
      "Dashboard Proveedor",
      "Dashboard Cliente",
      "Reportes Globales",
    ],
  };

  // Arreglo de secciones disponibles para el socio seleccionado (se actualiza según rol)
  sections: string[] = [];

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private toastrService: CustomToastrService,
    private loadingController: LoadingController,
    private dialogService: NbDialogService,
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit() {
    this.loadPartners();
  }

  // Método para presentar el loading
  async presentLoading(message: string = "Cargando...") {
    const loading = await this.loadingController.create({
      message: message,
    });
    await loading.present();
    return loading; // Retornamos la instancia para poder cerrarla luego
  }

  // Carga los socios comerciales desde el endpoint
  async loadPartners() {
    const loading = await this.presentLoading("Cargando socios comerciales...");
    // Se obtiene el companyId desde el servicio CompanyService
    const companyId = this.companyService.selectedCompany.id;
    const data = { companyId };

    this.http
      .post(`${environment.apiBaseUrl}/getCommercialPartners.php`, data)
      .subscribe(
        (response: any) => {
          loading.dismiss();
          if (response.success) {
            this.commercialPartners = response.partners;
            // Si deseas inicializar también el listado filtrado:
            this.filteredPartners = response.partners;
          } else {
            console.error(response.message || response.error);
            this.toastrService.showError(
              response.message || response.error,
              "error"
            );
          }
        },
        (error) => {
          loading.dismiss();
          console.error("Error en la solicitud POST:", error);
          this.toastrService.showError(
            "Error al cargar socios comerciales.",
            "danger"
          );
        }
      );
  }

  /**
   * Filtra los socios comerciales según el tipo seleccionado.
   * Se asume que cada socio tiene la propiedad 'tipoSocio' (por ejemplo: 'proveedor', 'cliente').
   */
  onUserTypeChange(newValue: string) {
    this.selectedUserType = newValue;
    if (this.selectedUserType === "all") {
      this.filteredPartners = this.commercialPartners;
    } else {
      this.filteredPartners = this.commercialPartners.filter(
        (partner) =>
          partner.tipoSocio &&
          partner.tipoSocio.toLowerCase() ===
            this.selectedUserType.toLowerCase()
      );
    }
  }

  /**
   * Se ejecuta al seleccionar un socio comercial.
   * Además de cargar los permisos, se actualiza la lista de secciones según su rol.
   */
  onPartnerSelected(newValue: string) {
    this.selectedPartnerId = newValue;
    // Buscar en la lista de socios el seleccionado
    const selectedPartner = this.commercialPartners.find(
      (partner) => partner.id === newValue
    );
    if (selectedPartner && selectedPartner.role) {
      // Convertir el rol a minúsculas para mayor robustez
      const roleKey = selectedPartner.role.toLowerCase();
      // Actualizar el arreglo de secciones según el rol; si no hay mapeo, se deja vacío
      this.sections = this.sectionsByRole[roleKey] || [];
    } else {
      this.sections = [];
    }
    // Cargar los permisos asignados para este socio
    this.loadPermissions();
  }

  // Actualiza la propiedad selectedSection al cambiar la selección de sección en el HTML
  onSectionChange(event: any) {
    this.selectedSection = event;
  }

  // Carga los permisos del socio comercial seleccionado
  async loadPermissions() {
    const data = { companyId: this.selectedPartnerId };
    const loading = await this.presentLoading("Cargando permisos...");

    this.http
      .post(`${environment.apiBaseUrl}/loadCompanyPermissions.php`, data)
      .subscribe(
        (response: any) => {
          loading.dismiss();
          if (response.success) {
            this.permissions = response.permissions;
          } else {
            console.error(response.error);
            this.toastrService.showError(response.error, "error");
          }
        },
        (error) => {
          loading.dismiss();
          console.error("Error en la solicitud POST:", error);
          this.toastrService.showError("Error al cargar permisos.", "error");
        }
      );
  }

  // Asigna un nuevo permiso de sección al socio comercial seleccionado
  async addPermission() {
    const data = {
      companyId: this.selectedPartnerId,
      section: this.selectedSection,
    };

    const loading = await this.presentLoading("Añadiendo permisos...");

    this.http
      .post(`${environment.apiBaseUrl}/addCompanyPermission.php`, data)
      .subscribe(
        (response: any) => {
          loading.dismiss();
          if (response.success) {
            // Agregar permiso localmente
            this.permissions.push({ NameSection: this.selectedSection });
            this.toastrService.showSuccess(
              "Permiso añadido correctamente.",
              "Éxito"
            );
            // Reiniciar la selección de sección, si se desea
            this.selectedSection = null;
          } else {
            console.error(response.error);
            this.toastrService.showError(response.error, "Error");
          }
        },
        (error) => {
          loading.dismiss();
          console.error("Error en la solicitud POST:", error);
          this.toastrService.showError("Error al añadir permiso.", "Error");
        }
      );
  }

  // Elimina el permiso asignado luego de confirmar en el modal
  async removePermission(NameSection: string) {
    this.dialogService
      .open(DeleteModalComponent, {
        context: {
          title: "Confirmación",
          message: `¿Estás seguro de que deseas eliminar el permiso "${NameSection}"?`,
        },
      })
      .onClose.subscribe(async (confirmed: boolean) => {
        if (confirmed) {
          const data = {
            partnerId: this.selectedPartnerId,
            section: NameSection,
          };

          const loading = await this.presentLoading("Eliminando permiso...");

          this.http
            .post(`${environment.apiBaseUrl}/removePartnerPermission.php`, data)
            .subscribe(
              (response: any) => {
                loading.dismiss();
                if (response.success) {
                  this.permissions = this.permissions.filter(
                    (p) => p.NameSection !== NameSection
                  );
                  this.toastrService.showSuccess(
                    "Permiso eliminado correctamente.",
                    "success"
                  );
                } else {
                  this.toastrService.showError(response.error, "danger");
                }
              },
              (error) => {
                loading.dismiss();
                this.toastrService.showError(
                  "Error al eliminar permiso.",
                  "danger"
                );
              }
            );
        }
      });
  }
}
