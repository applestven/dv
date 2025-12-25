#!/usr/bin/env node

const axios = require('axios');

// ================== 固定配置 ==================
const BASE_URL = 'http://127.0.0.1:3456';

const URLS = [
    'https://www.bilibili.com/video/BV1o4B4BAEbu/?spm_id_from=333.1007.tianma.4-4-14.click&vd_source=0c88b82560db687e3ba0427782c655e3',
    'https://www.youtube.com/watch?v=mQ66XTCeVP4',
    'https://v.douyin.com/XZVpfWQaPLE/'
];

const INTERVAL = 1000; // 轮询间隔(ms)，不需要就改成 0

const QUALITY_LIST = [
    'video_best',
    'audio_best',
    'video_worst',
    'audio_worst',
];

// ================== 工具函数 ==================
function randomQuality() {
    return QUALITY_LIST[Math.floor(Math.random() * QUALITY_LIST.length)];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ================== 核心逻辑 ==================
async function startDownload(url) {
    const quality = randomQuality();

    console.log(`🚀 发起下载: ${url} | quality=${quality}`);

    const { data } = await axios.post(`${BASE_URL}/download`, {
        url,
        quality,
    });

    return data.taskId;
}

async function pollTask(taskId) {
    while (true) {
        const { data } = await axios.get(`${BASE_URL}/task/${taskId}`);

        console.log(`🔄 任务 ${taskId} 状态: ${data.status}`);

        if (data.status === 'success') {
            console.log(`✅ 任务完成: ${taskId}`);
            return data;
        }

        if (INTERVAL > 0) {
            await sleep(INTERVAL);
        }
    }
}

async function runSingle(url) {
    try {
        const taskId = await startDownload(url);
        const result = await pollTask(taskId);
        return result;
    } catch (err) {
        // console.error(`❌ URL 失败: ${url}`, err.message);
        throw err;
    }
}

// ================== 并发执行 ==================
async function main() {
    console.log(`🔥 并发任务数: ${URLS.length}`);
    console.log(`⏱ 轮询间隔: ${INTERVAL}ms`);
    console.log('==============================');

    const tasks = URLS.map(url => runSingle(url));

    await Promise.all(tasks);

    console.log('==============================');
    console.log('🎉 所有任务执行完成');
}

main();
