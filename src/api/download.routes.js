const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, getTask } = require('../store/taskStore');
const { submitTask } = require('../queue/taskWorker');

const router = express.Router();

router.post('/download', async (req, res) => {
  const { url, quality = 'video_bestest' } = req.body;

  const task = await createTask({
    id: uuid(),
    url,
    quality,
    status: 'pending',
    createdAt: Date.now(),
  });

  await submitTask(task);

  res.json({ taskId: task.id });
});

router.get('/task/:id', async (req, res) => {
  const task = await getTask(req.params.id);
  res.json(task);
});

module.exports = router;
