const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, getTask, getAllTasks, queryTasks } = require('../store/taskStore');

const { submitTask } = require('../queue/taskWorker');
const { path } = require('path')
// 尝试加载 .env 文件
// require('dotenv').config({
//   path: path.resolve(process.cwd(), '.env')
// });


const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Hello World',
  });
});

// 测试连接接口，返回当前正在执行的任务列表
router.get('/c', async (req, res) => {
  try {
    const runningTasks = await getAllTasks('running', 1, 100); // 获取状态为 'running' 的任务，第1页，最多100条
    res.json({
      message: 'Connection test successful',
      runningTasks: runningTasks,
      total: runningTasks.length
    });
  } catch (error) {
    console.error('Error fetching running tasks:', error);
    res.status(500).json({
      message: 'Error fetching running tasks',
      error: error.message
    });
  }
});

router.post('/download', async (req, res) => {
  const { url, quality: rawQuality } = req.body;
  // 允许的quality列表
  const allowedQualities = [
    'video_best', 'video_worst', 'audio_best', 'audio_worst',
    'video-best', 'video-worst', 'audio-best', 'audio-low'
  ];
  let quality = rawQuality || 'video_best';
  // 兼容下划线和中横线
  quality = quality.replace(/-/g, '_');
  if (!allowedQualities.includes(quality) && !allowedQualities.includes(quality.replace(/_/g, '-'))) {
    quality = 'video_best';
  }
  if (!process.env.ZEROTIER_API_URL) {

    return res.status(500).json({
      message: 'Error: ZEROTIER_API_URL is not set'
    });
  }

  const task = await createTask({
    id: uuid(),
    url,
    quality,
    status: 'pending',
    createdAt: Date.now(),
    location: process.env.ZEROTIER_API_URL
  });

  await submitTask(task);

  res.json({ taskId: task.id });
});

router.get('/task/:id', async (req, res) => {
  const task = await getTask(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  // 拼接总路径
  const port = process.env.PORT || 3000;
  let baseUrl = task.location + (port == 80 || port == 443 ? '' : ':' + port);
  let fullPath = task.output ? (baseUrl + '/downloads/' + task.outputName) : null;
  res.json({
    ...task,
    fullPath
  });
});


// 多条件查询任务接口
router.post('/tasks/query', async (req, res) => {
  /**
   * 支持 body 传递 filters, page, limit
   * filters: { id, url, quality, status, location, error, createdAt, startedAt, finishedAt, strategy, output, outputName }
   * 字段可为单值、数组（in）、或范围对象（如 {min, max}）
   */
  try {
    const { filters = {}, page = 1, limit = 20 } = req.body || {};
    const tasks = await queryTasks(filters, page, limit);
    // 为每个任务添加fullPath字段
    const port = process.env.PORT || 3000;
    let baseUrl = req.protocol + '://' + req.hostname + (port == 80 || port == 443 ? '' : ':' + port);
    const tasksWithFullPath = tasks.map(task => ({
      ...task,
      fullPath: task.output ? (baseUrl + '/downloads/' + encodeURIComponent(task.output)) : null
    }));
    res.json({
      code: 0,
      data: tasksWithFullPath,
      message: 'success',
    });
  } catch (err) {
    res.status(500).json({
      code: 1,
      message: err.message,
    });
  }
});

module.exports = router;