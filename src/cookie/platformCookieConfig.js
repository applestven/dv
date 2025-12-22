// src/cookie/platformCookieConfig.js

//Cookie 策略配置表（核心）
module.exports = {
    douyin: {
        domains: ['douyin.com'],
        cookiePath: 'cookies/douyin.txt',
        refreshIntervalDays: 30,
        entryUrl: 'https://www.douyin.com',
        needLogin: false,
    },

    bilibili: {
        domains: ['bilibili.com'],
        cookiePath: 'cookies/bilibili.txt',
        refreshIntervalDays: 60,
        entryUrl: 'https://www.bilibili.com',
        needLogin: false,
    },

    generic: {
        domains: [],
        cookiePath: 'cookies/generic.txt',
        refreshIntervalDays: 90,
        entryUrl: null,
        needLogin: false,
    },
};

