const queue = require('./taskQueue');
const { updateTask } = require('../store/taskStore');
const { chooseStrategy } = require('../resolver/strategyRouter');

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
      await updateTask(task.id, {
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
