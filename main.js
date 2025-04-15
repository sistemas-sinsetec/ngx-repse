const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const url = require('url');

// Configuración de entorno
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;

// Variables globales
let mainWindow;

function createWindow() {
    // Crear la ventana del navegador con configuraciones mejoradas
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        show: false, // No mostrar hasta que esté listo
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            sandbox: false,
            devTools: isDev
        },
        frame: true,
        title: 'Tu Aplicación con Nebular',
        icon: path.join(__dirname, 'src/assets/icons/icon.png'),
        backgroundColor: '#edf1f7' // Color de fondo similar a Nebular
    });

    // Solucionar problemas de caché en Windows
    if (process.platform === 'win32') {
        app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
        app.commandLine.appendSwitch('disable-software-rasterizer');
    }

    // Configurar ruta de caché personalizada para evitar errores de permisos
    app.setPath('userData', path.join(app.getPath('appData'), app.getName()));

    // Manejar eventos de la ventana
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Cargar la aplicación Angular
    const loadApp = () => {
        try {
            if (isDev) {
                // Modo desarrollo
                const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:4200';
                mainWindow.loadURL(devUrl).catch(err => {
                    showErrorDialog('Error al cargar la URL de desarrollo', err);
                });
            } else {
                // Modo producción
                mainWindow.loadURL(
                    url.format({
                        pathname: path.join(__dirname, 'dist', 'index.html'),
                        protocol: 'file:',
                        slashes: true
                    })
                ).catch(err => {
                    showErrorDialog('Error al cargar el archivo de producción', err);
                });
            }
        } catch (error) {
            showErrorDialog('Error inesperado', error);
        }
    };

    // Manejar eventos de Nebular (si es necesario)
    ipcMain.on('nebular-action', (event, arg) => {
        console.log('Nebular action received:', arg);
        // Puedes agregar lógica específica para Nebular aquí
    });

    // Manejar errores de autenticación (común con Nebular)
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Failed to load:', errorCode, errorDescription);
    });


    

    // Iniciar la carga de la aplicación
    loadApp();
}

// Mostrar diálogo de error
function showErrorDialog(title, content) {
    dialog.showErrorBox(title, typeof content === 'string' ? content : JSON.stringify(content));
    app.quit();
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    showErrorDialog('Error no capturado', error);
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.whenReady().then(() => {
    createWindow();

    // Interceptar 'file://' para asegurar rutas correctas al usar HashLocationStrategy
    
});

// Configuración especial para producción
if (!isDev) {
    // Deshabilitar hardware acceleration si hay problemas
    app.disableHardwareAcceleration();

    // Configurar el nombre de la aplicación
    if (process.platform === 'win32') {
        app.setAppUserModelId(app.getName());
    }
}

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
  });