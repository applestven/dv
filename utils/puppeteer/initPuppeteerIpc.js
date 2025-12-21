// const { ipcMain } = require('electron');
// const { downloadVideoCommon } = require('./downloadVideo');
// const { getVideoPath } = require('../common');
// const initPuppeteerIpc = () => {
//   ipcMain.handle('downloadVideoCommon', (event, url, args) => {
//     // return console.log("到位", url)
//     const { downloadPath } = args || [];
//     return downloadVideoCommon({ sourceUrl: url, downloadPath: downloadPath || getVideoPath() });
//   });
// };
// module.exports = { initPuppeteerIpc };
