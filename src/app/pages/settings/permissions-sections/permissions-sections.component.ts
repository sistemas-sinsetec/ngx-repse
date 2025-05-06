/*
  En este codigo se añaden o quitan los diferentes permisos para cada usuario, es decir las secciones
  a las que tendra acceso cada usuario ligado a la empresa.
*/
import { Component, OnInit } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { CompanyService } from "../../../services/company.service";
import { AuthService } from "../../../services/auth.service";
import { LoadingController } from "@ionic/angular"; // Importar LoadingController
import { CustomToastrService } from "../../../services/custom-toastr.service";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "ngx-permissions-sections",
  templateUrl: "./permissions-sections.component.html",
  styleUrls: ["./permissions-sections.component.scss"],
})
export class PermissionsSectionsComponent implements OnInit {
  selectedUserType: string = "all";
  selectedUserId: string;
  selectedSection: string;
  selectedSubSections: string[] = [];
  selectedSubSectionsProvider: string[] = []; // Nueva propiedad para proveedor
  selectedSubSectionsClient: string[] = []; // Nueva propiedad para cliente
  users: any[] = [];
  filteredUsers: any[] = [];
  userTypes: any[] = [];
  sections: string[] = [];
  subSections: string[] = [];
  subSectionsProvider: string[] = []; // Nueva propiedad para proveedor
  subSectionsClient: string[] = []; // Nueva propiedad para cliente
  permissions: any[] = [];

  userTypeNames: Record<string, string> = {
    admin: "Administrador",
    superV: "Supervisor",
    adminU: "Administrativo",
  };

  groupedPermissions: { section: string; subSections: string[] }[] = []; // Nueva propiedad

  constructor(
    private http: HttpClient,
    private toastrService: CustomToastrService,
    public companyService: CompanyService,
    private router: Router,
    public authService: AuthService,
    private loadingController: LoadingController // Inyectar LoadingController
  ) {}

  async ngOnInit() {
    await this.loadUsers();
    await this.loadUserTypes();
    await this.loadSections();
  }

  async loadUsers() {
    const loading = await this.showLoading("Cargando usuarios..."); // Mostrar loading
    const companyId = this.companyService.selectedCompany.id;
    const data = { companyId: companyId };

    this.http.post(`${environment.apiBaseUrl}/searchUsers.php`, data).subscribe(
      async (response: any) => {
        if (response.success) {
          this.users = response.employees;
          this.filteredUsers = this.users;
        } else {
          this.toastrService.showError(response.error, "error");
        }
        await loading.dismiss(); // Ocultar loading
      },
      async (error) => {
        console.error("Error en la solicitud GET:", error);
        this.toastrService.showError("Error al cargar usuarios.", "error");
        await loading.dismiss(); // Ocultar loading
      }
    );
  }

  async loadUserTypes() {
    const loading = await this.showLoading("Cargando tipos de usuario..."); // Mostrar loading
    this.http.get(`${environment.apiBaseUrl}/get-level-users.php`).subscribe(
      async (response: any) => {
        this.userTypes = response;
        await loading.dismiss(); // Ocultar loading
      },
      async (error) => {
        console.error("Error en la solicitud GET:", error);
        this.toastrService.showError(
          "Error al cargar los tipos de usuario.",
          "error"
        );
        await loading.dismiss(); // Ocultar loading
      }
    );
  }

  async loadSections() {
    const loading = await this.showLoading("Cargando secciones..."); // Mostrar loading
    const companyId = this.companyService.selectedCompany.id;
    const data = { companyId: companyId };

    this.http
      .post(`${environment.apiBaseUrl}/loadCompanySections.php`, data)
      .subscribe(
        async (response: any) => {
          if (response.success) {
            const allSections = [
              "Sistema REPSE",
              "Control de proyectos",
              "Empleados",
              "Incidencias",
              "Costos",
              "Ventas",
              "Configuracion de mi empresa",
              "Configuracion de perfiles",
              "Configuracion de socios comerciales",
              "Configuracion de sitio",
              "Configuracion de usuarios",
            ];
            const assignedSections = response.sections.map(
              (section: { NameSection: string }) => section.NameSection
            );
            this.sections = allSections.filter((section) =>
              assignedSections.includes(section)
            );
          } else {
            console.error(response.error);
            await this.toastrService.showError(response.error, "error");
          }
          await loading.dismiss(); // Ocultar loading
        },
        async (error) => {
          console.error("Error en la solicitud POST:", error);
          await this.toastrService.showError(
            "Error al cargar secciones.",
            "error"
          );
          await loading.dismiss(); // Ocultar loading
        }
      );
  }

