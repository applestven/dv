
// 兜底方案： 使用puppeteer读取视频流下载
const fs = require('fs');

const { downloadVideoCommon } = require('../../plugin/puppeteer/downloadVideo.js');

async function runPuppeteerDownload(url, options = {}) {
    return await downloadVideoCommon({ sourceUrl: url, options: { ...options } });
}

module.exports = { runPuppeteerDownload };