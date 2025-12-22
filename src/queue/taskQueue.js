// src/queue/taskQueue.js
const PQueue = require('p-queue').default;

const queue = new PQueue({
    concurrency: 2,   // Windows 推荐 ≤ 2
    intervalCap: 3,
    interval: 1000,
});

module.exports = queue;
