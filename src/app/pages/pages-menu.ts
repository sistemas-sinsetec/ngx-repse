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
        link: '',
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
        link: '',
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
        link: '',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Registrar solicitudes de empleados' },
      },
      {
        title: 'Editar solicitudes',
        link: '',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Editar solicitudes de empleados' },
      },
      {
        title: 'Aceptar solicitudes',
        link: '',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Aceptar solicitudes de empleados' },
      },
      {
        title: 'Procesar empleados',
        link: '',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Procesar empleados' },
      },
      {
        title: 'Mis empleados',
        link: '',
        hidden: false,
        permission: { section: 'Empleados', subSection: 'Ver empleados registrados' },
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
        link: '',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Control de incidencias' },
      },
      {
        title: 'Confirmar día',
        link: '',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Confirmar dia' },
      },
      {
        title: 'Confirmar semana',
        link: '',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Confirmar semana' },
      },
      {
        title: 'Semanas Procesadas',
        link: '',
        hidden: false,
        permission: { section: 'Incidencias', subSection: 'Semanas procesadas' },
      },
      {
        title: 'Listas de asistencias',
        link: '',
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
            title: 'Configuración inicial de periodos',
            link: '/pages/settings/my-company/initial-periods',
            hidden: false,
            permission: { section: 'Configuracion de mi empresa', subSection: 'Configuración inicial de períodos' },
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
        link: '',
      },
      {
        title: 'Socios comerciales',
        icon: 'person-outline',
        hidden: false,
        permission: { section: 'Configuracion de socios comerciales' },
        children: [
          {
            title: 'Autorizar socio comercial',
            link: '',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Autorizar socio comercial' },
          },
          {
            title: 'Editar roles de socios comercial',
            link: '',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Editar roles de los socios comerciales' },
          },
          {
            title: 'Registrar socio comercial',
            link: '',
            hidden: false,
            permission: { section: 'Configuracion de socios comerciales', subSection: 'Registrar socio comercial' },
        
          },
          {
            title: 'Secciones visibles de mis socios comerciales',
            link: '',
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
            link: '',
            hidden: false,
            permission: { section: 'Configuracion de usuarios', subSection: 'Registrar, eliminar, ver y editar usuarios' },
          },
          {
            title: 'Editar mi usuario',
            link: '',
            hidden: false,
            permission: { section: 'Configuracion de usuarios', subSection: 'Editar mi usuario' },
          },
        ],
      },
      {
        title: 'App',

        icon: 'smartphone-outline',
        children: [
          {
            title: 'Secciones visibles de empresas',
            link: '/pages/settings/site/company-permissions-sections',
          },
          {
            title: 'Empresas registradas',
            link: '',
          },
          {
            title: 'Registrar empresas',
            link: '',
          },
          {
            title: 'Confirmar solicitudes premium',
            link: '',
          },
        ],
      },
    ],
  },



  {
    title: 'FEATURES',
    group: true,
  },
  {
    title: 'Layout',
    icon: 'layout-outline',
    children: [
      {
        title: 'E-commerce',
        icon: 'shopping-cart-outline',
        link: '/pages/dashboard',
        home: true,
      },
      {
        title: 'IoT Dashboard',
        icon: 'home-outline',
        link: '/pages/iot-dashboard',
      },
      {
        title: 'Stepper',
        link: '/pages/layout/stepper',
      },
      {
        title: 'List',
        link: '/pages/layout/list',
      },
      {
        title: 'Infinite List',
        link: '/pages/layout/infinite-list',
      },
      {
        title: 'Accordion',
        link: '/pages/layout/accordion',
      },
      {
        title: 'Tabs',
        pathMatch: 'prefix',
        link: '/pages/layout/tabs',
      },
    ],
  },
  {
    title: 'Forms',
    icon: 'edit-2-outline',
    children: [
      {
        title: 'Form Inputs',
        link: '/pages/forms/inputs',
      },
      {
        title: 'Form Layouts',
        link: '/pages/forms/layouts',
      },
      {
        title: 'Buttons',
        link: '/pages/forms/buttons',
      },
      {
        title: 'Datepicker',
        link: '/pages/forms/datepicker',
      },
    ],
  },
  {
    title: 'UI Features',
    icon: 'keypad-outline',
    link: '/pages/ui-features',
    children: [
      {
        title: 'Grid',
        link: '/pages/ui-features/grid',
      },
      {
        title: 'Icons',
        link: '/pages/ui-features/icons',
      },
      {
        title: 'Typography',
        link: '/pages/ui-features/typography',
      },
      {
        title: 'Animated Searches',
        link: '/pages/ui-features/search-fields',
      },
    ],
  },
  {
    title: 'Modal & Overlays',
    icon: 'browser-outline',
    children: [
      {
        title: 'Dialog',
        link: '/pages/modal-overlays/dialog',
      },
      {
        title: 'Window',
        link: '/pages/modal-overlays/window',
      },
      {
        title: 'Popover',
        link: '/pages/modal-overlays/popover',
      },
      {
        title: 'Toastr',
        link: '/pages/modal-overlays/toastr',
      },
      {
        title: 'Tooltip',
        link: '/pages/modal-overlays/tooltip',
      },
    ],
  },
  {
    title: 'Extra Components',
    icon: 'message-circle-outline',
    children: [
      {
        title: 'Calendar',
        link: '/pages/extra-components/calendar',
      },
      {
        title: 'Progress Bar',
        link: '/pages/extra-components/progress-bar',
      },
      {
        title: 'Spinner',
        link: '/pages/extra-components/spinner',
      },
      {
        title: 'Alert',
        link: '/pages/extra-components/alert',
      },
      {
        title: 'Calendar Kit',
        link: '/pages/extra-components/calendar-kit',
      },
      {
        title: 'Chat',
        link: '/pages/extra-components/chat',
      },
    ],
  },
  {
    title: 'Maps',
    icon: 'map-outline',
    children: [
      {
        title: 'Google Maps',
        link: '/pages/maps/gmaps',
      },
      {
        title: 'Leaflet Maps',
        link: '/pages/maps/leaflet',
      },
      {
        title: 'Bubble Maps',
        link: '/pages/maps/bubble',
      },
      {
        title: 'Search Maps',
        link: '/pages/maps/searchmap',
      },
    ],
  },
  {
    title: 'Charts',
    icon: 'pie-chart-outline',
    children: [
      {
        title: 'Echarts',
        link: '/pages/charts/echarts',
      },
      {
        title: 'Charts.js',
        link: '/pages/charts/chartjs',
      },
      {
        title: 'D3',
        link: '/pages/charts/d3',
      },
    ],
  },
  {
    title: 'Editors',
    icon: 'text-outline',
    children: [
      {
        title: 'TinyMCE',
        link: '/pages/editors/tinymce',
      },
      {
        title: 'CKEditor',
        link: '/pages/editors/ckeditor',
      },
    ],
  },
  {
    title: 'Tables & Data',
    icon: 'grid-outline',
    children: [
      {
        title: 'Smart Table',
        link: '/pages/tables/smart-table',
      },
      {
        title: 'Tree Grid',
        link: '/pages/tables/tree-grid',
      },
    ],
  },
  {
    title: 'Miscellaneous',
    icon: 'shuffle-2-outline',
    children: [
      {
        title: '404',
        link: '/pages/miscellaneous/404',
      },
    ],
  },
  {
    title: 'Auth',
    icon: 'lock-outline',
    children: [
      {
        title: 'Login',
        link: '/auth/login',
      },
      {
        title: 'Register',
        link: '/auth/register',
      },
      {
        title: 'Request Password',
        link: '/auth/request-password',
      },
      {
        title: 'Reset Password',
        link: '/auth/reset-password',
      },
    ],
  },
];

