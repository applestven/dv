// 兜底逻辑集中
const { runYtDlp } = require('../../downloader/ytDlpRunner');
const puppeteerStrategy = require('./puppeteer.strategy');

module.exports = async function ytDlpStrategy(task) {
    try {
        return await runYtDlp({
            url: task.url,
            quality: task.quality,
            id: task.id,
            name: 'ytDlpStrategy'
        });
    } catch (err) {
        if (err.canFallback) {
            return puppeteerStrategy(task);
        }
        throw err;
    }
};
