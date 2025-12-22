const { downloadVideoCommon } = require('./plugin/puppeteer/downloadVideo.js');

async function downloadVideo(url, options = {}) {
    return await downloadVideoCommon({ sourceUrl: url, options: { ...options } });
}

downloadVideo("【印度美食超级大变！竟从不明物体变为篮球与鸡！】 https://www.bilibili.com/video/BV1Q4qUBUEhQ/?share_source=copy_web");