// Douyin 策略（核心）
// downloader/platforms/douyin.js
const { runYtDlp } = require('../ytDlpRunner');
const { buildYtDlpArgs } = require('../ytDlpArgsBuilder');

async function download({ url, quality, outputDir, cookies }) {
  const args = buildYtDlpArgs({
    platform: 'douyin',
    quality,
    outputDir,
    suffix: quality,
  });

  return runYtDlp({
    url,
    cookies,
    outputDir,
    extraArgs: args,
  });
}

module.exports = { download };
