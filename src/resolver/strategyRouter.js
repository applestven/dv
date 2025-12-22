// resolver/strategyRouter.js
const detect = require('./platformDetect');

function chooseStrategy(url) {
    const platform = detect(url);

    // yt-dlp 原生强支持
    if (
        ['youtube', 'douyin', 'bilibili', 'kuaishou', 'ixigua'].includes(platform)
    ) {
        return { platform, strategy: 'yt-dlp' };
    }

    // 未匹配平台：yt-dlp generic
    return { platform, strategy: 'yt-dlp-generic' };
}

module.exports = { chooseStrategy };