  async onUserTypeChange(event: any) {
    const userType = event.target.value;

    if (userType === "all") {
      this.filteredUsers = this.users;
    } else {
      this.filteredUsers = this.users.filter((user) => user.role === userType);
    }
  }

  async onUserChange(selectedValue: any) {
    this.selectedUserId = selectedValue;
    await this.loadPermissions();
  }

  async onSectionChange(selectedValue: any) {
    this.selectedSection = selectedValue;
    this.loadSubSections(this.selectedSection);
  }

  async loadSubSections(section: string) {
    //Las ve la empresa
    const subSectionsMap: { [key: string]: string[] } = {
      "Sistema REPSE": [
        "Asignacion de requisitos de empresa",
        "Carga de documentos de empresa",
        "Revision de documentos",
        "Catalogo de documentos",
        "Asignacion de requisitos de socios comerciales",
      ],
      "Control de proyectos": [
        "Asignacion de proyectos",
        "Registro de proyectos",
        "Vizualizar proyectos",
        "Seguimiento de proyectos",
      ],
      Empleados: [
        "Registrar solicitudes de empleados",
        "Editar solicitudes de empleados",
        "Aceptar solicitudes de empleados",
        "Procesar empleados",
        "Ver empleados registrados",
      ],
      Incidencias: [
        "Control de incidencias",
        "Confirmar dia",
        "Confirmar semana",
        "Semanas procesadas",
        "Lista de asistencia",
      ],
      Costos: [""],
      Ventas: [""],
      "Configuracion de mi empresa": [
        "Asignar logo de la empresa",
        "Código de la empresa",
        "Departamentos",
        "Configuración inicial de períodos",
        "Tipos de período",
        "Catálogo de períodos",
        "Mi informacion fiscal",
        "Confirmar expendientes digitales",
        "Subir expendientes digitales",
      ],
      "Configuracion de socios comerciales": [
        "Autorizar socio comercial",
        "Editar roles de los socios comerciales",
        "Registrar socio comercial",
        "Secciones visibles de los socios comerciales",
      ],
      "Configuracion de sitio": [
        "Secciones visibles de empresas",
        "Empresas registradas en la página",
        "Registrar empresas",
        "Confirmar solicitudes premium",
      ],
      "Configuracion de usuarios": [
        "Registrar usuarios",
        "Mis usuarios",
        "Editar mi usuario",
      ],
    };

    //Las ven los clientes
    const subSectionsProviderMap: { [key: string]: string[] } = {
      "Sistema REPSE": [],
      "Control de proyectos": [""],
      Empleados: [""],
      Incidencias: [""],
      Costos: [""],
      Ventas: [""],
      "Configuracion de mi empresa": [],
      "Configuracion de perfiles": [""],
      "Configuracion de socios comerciales": [""],
      "Configuracion de sitio": [""],
      "Configuracion de usuarios": [""],
    };

    const subSectionsClientMap: { [key: string]: string[] } = {
      "Sistema REPSE": [""],
      "Control de proyectos": [""],
      Empleados: [""],
      Incidencias: [""],
      Costos: [""],
      Ventas: [""],
      "Configuracion de mi empresa": [""],
      "Configuracion de perfiles": [""],
      "Configuracion de socios comerciales": [""],
      "Configuracion de sitio": [""],
      "Configuracion de usuarios": [""],
    };

    this.subSections = subSectionsMap[section] || [];

    if (this.companyService.selectedCompany.role === "proveedor") {
      this.subSectionsProvider = subSectionsProviderMap[section] || [];
    } else if (this.companyService.selectedCompany.role === "cliente") {
      this.subSectionsClient = subSectionsClientMap[section] || [];
    }
  }

  async loadPermissions() {
    const loading = await this.showLoading("Cargando permisos..."); // Mostrar loading
    const companyId = this.companyService.selectedCompany.id;
    const data = { userId: this.selectedUserId, companyId: companyId };

    this.http
      .post(`${environment.apiBaseUrl}/loadPermissions.php`, data)
      .subscribe(
        async (response: any) => {
          if (response.success) {
            this.permissions = response.permissions;
            this.groupPermissions(); // Agrupa los permisos después de cargarlos
          } else {
            console.error(response.error);
            await this.toastrService.showError(response.error, "error");
          }
          await loading.dismiss(); // Ocultar loading
        },
        async (error) => {
          console.error("Error en la solicitud POST:", error);
          await this.toastrService.showError(
            "Error al cargar permisos.",
            "error"
          );
          await loading.dismiss(); // Ocultar loading
        }
      );
  }

