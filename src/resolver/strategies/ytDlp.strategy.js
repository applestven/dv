// 兜底逻辑集中
const { runYtDlp } = require('../../downloader/ytDlpRunner');
const puppeteerStrategy = require('./puppeteer.strategy');

module.exports = async function ytDlpStrategy(task) {
    try {

        const regex = /(http|https):\/\/[^\s]+/;
        const match = task.url.match(regex);
        return await runYtDlp({
            url: match,
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
