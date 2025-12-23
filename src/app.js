// src/app.js
const express = require('express');
const { v4: uuid } = require('uuid');
const { createTask, updateTask, getTask } = require('./store/taskStore');
const { runYtDlp } = require('./downloader/ytDlpRunner');
const { runPuppeteerDownload } = require('./downloader/runPuppeteerDownload');
const app = express();
app.use(express.json());

app.post('/download', async (req, res) => {
    const { url, quality = 'video_bestest' } = req.body;
    const id = uuid();

    createTask({
        id,
        url,
        status: 'running',
        engine: 'yt-dlp',
    });

    runYtDlp({ quality, url, id })
        .then(() => updateTask(id, { status: 'success', engine: 'yt-dlp', }))
        .catch(async (err) => {
            console.error('[download failed]', err.message);

            // ⭐⭐⭐ 关键兜底逻辑 ⭐⭐⭐
            if (err.canFallback) {
                try {
                    updateTask(id, {
                        status: 'fallback',
                        engine: 'puppeteer',
                        error: err.message,
                    });

                    // 👉 走你已经跑通的 puppeteer 方案
                    await runPuppeteerDownload(url, {
                        taskId: id,
                    });

                    updateTask(id, {
                        status: 'success',
                        engine: 'puppeteer',
                    });

                } catch (puppeteerErr) {
                    updateTask(id, {
                        status: 'failed',
                        engine: 'puppeteer',
                        error: puppeteerErr.message,
                    });
                }
            } else {
                // ❌ 不支持兜底的失败
                updateTask(id, {
                    status: 'failed',
                    engine: 'yt-dlp',
                    error: err.message,
                });
            }
        });

    res.json({ taskId: id });
});

app.get('/task/:id', (req, res) => {
    res.json(getTask(req.params.id));
});

module.exports = app;
