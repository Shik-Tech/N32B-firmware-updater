const { notarize } = require('electron-notarize');

if (process.platform !== 'darwin') {
    console.log("Skipping notarization for non-macOS builds.");
    process.exit(0); // Exit gracefully for other platforms
}

exports.default = async function notarizeApp(context) {
    const { appOutDir } = context;
    console.log("Notarizing macOS build with notarytool...");

    return await notarize({
        appBundleId: 'tech.shik.updater.firmware',
        appPath: `${appOutDir}/n32b-firmware-updater.app`,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
        tool: 'notarytool'
    });
};