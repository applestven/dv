// utils/platformDetect.js

// 平台映射表（Douyin / B站 / 通用） 平台识别
function detectPlatform(url) {
    if (/douyin\.com/.test(url)) return 'douyin';
    if (/bilibili\.com/.test(url)) return 'bilibili';
    return 'generic';
}

module.exports = { detectPlatform };
