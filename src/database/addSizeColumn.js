/**
 * 为现有的dvtasks表添加size字段
 */

const { getConnection } = require('./mysqlConnection');

async function addSizeColumn() {
  const connection = await getConnection();
  
  try {
    // 检查字段是否存在
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'dvtasks' 
       AND COLUMN_NAME = 'size'`
    );
    
    if (columns.length === 0) {
      // 添加size字段
      await connection.execute(`
        ALTER TABLE dvtasks 
        ADD COLUMN size BIGINT NULL AFTER output_name
      `);
      console.log('成功添加size字段到dvtasks表');
    } else {
      console.log('size字段已存在');
    }
  } catch (error) {
    console.error('添加size字段时出错:', error);
    throw error;
  }
}

module.exports = { addSizeColumn };