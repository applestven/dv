const axios = require('axios');
const path = require('path');
const fs = require('fs');
// 数组批量文件下载 返回下载文件名数组 // 可以提高下载效率，但要小心处理并发请求带来的潜在问题，如带宽和服务器的并发限制
// 流式下载
const downloadArray = async ({ videoUrlList, downloadPath }) => {
  // console.log("开始下载视频", videoUrlList);
  let downloadPromises = [];
  let downloadFileName = [];
  for (let videoUrl of videoUrlList) {
    downloadPromises.push(
      (async () => {
        try {
          // console.log("@@正在下载", videoUrl);
          const response = await axios.get(videoUrl.url, {
            headers: { ...videoUrl.headers },
            responseType: 'stream',
          });

          if (response.status === 200) {
            let folderName = path.join(downloadPath);
            if (!fs.existsSync(folderName)) {
              fs.mkdirSync(folderName, { recursive: true });
            }

            let fileName = `${new Date().toISOString().replace(/:/g, '-')}.mp4`;
            let filePath = path.join(folderName, fileName);

            // 使用 Promise 封装写入过程
            const writeStream = new Promise((resolve, reject) => {
              const writer = fs.createWriteStream(filePath);
              response.data.pipe(writer);
              writer.on('finish', resolve);
              writer.on('error', reject);
            });

            await writeStream;

            console.log('下载视频成功:', filePath);
            downloadFileName.push(fileName);
          }
        } catch (error) {
          console.error('请求视频流时发生错误，查看下载列表videoUrlList参数',"数量：",videoUrlList.length, videoUrlList);
          // console.log("error", error)
        }
      })()
    );
  }

  await Promise.all(downloadPromises);

  return downloadFileName;
};

module.exports = {
  downloadArray,
};
