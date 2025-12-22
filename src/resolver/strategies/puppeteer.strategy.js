// resolver/strategies/puppeteer.strategy.js
// 只在 yt-dlp 失败后调用
module.exports = async function run(task) {
    // 你自己原来的 puppeteer 下载逻辑
    return runByPuppeteer(task.url);
};
