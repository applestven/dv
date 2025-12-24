// resolver/strategies/puppeteer.strategy.js
// 只在 yt-dlp 失败后调用

const { downloadVideoCommon } = require('../../../plugin/puppeteer/downloadVideo.js');

module.exports = async function puppeteerStrategy(task) {
    console.log("@@strategies/puppeteer task", task)
    // 你自己原来的 puppeteer 下载逻辑
    const result = await downloadVideoCommon({ sourceUrl: task.url, downloadPath: task.downloadPath || './downloads' });
    return { strategyName: 'puppeteerStrategy', ...result };
};
