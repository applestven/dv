// downloader/platforms/index.js
// 平台注册中心
const douyin = require('./douyin');
const bilibili = require('./bilibili');
const generic = require('./generic');

function getPlatformDownloader(platform) {
    return (
        {
            douyin,
            bilibili,
            generic,
        }[platform] || generic
    );
}

module.exports = { getPlatformDownloader };
