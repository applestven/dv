const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, getTask } = require('../store/taskStore');
const { submitTask } = require('../queue/taskWorker');
const { path } = require('path')
// 尝试加载 .env 文件
// require('dotenv').config({
//   path: path.resolve(process.cwd(), '.env')
// });


const router = express.Router();

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
