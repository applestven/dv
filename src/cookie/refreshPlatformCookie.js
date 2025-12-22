const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { writeFileSync } = require('fs');
const { launchBrowser } = require('../../plugin/puppeteer/useAgent');

async function refreshPlatformCookie({ url, cookiePath }) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
    });

    // 抖音接口需要时间触发
    await page.waitForTimeout(10000);

    const cookies = await page.cookies();
    await saveCookies(cookiePath, cookies);

    await browser.close();
}

module.exports = { refreshPlatformCookie };