  groupPermissions() {
    const grouped: { [key: string]: string[] } = {};

    this.permissions.forEach((permission) => {
      if (!grouped[permission.section]) {
        grouped[permission.section] = [];
      }
      grouped[permission.section].push(
        permission.subSection || "Sin subapartado"
      );
    });

    this.groupedPermissions = Object.keys(grouped).map((section) => ({
      section,
      subSections: grouped[section],
    }));
  }

  async addPermission() {
    const loading = await this.showLoading("Agregando permisos..."); // Mostrar loading
    const companyId = this.companyService.selectedCompany.id;
    let selectedSubSections: string[] = [];

    if (this.companyService.selectedCompany.Role === "proveedor") {
      selectedSubSections = this.selectedSubSectionsProvider;
    } else if (this.companyService.selectedCompany.Role === "cliente") {
      selectedSubSections = this.selectedSubSectionsClient;
    } else {
      selectedSubSections = this.selectedSubSections;
    }

    // Validar si los permisos ya existen
    const existingPermissions = this.checkExistingPermissions(
      this.selectedSection,
      selectedSubSections
    );
    if (existingPermissions.length > 0) {
      this.toastrService.showError(
        `Los siguientes permisos ya existen: ${existingPermissions.join(", ")}`,
        "error"
      );
      await loading.dismiss(); // Ocultar loading
      return; // Detener el proceso si hay permisos duplicados
    }

    const data = {
      userId: this.selectedUserId,
      section: this.selectedSection,
      subSections: selectedSubSections,
      companyId: companyId,
    };

    this.http
      .post(`${environment.apiBaseUrl}/addPermission.php`, data)
      .subscribe(
        async (response: any) => {
          if (response.success) {
            selectedSubSections.forEach((subSection: string) => {
              this.permissions.push({
                section: this.selectedSection,
                subSection: subSection,
              });
            });
            this.groupPermissions(); // Actualiza la agrupación
            this.toastrService.showSuccess(
              "Permisos agregados correctamente.",
              "exito"
            );
          } else {
            console.error(response.error);
            await this.toastrService.showError(response.error, "error");
          }
          await loading.dismiss(); // Ocultar loading
        },
        async (error) => {
          console.error("Error en la solicitud POST:", error);
          await this.toastrService.showError(
            "Error al añadir permiso.",
            "danger"
          );
          await loading.dismiss(); // Ocultar loading
        }
      );
  }

  async removePermission(section: string, subSection: string) {
    const loading = await this.showLoading("Eliminando permiso...");

    const companyId = this.companyService.selectedCompany.id;
    const data = {
      userId: this.selectedUserId,
      section: section,

      subSection: subSection,
      companyId: companyId,
    };

    this.http
      .post(`${environment.apiBaseUrl}/removePermission.php`, data)
      .subscribe(
        async (response: any) => {
          if (response.success) {
            this.permissions = this.permissions.filter(
              (p) => !(p.section === section && p.subSection === subSection)
            );

            this.groupPermissions();

            this.toastrService.showSuccess(
              "Permiso eliminado correctamente.",
              "Exito"
            );
          } else {
            console.error(response.error);
            await this.toastrService.showError(response.error, "error");
          }

          await loading.dismiss();
        },
        async (error) => {
          console.error("Error en la solicitud POST:", error);
          await this.toastrService.showError(
            "Error al eliminar permiso.",
            "error"
          );
          await loading.dismiss();
        }
      );
  }

  // Función para mostrar el loading
  async showLoading(message: string) {
    const loading = await this.loadingController.create({
      message: message,
      spinner: "crescent", // Puedes cambiar el tipo de spinner
      translucent: true,
    });
    await loading.present();
    return loading;
  }

  // Función para verificar si los permisos ya existen
  checkExistingPermissions(section: string, subSections: string[]): string[] {
    const existingPermissions: string[] = [];

    subSections.forEach((subSection) => {
      const exists = this.permissions.some(
        (permission) =>
          permission.section === section && permission.subSection === subSection
      );
      if (exists) {
        existingPermissions.push(subSection);
      }
    });

    return existingPermissions;
  }
}
