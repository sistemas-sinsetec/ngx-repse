import { CustomMenuItem } from './custom-menu-item'; // Asegúrate de usar la ruta correcta

export const MENU_ITEMS: CustomMenuItem[] = [
  // Grupo: Servicios
  {
    title: 'Mis servicios',
    group: true,
  },
  {
    title: 'Sistema REPSE',
    icon: 'layout-outline',
    link: '',
    hidden: false, // Default visible (se actualizará en runtime)
    permission: { section: 'Sistema REPSE' }, // Permiso para validar
  },

  // Grupo: Proyectos
  {
    title: 'Gestión de Proyectos',
    group: true,
  },
  {
    title: 'Control de proyectos',
    icon: 'edit-2-outline',
    hidden: false, // Default visible (se actualizará en runtime)
    permission: { section: 'Control de proyectos' }, // Permiso para validar
    children: [
      {
        title: 'Asignación de proyectos',
        link: '/pages/project-control/assign-projects',
        hidden: false,
        permission: { section: 'Control de proyectos', subSection: 'Asignacion de proyectos' },
      },
      {
        title: 'Registros de proyectos',
        link: '',
        hidden: false,
        permission: { section: 'Control de proyectos', subSection: 'Registro de proyectos' },
      },
      {
        title: 'Visualización de proyectos',
        link: '/pages/project-control/deploy-projects',
        hidden: false,
        permission: { section: 'Control de proyectos', subSection: 'Vizualizar proyectos' },
      },
      {
        title: 'Seguimiento de proyectos',
        link: '',
        hidden: false,
        permission: { section: 'Control de proyectos', subSection: 'Seguimiento de proyectos' },
      },
    ],
  },

  // Grupo: Empleados
  {
    title: 'Gestión de Recursos Humanos',
    group: true,
  },
  {
    title: 'Gestión de empleados',
    icon: 'people-outline',
    hidden: false, // Default visible (se actualizará en runtime)
    permission: { section: 'Empleados' }, // Permiso para validar
    children: [
      {
        title: 'Crear solicitudes',

        link: '/pages/employee-control/add-employees',

        hidden: false,
        permission: { section: 'Empleados', subSection: 'Registrar solicitudes de empleados' },
      },
      {
        title: 'Editar solicitudes',
        link: '/pages/employee-control/edit-employees',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Editar solicitudes de empleados' },
      },
      {
        title: 'Aceptar solicitudes',
        link: '/pages/employee-control/accept-requests',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Aceptar solicitudes de empleados' },
      },
      {
        title: 'Procesar empleados',
        link: '/pages/employee-control/process-employees',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Procesar empleados' },
      },
      {
        title: 'Mis empleados',
        link: '/pages/employee-control/employee-view',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Ver empleados registrados' },
      },
      {
        title: 'Kardex de vacaciones',
        link: '/pages/employee-control/vacations-kardex',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Kardex de vacaciones' },
      },
    ],
  },

  // Grupo: Incidencias
  {
    title: 'Gestión de Incidencias',
    group: true,
  },
  {
    title: 'Control de incidencias',
    icon: 'alert-circle-outline',
    hidden: false, // Default visible (se actualizará en runtime)
    permission: { section: 'Incidencias' },
    children: [
      {
        title: 'Registro de incidencias',
        link: '/pages/incident-control/incident-viewer',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Control de incidencias' },
      },
      {
        title: 'Confirmar día',
        link: '/pages/incident-control/confirm-day',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Confirmar dia' },
      },
      {
        title: 'Confirmar semana',
        link: '/pages/incident-control/confirm-week',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Confirmar semana' },
      },
      {
        title: 'Semanas Procesadas',
        link: '/pages/incident-control/process-weekly-lists',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Semanas procesadas' },
      },
      {
        title: 'Listas de asistencias',
        link: '/pages/incident-control/processed-attendance',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Lista de asistencia' },
      },
    ],
  },
  // Grupo: Finanzas
  {
    title: 'Finanzas',
    group: true,
  },
  {
    title: 'Costos',
    icon: 'pricetags-outline',
    hidden: false, // Default visible (se actualizará en runtime)
    permission: { section: 'Costos' },

  },
  {
    title: 'Ventas',
    icon: 'shopping-cart-outline',
    hidden: false, // Default visible (se actualizará en runtime)
    permission: { section: 'Ventas' },

  },

  // Grupo: Configuración
  {
    title: 'Configuración y Administración',
    group: true,
  },
  {
    title: 'Configuración',
    icon: 'settings-outline',
    children: [
      {
        title: 'Mi empresa',
        icon: 'briefcase-outline',
        hidden: false,
        permission: { section: 'Configuracion de mi empresa' },
        children: [
          {
            title: 'Asignar logo',
            link: '/pages/settings/my-company/upload-logo',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Asignar logo de la empresa' },
          },
          {
            title: 'Código de mi empresa',
            link: '/pages/settings/my-company/code-company',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Código de la empresa' },
          },
          {
            title: 'Mis departamentos',
            link: '/pages/settings/my-company/department-management',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Departamentos' },
          },
          {
            title: 'Tipos de periodos',
            link: '/pages/settings/my-company/period-configuration',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Tipos de período' },
          },
          {
            title: 'Catálogo de periodos',
            link: '/pages/settings/my-company/period-management',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Catálogo de períodos' },
          },
          {
            title: 'Mi información fiscal',
            link: '/pages/settings/my-company/company-tax-details',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Mi informacion fiscal' },
          },
          {
            title: 'Expedientes digitales',
            link: '/pages/settings/my-company/anual-review',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Confirmar expendientes digitales' },
          },
          {
            title: 'Subir expedientes digitales',
            link: '/pages/settings/my-company/anual-upload',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Subir expendientes digitales' },
          },
        ],
      },
      {
        title: 'Secciones de perfiles',
        icon: 'eye-off-outline',
        link: '/pages/settings/permissions-sections',
        requiredLevel: ['adminS', 'adminE', 'adminEE'], // Arreglo de valores permitidos
      },
      {
        title: 'Socios comerciales',
        icon: 'person-outline',
        hidden: false,
        permission: { section: 'Configuracion de socios comerciales' },
        children: [
          {
            title: 'Autorizar socio comercial',
            link: 'settings/business-partner/cp-auth',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Autorizar socio comercial' },
          },
          {
            title: 'Editar roles de socios comercial',
            link: 'settings/business-partner/edit-roles',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Editar roles de los socios comerciales' },
          },
          {
            title: 'Registrar socio comercial',
            link: 'settings/business-partner/business-partner-register',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Registrar socio comercial' },

          },
          {
            title: 'Secciones visibles de mis socios comerciales',
            link: 'settings/business-partner/permissions-businees-partner',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Secciones visibles de los socios comerciales' },

          },
        ],
      },
      {
        title: 'Usuarios',
        icon: 'person-outline',
        hidden: false,
        permission: { section: 'Configuracion de usuarios' },
        children: [
          {
            title: 'Registrar usuarios',
            link: '/pages/settings/users/register',
            hidden: false,
            permission: { section: 'Configuracion de usuarios', subSection: 'Registrar usuarios' },
          },
          {
            title: 'Mis usuarios',
            link: '/pages/settings/users/my-users',
            hidden: false,
            permission: { section: 'Configuracion de usuarios', subSection: 'Mis usuarios' },
          },
          {
            title: 'Editar mi usuario',
            link: '/pages/settings/users/my-profile',
            hidden: false,
            permission: { section: 'Configuracion de usuarios', subSection: 'Editar mi usuario' },
          },
        ],
      },
      {
        title: 'App',
        icon: 'smartphone-outline',
        requiredLevel: ['adminS'], // Asegúrate de que esta propiedad esté definida
        children: [
          {
            title: 'Secciones visibles de empresas',
            link: '/pages/settings/site/company-permissions-sections',
          },
          {
            title: 'Empresas registradas',
            link: '/pages/settings/site/companies-info',
          },
          {
            title: 'Registrar empresas',
            link: '/pages/settings/site/reg-company',
          },
          {
            title: 'Confirmar solicitudes premium',
            link: '/pages/settings/site/premium-auth',
          },
        ],
      },
    ],
  },




];

