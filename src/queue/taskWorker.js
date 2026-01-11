const queue = require('./taskQueue');
const { updateTask } = require('../store/taskStore');
const { chooseStrategy } = require('../resolver/strategyRouter');
const fs = require('fs').promises;
const path = require('path');

function submitTask(task) {
  queue.add(async () => {
    try {
      await updateTask(task.id, {
        status: 'running',
        startedAt: Date.now(),
      });
      console.log("@@queue.add task", task)
      const strategy = chooseStrategy(task.url);
      console.log("@@taskWorker strategy", strategy)
      const result = await strategy(task);
      let { path: outputPath, strategyName } = result;
      if (typeof result === 'string') outputPath = result;
      console.log("@@queue.add result", result, typeof result)
      console.log("@@queue.add outputPath", outputPath)
      
      // 如果有输出路径，则获取文件大小
      let size = null;
      if (outputPath) {
        try {
          const stats = await fs.stat(outputPath);
          size = stats.size;
        } catch (error) {
          console.error('获取文件大小失败:', error.message);
        }
      }
      
      await updateTask(task.id, {
        status: result.status ? result.status : 'success',
        finishedAt: Date.now(),
        strategy: strategyName ? strategyName : strategy.name, // 有strategyName 说明调用了其他策略 
        size: size, // 添加文件大小信息
        ...(outputPath
          ? {
            output: outputPath,
            outputName: path.basename(outputPath),
          }
          : {}),
      });
    } catch (e) {
      console.error('❌ task failed:', e);
      console.error('❌ stack:', e.stack);
      updateTask(task.id, {
        status: 'failed',
        error: e.message,
        finishedAt: Date.now(),
      });
    }
  });
}

module.exports = { submitTask };