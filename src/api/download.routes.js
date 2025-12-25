const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, getTask, getAllTasks } = require('../store/taskStore');
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
  const { url, quality = 'video_bestest' } = req.body;

  const task = await createTask({
    id: uuid(),
    url,
    quality,
    status: 'pending',
    createdAt: Date.now(),
    location: process.env.ZEROTIER_API_URL || 'local'
  });

  await submitTask(task);

  res.json({ taskId: task.id });
});

router.get('/task/:id', async (req, res) => {
  const task = await getTask(req.params.id);
  res.json(task);
});

module.exports = router;