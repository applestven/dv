const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const { store } = require('../../store/index.js');
// const debug = store.get('debug');
let debug = true; // TODO: 临时注释掉
const path = require('path');
puppeteer.use(StealthPlugin());
// const { downloadLog } = require('../log/index.js');
// const { app } = require('electron');
const USER_AGENTS = [
  // Chrome
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/B08C390',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.81 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36',
  // Firefox
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:54.0) Gecko/20100101 Firefox/54.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:53.0) Gecko/20100101 Firefox/53.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:52.0) Gecko/20100101 Firefox/52.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:51.0) Gecko/20100101 Firefox/51.0',
  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Safari/602.1.50',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/601.7.7 (KHTML, like Gecko) Version/9.1.2 Safari/601.7.7',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/601.7.8 (KHTML, like Gecko) Version/9.1.3 Safari/601.7.8',
  // IE
  'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
  'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Trident/7.0; AS; rv:11.0) like Gecko',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; Trident/7.0; rv:11.0) like Gecko',
  // Opera
  'Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14',
  'Opera/9.80 (Windows NT 5.1) Presto/2.12.388 Version/12.14',
  'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.14',
  'Opera/9.80 (Windows NT 6.1; Win64; x64) Presto/2.12.388 Version/12.14',
];

async function enhanceStealth(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const ctx = getContext.apply(this, args);
      if (args[0] === '2d') {
        const getImageData = ctx.getImageData;
        ctx.getImageData = function (...imageArgs) {
          const imageData = getImageData.apply(this, imageArgs);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i + 0] ^= 0x01;
            imageData.data[i + 1] ^= 0x01;
            imageData.data[i + 2] ^= 0x01;
          }
          return imageData;
        };
      }
      return ctx;
    };
  });
}

// 启动浏览器
async function launchBrowser(options = {}) {
  const { user_agent, proxy, mainWindow } = options;

  // let executablePath;
  // if (debug) {
  //   const executablePath = path.join("C:/Users/applestven/.cache/puppeteer/chrome/win64-138.0.7204.92/chrome-win64", 'chrome.exe');
  // }

  let executablePath = path.join(
    // process.cwd(), // 用当前工作目录代替app.getAppPath()
    process.cwd(),
    '..',
    'puppeteer',
    'chrome',
    `win64-138.0.7204.92`,
    'chrome-win64',
    'chrome.exe'
  );
  // downloadLog.info("executablePath", executablePath)

  const browser = await puppeteer.launch({
    defaultViewport: { width: 1308, height: 906 },
    // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    timeout: 10800000,
    protocolTimeout: 10800000,
    headless: true,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--disable-features=site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--incognito',
      `--user-agent=${user_agent || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]}`,
      proxy ? `--proxy-server=${proxy}` : '',
    ],
    // if debug 去掉 executablePath  否则 executablePath：executablePath
    // executablePath: debug ? undefined : executablePath,
  });

  // console.log("输出 Chromium 路径", browser.executablePath); // 输出 Chromium 路径
  // ✅ 正确获取浏览器路径
  // console.log("浏览器路径:", browser.process().executablePath);

  const pages = await browser.pages();
  if (pages.length > 0) {
    await enhanceStealth(pages[0]);
  }

  if (proxy) {
    await switchProxy(browser, proxy);
  }

  return browser;
}

// 切换代理
async function switchProxy(browser, proxy) {
  const pages = await browser.pages();
  const promises = pages.map((page) =>
    page.setExtraHTTPHeaders({
      'Proxy-Switch-Ip': 'yes',
    })
  );
  await Promise.all(promises);
  await browser.close();
  const newBrowser = await launchBrowser({ proxy });
  return newBrowser;
}

module.exports = {
  launchBrowser,
  switchProxy,
};
