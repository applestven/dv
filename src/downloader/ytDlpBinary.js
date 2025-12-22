// src/downloader/ytDlpBinary.js
const os = require('os');
const path = require('path');
const fs = require('fs');

function resolveYtDlpPath() {
  // 1️⃣ 显式指定（最优先，方便部署）
  if (process.env.YT_DLP_PATH) {
    return process.env.YT_DLP_PATH;
  }

  const platform = os.platform();

  // 2️⃣ Windows
  if (platform === 'win32') {
    const winPath = path.join(process.cwd(), 'bin', 'yt-dlp.exe');
    if (fs.existsSync(winPath)) return winPath;
  }

  // 3️⃣ macOS / Linux 本地 bin
  const unixPath = path.join(process.cwd(), 'bin', 'yt-dlp');
  if (fs.existsSync(unixPath)) return unixPath;

  // 4️⃣ 系统环境（brew / apt / yum）
  return 'yt-dlp';
}

module.exports = {
  resolveYtDlpPath,
};
