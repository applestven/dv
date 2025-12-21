const fs = require('fs');
const path = require('path');
// const { store } = require('../../store/index.js');
const { machineIdSync } = require('node-machine-id');
const { v4: uuidv4 } = require('uuid');
// const { app } = require('electron');


// 获取持久化的机器码
function getOrCreateDeviceId() {
  // const userDataPath = app.getPath('userData');
  // const idFilePath = path.join(userDataPath, 'device-id.txt');

  // 如果文件已存在，读取
  // if (fs.existsSync(idFilePath)) {
  //   return fs.readFileSync(idFilePath, 'utf8');
  // }

  // let id;

  try {
    // 尝试获取机器码
    id = machineIdSync({ original: true });
  } catch (e) {
    // 如果失败，使用 UUID
    id = uuidv4();
  }

  // 写入文件
  fs.writeFileSync(idFilePath, id, 'utf8');
  return id;
}

// 遍历删除 数组中每一项文件 或者文件夹
function deleteFilesAndFolders(arr) {
  arr.forEach((item) => {
    const fullPath = path.resolve(item); // 解析路径，确保路径是绝对的

    try {
      // 检查是文件还是文件夹
      if (fs.lstatSync(fullPath).isDirectory()) {
        // 如果是文件夹，则递归删除
        fs.rmdirSync(fullPath, { recursive: true });
        console.log(`Deleted directory: ${fullPath}`);
      } else {
        // 如果是文件，则直接删除
        fs.unlinkSync(fullPath);
        console.log(`Deleted file: ${fullPath}`);
      }
    } catch (err) {
      // 如果发生错误（例如，文件或文件夹不存在），则打印错误消息
      console.error(`Error deleting ${fullPath}:`, err);
    }
  });
}
// 写一个path.join函数，用于拼接路径
function joinPath(...paths) {
  const path = require('path');
  return path.join(...paths);
}

module.exports = { deleteFilesAndFolders, getOrCreateDeviceId, joinPath };
