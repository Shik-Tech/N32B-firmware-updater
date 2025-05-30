const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');
const ffmpeg = require('ffmpeg-static-electron');

app.commandLine.appendSwitch('enable-features', 'ElectronSerialChooser');
app.allowRendererProcessReuse = false;

// Set ffmpeg path for the application
process.env.FFMPEG_PATH = ffmpeg.path;

function createWindow() {
    let appWindow = new BrowserWindow({
        width: 500,
        height: 350,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    appWindow.loadURL(
        isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, '../build/index.html')}`
    );

    if (isDev) {
        appWindow.webContents.openDevTools({ mode: 'detach' });
    }

    appWindow.webContents.on('did-finish-load', () => {
        appWindow.webContents.send('resources-path', getResourcesPath());
    });
}
function getResourcesPath() {
    return isDev
        ? app.getAppPath() // Development mode
        : path.join(app.getAppPath(), '..'); // Production mode
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});