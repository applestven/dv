/**
 * 数据库迁移脚本：为dvtasks表添加size字段
 */

require('dotenv').config();
const { addSizeColumn } = require('../src/database/addSizeColumn');
const { initConnection, testConnection } = require('../src/database/mysqlConnection');
const { initializeTaskTable } = require('../src/store/taskStore');

async function migrate() {
  try {
    console.log('开始数据库迁移...');
    
    // 初始化数据库连接
    initConnection();
    console.log('数据库连接已初始化');
    
    // 测试连接
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('无法连接到数据库');
      process.exit(1);
    }
    
    // 确保表结构存在
    await initializeTaskTable();
    console.log('确保表结构存在');
    
    // 添加size字段
    await addSizeColumn();
    
    console.log('数据库迁移完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

migrate();