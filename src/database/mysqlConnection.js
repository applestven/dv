const mysql = require('mysql2/promise');
const dbConfig = require('../config/dbConfig');

let pool = null;

function initConnection() {
  // 设置连接池配置
  const config = {
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    port: dbConfig.port,
    // 连接超时配置
    connectTimeout: dbConfig.connectTimeout,
    timeout: dbConfig.timeout,
    // 连接池配置
    connectionLimit: dbConfig.connectionLimit,
    acquireTimeout: dbConfig.acquireTimeout,
    queueLimit: dbConfig.queueLimit,
    // 保持连接
    enableKeepAlive: dbConfig.enableKeepAlive,
    keepAliveInitialDelay: dbConfig.keepAliveInitialDelay,
    // MySQL特定配置
    charset: dbConfig.charset,
    timezone: dbConfig.timezone,
    // 重连配置
    reconnect: dbConfig.reconnect,
    // 其他配置
    multipleStatements: true, // 允许执行多条语句
    insecureAuth: true, // 允许旧身份验证协议
  };

  pool = mysql.createPool(config);
  return pool;
}

function getConnection() {
  if (!pool) {
    initConnection();
  }
  return pool;
}

async function testConnection() {
  try {
    const connection = await getConnection();
    await connection.execute('SELECT 1');
    console.log('MySQL connection successful');
    return true;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    // 提供更具体的错误信息
    if (error.code === 'ECONNREFUSED') {
      console.error('错误: 无法连接到MySQL服务器，请确认MySQL服务已启动');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('错误: MySQL用户名或密码错误');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('错误: 数据库不存在，请先创建数据库');
    } else {
      console.error('其他数据库错误:', error.message);
    }
    return false;
  }
}

module.exports = {
  initConnection,
  getConnection,
  testConnection
};