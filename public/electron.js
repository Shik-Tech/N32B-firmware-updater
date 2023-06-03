const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

app.commandLine.appendSwitch('enable-features', 'ElectronSerialChooser');
app.allowRendererProcessReuse = false;

function createWindow() {
    let appWindow = new BrowserWindow({
        width: 500,
        height: 350,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableBlinkFeatures: 'Serial'
        }
    });

    appWindow.loadURL(
        isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, '../build/index.html')}`
    );


    // appWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    //     // Add listeners to handle ports being added or removed before the callback for `select-serial-port`
    //     console.log('SELECT-SERIAL-PORT FIRED WITH', portList);

    //     // is called.
    //     appWindow.webContents.session.on('serial-port-added', (event, port) => {
    //         console.log('serial-port-added FIRED WITH', port)
    //         // Optionally update portList to add the new port
    //     })

    //     appWindow.webContents.session.on('serial-port-removed', (event, port) => {
    //         console.log('serial-port-removed FIRED WITH', port)
    //         // Optionally update portList to remove the port
    //     })

    //     event.preventDefault()
    //     if (portList && portList.length > 0) {
    //         callback(portList[0].portId)
    //     } else {
    //         // eslint-disable-next-line n/no-callback-literal
    //         callback('') // Could not find any matching devices
    //     }
    // })

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