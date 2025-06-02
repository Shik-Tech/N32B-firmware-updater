const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const isDev = process.env.APP_DEV === 'true';
const AvrFlasher = require('../src/avr-flasher');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 500,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadURL(
        isDev
            ? 'http://localhost:3000'
            : `file://${path.join(__dirname, '../build/index.html')}`
    );

    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
})

const getHexsPath = () => {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'hexs')
        : path.join(__dirname, '../hexs');
};

// IPC handlers
ipcMain.on('toMain', async (event, data) => {
    switch (data.type) {
        case 'getResourcesPath':
            const resourcesPath = isDev
                ? app.getAppPath()
                : path.join(app.getAppPath(), '..');
            event.reply('fromMain', {
                type: 'resourcesPath',
                path: resourcesPath
            });
            break;

        case 'uploadFirmware':
            try {
                const { filePath } = data;
                const flasher = new AvrFlasher({
                    debug: true
                });

                flasher.on('complete', () => {
                    event.reply('fromMain', {
                        type: 'uploadComplete'
                    });
                });

                flasher.on('error', (error) => {
                    event.reply('fromMain', {
                        type: 'error',
                        error: error.message
                    });
                });

                const firmwareFilePath = path.isAbsolute(filePath) ? filePath : path.join(getHexsPath(), filePath.replace(/^.*hexs[\/]/, ''));
                await flasher.flash(firmwareFilePath);
            } catch (error) {
                event.reply('fromMain', {
                    type: 'error',
                    error: error.message
                });
            }
            break;

        default:
            event.reply('fromMain', {
                type: 'error',
                error: `Unhandled message type: ${data.type}`
            });
            break;
    }
});