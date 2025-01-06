require('dotenv').config();
const { notarize } = require('electron-notarize');

exports.default = async function notarizeApp(context) {
    const { electronPlatformName, appOutDir } = context;
    if (electronPlatformName !== 'darwin') {
        return;
    }

    console.log('Notarizing N32B Firmware Updater...');

    return await notarize({
        appBundleId: 'tech.shik.updater.firmware',
        appPath: `${appOutDir}/N32B Firmware updater.app`,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID
    });
};