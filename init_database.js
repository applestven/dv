// init_database.js
// 数据库初始化脚本
require('dotenv').config(); // 在文件开头加载环境变量

const { initConnection, testConnection } = require('./src/database/mysqlConnection');
const { initializeTaskTable } = require('./src/store/taskStore');

async function initDatabase() {
  console.log('Initializing database...');
  
  try {
    // 初始化数据库连接
    initConnection();
    console.log('Database connection initialized');
    
    // 测试连接
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('Cannot connect to database, exiting...');
      console.log('\n请检查:');
      console.log('1. MySQL服务是否已启动');
      console.log('2. 数据库配置是否正确 (src/config/dbConfig.js 或 .env 文件)');
      console.log('3. 数据库用户是否有足够权限');
      console.log('4. 数据库 dv_task_db 是否已创建');
      process.exit(1);
    }
    
    // 初始化任务表
    await initializeTaskTable();
    console.log('Database initialization completed successfully');
    
    // 退出进程
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// 执行初始化
initDatabase();