// resolver/strategies/puppeteer.strategy.js
// 只在 yt-dlp 失败后调用

const { downloadVideoCommon } = require('../../../plugin/puppeteer/downloadVideo.js');
const { deleteFilesAndFolders } = require('../../../plugin/system/index.js');
const { extractAudio } = require('../../../plugin/ffmpeg/index.js');
const { updateTask } = require('../../store/taskStore.js');

module.exports = async function puppeteerStrategy(task) {
    console.log("@@strategies/puppeteer task", task)
    // 你自己原来的 puppeteer 下载逻辑
    const result = await downloadVideoCommon({ sourceUrl: task.url, downloadPath: task.downloadPath || './downloads', quality: task.quality });
    console.log("@@puppeteerStrategy result", result)
    // 判断task.quality 是否包含audio  包含即使用ffmpeg 提取出 音频 返回到结果中 并删除原视频
    // 更新任务 
    if (result.code === 0) {
        return await updateTask(task.id, {
            status: 'failed',
            error: result.msg || 'puppeteer下载错误',
            finishedAt: Date.now(),
        });
    }

    if (task.quality.includes('audio')) {
        console.log("@@需要提取音频", result.path);
        const audioPath = await extractAudio(result.path);
        deleteFilesAndFolders([result.path]);
        return { strategyName: 'puppeteerStrategy', ...result, path: audioPath };
    }

    return { strategyName: 'puppeteerStrategy', ...result };
};
