const { keywordType, mockVideoList, filterResponse } = require('./config');
const axios = require('axios');
const { delay } = require('../common');
const path = require('path');
const fs = require('fs');
const { downloadArray } = require('./downloadArray');
const { launchBrowser } = require('./useAgent');
const { mergeAudioVideo, reEncodeH264Video } = require('../ffmpeg/index.js');
const { deleteFilesAndFolders } = require('../system/index');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);
// const { downloadLog } = require('../log/index.js');
// const { store } = require('../store/index.js');
// const debug = store.get('debug');

const _downloadVideoCommonCore = async ({ sourceUrl, downloadPath = './file', retry = false }) => {
  if (retry) {
    // downloadLog.info('⚠️正在重试流程');
    await delay(3000);
  }
  console.log("sourceUrl", sourceUrl)
  sourceUrl = sourceUrl || mockVideoList[2]['西瓜视频'][0];
  if (!sourceUrl) return console.log('sourceUrl不能为空');

  const browser = await launchBrowser({
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
  });

  try {
    let videoLink = '';
    let currentAttribute = {};
    let downloadUrl = [];

    const regex = /(http|https):\/\/[^\s]+/;
    const match = sourceUrl.match(regex);
    match && (videoLink = match[0]);

    for (let key in keywordType) {
      if (videoLink.includes(key)) {
        currentAttribute = keywordType[key];
        // if (debug) {
        //   downloadLog.info('匹配到的下载规则: ' + JSON.stringify(currentAttribute));
        // }
      }
    }

    const sliceDownload = async (currentAttribute, browser, videoLink) => {
      // console.log('使用分片下载');

      const page = await browser.newPage();
      // downloadLog.info('访问视频页面: ' + videoLink);
      await page.goto(videoLink, { timeout: 60000, waitUntil: 'networkidle2' });

      let requestsHeader = {};
      page.on('request', (request) => {
        requestsHeader[request.url()] = request.headers();
      });
      downloadUrl = await filterResponse(
        page,
        currentAttribute.rule.audio,
        currentAttribute.rule.video,
        requestsHeader,
        downloadUrl,
        currentAttribute.audioMode
      );

      let result = await downloadArray({
        videoUrlList: downloadUrl,
        downloadPath: path.join(downloadPath, './file'),
      });

      if (result.length === 2) {
        console.log('正在进行文件音视频合并');
        // downloadLog.info('正在进行文件音视频合并');
        let fileName = `${new Date().toISOString().replace(/:/g, '-')}.mp4`;
        const outPath = await mergeAudioVideo(
          path.join(downloadPath, './file', result[0]),
          path.join(downloadPath, './file', result[1]),
          path.join(downloadPath, './file', fileName)
        );

        console.log('正在进行转码 h264');
        // downloadLog.info('正在进行转码 h264');
        let finallyPath = await reEncodeH264Video(
          outPath,
          path.join(downloadPath, './file', 'h264' + fileName)
        );

        deleteFilesAndFolders([
          path.join(downloadPath, './file', result[0]),
          path.join(downloadPath, './file', result[1]),
          outPath,
        ]);

        // downloadLog.info('下载完成：', finallyPath);
        return finallyPath;

      } else {
        return path.join(downloadPath, './file', result[0]);
      }
    };

    const getVideoUrl = async (page, currentAttribute) => {
      return await page.evaluate((attr) => {
        let tempList = [];
        if (attr.tag === 'source') {
          document.querySelectorAll('video > source').forEach(node => {
            const src = node.getAttribute('src');
            if (src) tempList.push(src);
          });
        } else {
          const video = document.querySelector('video')?.getAttribute('src');
          if (video) tempList.push(video);
        }
        return tempList;
      }, currentAttribute);
    };

    const fullDownload = async (currentAttribute, browser, videoLink) => {
      // downloadLog.info('访问视频页面: ' + videoLink);
      const page = await browser.newPage();
      await page.goto(videoLink, { timeout: 30000, waitUntil: 'networkidle2' });

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });

      await page.waitForSelector('video');
      let videoUrlList = await getVideoUrl(page, currentAttribute);
      if (videoUrlList.length === 0) {
        console.log('第一次未获取到视频，等待 5s 重试');
        await delay(5000);
        videoUrlList = await getVideoUrl(page, currentAttribute);
      }

      if (videoUrlList.length > 0) {
        let videoTitle = await page.evaluate(() => document.querySelector('h1')?.textContent || '无标题');
        // downloadLog.info('正在下载视频：' + videoTitle);
      }

      videoUrlList = [videoUrlList[0]];

      for (let videoUrl of videoUrlList) {
        try {
          const headers = {
            'User-Agent': 'Mozilla/5.0 ...',
            Referer: 'https://www.douyin.com/',
            Accept: '*/*',
            'Accept-Encoding': 'identity',
            Connection: 'keep-alive',
          };

          const response = await axios.get(videoUrl, {
            headers,
            responseType: 'stream',
            timeout: 60000,
          });

          if (!/video\/|octet-stream/i.test(response.headers['content-type'])) {
            throw new Error('响应内容不是视频类型');
          }

          const folderName = path.join(downloadPath, 'file');
          if (!fs.existsSync(folderName)) {
            fs.mkdirSync(folderName, { recursive: true });
          }

          const fileName = `${new Date().toISOString().replace(/:/g, '-')}.mp4`;
          const filePath = path.join(folderName, fileName);
          const writer = fs.createWriteStream(filePath);
          await pipelineAsync(response.data, writer);

          // downloadLog.info('下载完成: ' + filePath);
          return filePath;
        } catch (err) {
          // downloadLog.error('整片下载失败: ' + err);
          throw err;
        }
      }
    };

    if (currentAttribute.downloadType === 'SLICE') {
      return await sliceDownload(currentAttribute, browser, videoLink);
    } else if (currentAttribute.downloadType === 'FULL') {
      return await fullDownload(currentAttribute, browser, videoLink);
    } else {
      if (sourceUrl.includes('blob')) {
        return await sliceDownload(currentAttribute, browser, videoLink);
      } else {
        return await fullDownload(currentAttribute, browser, videoLink);
      }
    }

  } catch (error) {
    // downloadLog.error('下载流程发生错误: ' + error);
    throw error;
  } finally {
    console.log('关闭浏览器');
    await browser.close();
  }
};

const downloadVideoCommon = async ({ sourceUrl, downloadPath = './downloads' }) => {
  try {
    const result = await _downloadVideoCommonCore({ sourceUrl, downloadPath });
    return {
      code: 1,
      msg: '下载成功',
      path: result
    };
  } catch (firstError) {
    console.warn('第一次尝试失败，准备重试一次...', firstError);
    // downloadLog.warn('第一次尝试失败，准备重试一次: ' + firstError);

    try {
      const result = await _downloadVideoCommonCore({ sourceUrl, downloadPath, retry: true });
      return {
        code: 1,
        msg: '下载成功（重试）',
        path: result
      };
    } catch (secondError) {
      const errMsg = '网络不佳，请稍后重试。原始错误：' + (secondError.message || String(secondError));
      // downloadLog.error(errMsg);
      console.error(' 下载失败', errMsg);
      return {
        code: 0,
        msg: '网络不佳，请稍后重试',
        error: secondError.message || String(secondError),
      };
    }
  }
};

module.exports = { downloadVideoCommon };
