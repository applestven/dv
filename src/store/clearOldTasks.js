// 定时清理超过半个月的任务及其相关下载文件
const path = require('path');
const fs = require('fs');
const { queryTasks, updateTask } = require('./taskStore');

const DOWNLOAD_DIR = path.resolve(__dirname, '../../downloads');
const HALF_MONTH_MS = 1000 * 60 * 60 * 24 * 15;

async function clearOldTasksAndFiles() {
    const now = Date.now();
    // 查询所有超过半个月的任务
    const oldTasks = await queryTasks({ createdAt: { max: now - HALF_MONTH_MS } }, 1, 1000);
    for (const task of oldTasks) {
        // 删除下载文件
        if (task.location) {
            const filePath = path.isAbsolute(task.location)
                ? task.location
                : path.join(DOWNLOAD_DIR, task.location);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log('已删除文件:', filePath);
                }
            } catch (e) {
                console.warn('删除文件失败:', filePath, e.message);
            }
        }
        // 更新任务状态为过期
        try {
            await updateTask(task.id, { status: 'expired' });
            console.log('任务状态已更新为过期:', task.id);
        } catch (e) {
            console.warn('更新任务状态失败:', task.id, e.message);
        }
    }
    console.log(`清理完成，已处理${oldTasks.length}个任务。`);
}

// 每天凌晨2点执行
function scheduleClear() {
    const now = new Date();
    const next2am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 2, 0, 0, 0);
    if (now > next2am) next2am.setDate(next2am.getDate() + 1);
    const msTo2am = next2am - now;
    setTimeout(() => {
        clearOldTasksAndFiles();
        setInterval(clearOldTasksAndFiles, 24 * 60 * 60 * 1000);
    }, msTo2am);
}

module.exports = { clearOldTasksAndFiles, scheduleClear };
