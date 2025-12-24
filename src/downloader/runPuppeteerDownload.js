// 兜底方案： 使用puppeteer读取视频流下载
const fs = require('fs');

const { downloadVideoCommon } = require('../../plugin/puppeteer/downloadVideo.js');

async function runPuppeteerDownload(url, options = {}) {
    const res = await downloadVideoCommon({ sourceUrl: url, downloadPath: options.downloadPath || './downloads' });
    if (res && res.code === 1) {
        return res.path;
    }
    throw new Error(res && res.error ? res.error : 'puppeteer download failed');
}

module.exports = { runPuppeteerDownload };