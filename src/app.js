// src/app.js
require('dotenv').config(); // 在文件开头加载环境变量

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initConnection, testConnection } = require('./database/mysqlConnection');
const { initializeTaskTable } = require('./store/taskStore');

const app = express();

// 中间件
app.use(cors()); // 启用 CORS
app.use(express.json());
// 添加静态文件服务，将downloads文件夹提供静态访问 - 使用绝对路径
const downloadsPath = path.join(__dirname, '../downloads');
app.use('/downloads', express.static(downloadsPath));

// 初始化数据库连接
async function initializeDatabase() {
    try {
        initConnection();
        const isConnected = await testConnection();
        if (isConnected) {
            await initializeTaskTable();
            console.log('Database initialized successfully');
        } else {
            console.error('Failed to connect to database');
        }
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// API路由
app.use('/', require('./api/download.routes'));

// 初始化数据库
initializeDatabase();

module.exports = app;