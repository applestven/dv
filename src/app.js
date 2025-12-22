// src/app.js
const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, updateTask, getTask } = require('./store/taskStore');
const { runYtDlp } = require('./downloader/ytDlpRunner');

const app = express();
app.use(express.json());

app.post('/download', async (req, res) => {
    const { url, quality = 'best' } = req.body;
    const id = uuid();

    createTask({
        id,
        url,
        status: 'running',
    });

    runYtDlp({ quality, url, id })
        .then(() => updateTask(id, { status: 'success' }))
        .catch((e) =>
            updateTask(id, { status: 'failed', error: e.message })
        );

    res.json({ taskId: id });
});

app.get('/task/:id', (req, res) => {
    res.json(getTask(req.params.id));
});

module.exports = app;
