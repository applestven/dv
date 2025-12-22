// queue/taskWorker.js
const queue = require('./taskQueue');
const { updateTask } = require('../store/taskStore');
const { chooseStrategy } = require('../resolver/strategyRouter');

function submitTask(task, strategies) {
    queue.add(async () => {
        try {
            updateTask(task.id, { status: 'running' });

            const { strategy } = chooseStrategy(task.url);
            await strategies[strategy](task);

            updateTask(task.id, { status: 'success' });
        } catch (e) {
            updateTask(task.id, {
                status: 'failed',
                error: e.message,
            });
        }
    });
}

module.exports = { submitTask };
