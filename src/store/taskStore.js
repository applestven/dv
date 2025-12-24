// src/store/taskStore.js
const { getConnection } = require('../database/mysqlConnection');
const { v4: uuidv4 } = require('uuid');

// 初始化任务表
async function initializeTaskTable() {
  const connection = await getConnection();
  
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR(36) PRIMARY KEY,
      url TEXT NOT NULL,
      quality VARCHAR(50),
      status VARCHAR(20) NOT NULL,
      created_at BIGINT,
      started_at BIGINT,
      finished_at BIGINT,
      strategy VARCHAR(50),
      output VARCHAR(500),
      output_name VARCHAR(255),
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  
  try {
    await connection.execute(createTableQuery);
    console.log('Tasks table created or already exists');
  } catch (error) {
    console.error('Error creating tasks table:', error);
    throw error;
  }
}

async function createTask(task) {
  const connection = await getConnection();
  
  // 如果没有提供ID，则生成一个新的UUID
  if (!task.id) {
    task.id = uuidv4();
  }
  
  // 设置默认值
  const newTask = {
    id: task.id,
    url: task.url,
    quality: task.quality || null,
    status: task.status || 'pending',
    createdAt: task.createdAt || Date.now(),
    startedAt: task.startedAt || null,
    finishedAt: task.finishedAt || null,
    strategy: task.strategy || null,
    output: task.output || null,
    outputName: task.outputName || null
  };
  
  const query = `
    INSERT INTO tasks (
      id, url, quality, status, created_at, started_at, finished_at, strategy, output, output_name
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;
  
  try {
    await connection.execute(query, [
      newTask.id,
      newTask.url,
      newTask.quality,
      newTask.status,
      newTask.createdAt,
      newTask.startedAt,
      newTask.finishedAt,
      newTask.strategy,
      newTask.output,
      newTask.outputName
    ]);
    
    return newTask;
  } catch (error) {
    console.error('Error inserting task:', error);
    throw error;
  }
}

async function updateTask(id, patch) {
  const connection = await getConnection();
  
  // 准备更新字段和值
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(patch)) {
    // 跳过id字段，因为这个不应该被更新
    if (key === 'id') continue;
    
    // 将JavaScript对象键名转换为数据库列名
    let columnName;
    switch(key) {
      case 'createdAt':
        columnName = 'created_at';
        break;
      case 'startedAt':
        columnName = 'started_at';
        break;
      case 'finishedAt':
        columnName = 'finished_at';
        break;
      case 'outputName':
        columnName = 'output_name';
        break;
      default:
        columnName = key;
        break;
    }
    
    fields.push(`${columnName} = ?`);
    values.push(value);
  }
  
  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);
  
  try {
    const [result] = await connection.execute(query, values);
    
    if (result.affectedRows === 0) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    return { id, ...patch };
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

async function getTask(id) {
  const connection = await getConnection();
  
  const query = 'SELECT * FROM tasks WHERE id = ?';
  
  try {
    const [rows] = await connection.execute(query, [id]);
    
    if (rows.length === 0) {
      return null;
    }
    
    // 将数据库字段映射回对象属性
    const dbTask = rows[0];
    return {
      id: dbTask.id,
      url: dbTask.url,
      quality: dbTask.quality,
      status: dbTask.status,
      createdAt: dbTask.created_at,
      startedAt: dbTask.started_at,
      finishedAt: dbTask.finished_at,
      strategy: dbTask.strategy,
      output: dbTask.output,
      outputName: dbTask.output_name
    };
  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;
  }
}

// 获取所有任务，支持分页和状态过滤
async function getAllTasks(status = null, page = 1, limit = 20) {
  const connection = await getConnection();
  
  let query = 'SELECT * FROM tasks';
  const params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  query += ' LIMIT ? OFFSET ?';
  params.push(limit, (page - 1) * limit);
  
  try {
    const [rows] = await connection.execute(query, params);
    
    // 将数据库字段映射回对象属性
    return rows.map(dbTask => ({
      id: dbTask.id,
      url: dbTask.url,
      quality: dbTask.quality,
      status: dbTask.status,
      createdAt: dbTask.created_at,
      startedAt: dbTask.started_at,
      finishedAt: dbTask.finished_at,
      strategy: dbTask.strategy,
      output: dbTask.output,
      outputName: dbTask.output_name
    }));
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    throw error;
  }
}

module.exports = { createTask, updateTask, getTask, initializeTaskTable, getAllTasks };