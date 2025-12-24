const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, getTask } = require('../store/taskStore');
const { submitTask } = require('../queue/taskWorker');

const router = express.Router();

router.post('/download', (req, res) => {
  const { url, quality = 'video_bestest' } = req.body;

  const task = createTask({
    id: uuid(),
    url,
    quality,
    status: 'pending',
    createdAt: Date.now(),
  });

  submitTask(task);

  res.json({ taskId: task.id });
});

router.get('/task/:id', (req, res) => {
  res.json(getTask(req.params.id));
});

module.exports = router;
