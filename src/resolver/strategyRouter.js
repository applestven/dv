// resolver/strategyRouter.js
// const detect = require('./platformDetect');

// function chooseStrategy(url) {
//     const platform = detect(url);

//     // yt-dlp 原生强支持
//     if (
//         ['youtube', 'douyin', 'bilibili', 'kuaishou', ''].includes(platform)
//     ) {
//         return { platform, strategy: 'yt-dlp' };
//     }

//     // 未匹配平台：yt-dlp generic
//     return { platform, strategy: 'yt-dlp-generic' };
// }

// module.exports = { chooseStrategy };


const ytDlpStrategy = require('./strategies/ytDlp.strategy');
const puppeteerStrategy = require('./strategies/puppeteer.strategy');

function chooseStrategy(url) {
    // 现在简单，后面你可以按域名、规则扩展
    if (/douyin|tiktok|youtube|bilibili|kuaishou|ixigua/.test(url)) {
        return ytDlpStrategy;
    }

    return puppeteerStrategy;
}

module.exports = { chooseStrategy };
