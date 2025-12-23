// cookie 自动读取工具


// detectPlatform → douyin

// 查找 cookies/douyin.txt (现在这个文件就是这一步呢)

// 有 → 自动注入 --cookies

// 没有 → 继续跑，不报错

const fs = require('fs');
const path = require('path');

const COOKIE_DIR = path.resolve(process.cwd(), 'cookies');

/**
 * 根据平台自动查找 cookie 文件
 * 存在则返回路径，不存在返回 null
 */
function resolveCookieByPlatform(platform) {
    if (!platform) return null;

    const cookieFile = path.join(COOKIE_DIR, `${platform}.txt`);

    if (fs.existsSync(cookieFile)) {
        return cookieFile;
    }

    return null;
}

module.exports = { resolveCookieByPlatform };


