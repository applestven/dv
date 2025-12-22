// B 站策略（更宽松）
// downloader/platforms/bilibili.js
const { runYtDlp } = require('../ytDlpRunner');
const { buildYtDlpArgs } = require('../ytDlpArgsBuilder');

async function download({ url, quality, outputDir, cookies }) {
  const args = buildYtDlpArgs({
    platform: 'bilibili',
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
