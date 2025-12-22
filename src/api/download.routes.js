// api/download.routes.js
const { v4: uuid } = require('uuid');
const { createTask, getTask } = require('../store/taskStore');
const { submitTask } = require('../queue/taskWorker');

app.post('/download', (req, res) => {
    const { url } = req.body;

    const task = createTask({
        id: uuid(),
        url,
        status: 'pending',
        createdAt: Date.now(),
    });

    submitTask(task, strategies);

    res.json({ taskId: task.id });
});

app.get('/task/:id', (req, res) => {
    res.json(getTask(req.params.id));
});
