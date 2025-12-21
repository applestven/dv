// import { ipcMain } from 'electron'
// import { deleteFilesAndFolders } from "./index.js"

// 修改为require引入
const { ipcMain, app } = require('electron');
const { deleteFilesAndFolders, getPermission, joinPath } = require('./index.js');
const store = require('../store/index.js');

const initSystem = () => {
  ipcMain.on('deleteFilesAndFolders', (event, arg) => {
    // 遍历删除 数组中每一项文件 或者文件夹
    return deleteFilesAndFolders(arg);
  });
  ipcMain.on('getPermission', async (event, arg) => {
    return await getPermission(arg);
  });
  ipcMain.on('freshPermission', async () => {
    store.set('permission', await getPermission());
  });
  ipcMain.handle('joinPath', async (event, ...args) => {
    return joinPath(...args);
  });
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion(); // 获取 package.json 的 version 字段
  });
  ipcMain.handle('quit-app', (event, force) => {
    if (force) {
      app.exit(0); // 强制退出
    } else {
      app.quit(); // 正常退出
    }
  });
  // 判断当前系统为
  ipcMain.handle('get-system-type', () => {
    return process.platform;
  });

  // 打开外部链接
  ipcMain.handle('open-external', async (event, url) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });
};

module.exports = {
  initSystem,
};
