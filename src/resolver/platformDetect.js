// resolver/platformDetect.js
module.exports = function detect(url) {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/douyin\.com|v\.douyin\.com/.test(url)) return 'douyin';
    if (/bilibili\.com/.test(url)) return 'bilibili';
    if (/kuaishou\.com/.test(url)) return 'kuaishou';
    if (/ixigua\.com/.test(url)) return 'ixigua';
    return 'unknown';
};
