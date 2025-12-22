// downloader/platforms/generic.js

// Generic（兜底）  通用
const { runYtDlp } = require('../ytDlpRunner');

async function download({ url, outputDir, cookies }) {
    return runYtDlp({
        url,
        outputDir,
        cookies,
    });
}

module.exports = { download };
