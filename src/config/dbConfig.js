const path = require('path');

// 尝试加载 .env 文件
require('dotenv').config({
  path: path.resolve(process.cwd(), '.env')
});

// MySQL数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456', // 修改为默认密码
  database: process.env.DB_NAME || 'dv_task_db',
  port: process.env.DB_PORT || 3306,
  // 连接池配置
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  // 其他配置
  connectTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // MySQL特定配置
  charset: 'utf8mb4',
  timezone: '+08:00', // 设置时区
  // 重连配置
  reconnect: true,
};

module.exports = dbConfig;