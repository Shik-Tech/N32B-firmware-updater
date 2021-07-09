const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');   
const path = require('path');

function createWindow() {
    let appWindow = new BrowserWindow({
        width: 450,
        height: 350,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const startURL = isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}`;
 
    appWindow.loadURL(startURL);
    if (isDev) {
        appWindow.webContents.openDevTools();
    }
    appWindow.once('ready-to-show', () => appWindow.show());
    appWindow.on('closed', () => {
        appWindow = null;
    });
}
app.allowRendererProcessReuse = false;
app.on('ready', createWindow);
