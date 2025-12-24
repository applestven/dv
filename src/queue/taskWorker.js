const queue = require('./taskQueue');
const { updateTask } = require('../store/taskStore');
const { chooseStrategy } = require('../resolver/strategyRouter');

function submitTask(task) {
  queue.add(async () => {
    try {
      updateTask(task.id, {
        status: 'running',
        startedAt: Date.now(),
      });
      console.log("@@queue.add task", task)
      const strategy = chooseStrategy(task.url);
      console.log("@@taskWorker strategy", strategy)
      const result = await strategy(task);
      const { path: outputPath, strategyName } = result;
      console.log("@@queue.add result", result)
      console.log("@@queue.add outputPath", outputPath)
      updateTask(task.id, {
        status: 'success',
        finishedAt: Date.now(),
        strategy: strategyName ? strategyName : strategy.name, // 有strategyName 说明调用了其他策略 
        ...(outputPath
          ? {
            output: outputPath,
            outputName: require('path').basename(outputPath),
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
