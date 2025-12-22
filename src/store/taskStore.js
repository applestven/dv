// src/store/taskStore.js
const tasks = new Map();

function createTask(task) {
    tasks.set(task.id, task);
    return task;
}

function updateTask(id, patch) {
    Object.assign(tasks.get(id), patch);
}

function getTask(id) {
    return tasks.get(id);
}

module.exports = { createTask, updateTask, getTask };
