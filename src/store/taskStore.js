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
      location VARCHAR(255),
      error TEXT,
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

  if (!task.id) {
    task.id = uuidv4();
  }

  const newTask = {
    id: task.id,
    url: task.url,
    quality: task.quality || null,
    status: task.status || 'pending',
    location: task.location || null,
    error: task.error || null,
    createdAt: task.createdAt || Date.now(),
    startedAt: task.startedAt || null,
    finishedAt: task.finishedAt || null,
    strategy: task.strategy || null,
    output: task.output || null,
    outputName: task.outputName || null,
  };

  const query = `
    INSERT INTO tasks (
      id,
      url,
      quality,
      status,
      location,
      error,
      created_at,
      started_at,
      finished_at,
      strategy,
      output,
      output_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await connection.execute(query, [
      newTask.id,
      newTask.url,
      newTask.quality,
      newTask.status,
      newTask.location,
      newTask.error,
      newTask.createdAt,
      newTask.startedAt,
      newTask.finishedAt,
      newTask.strategy,
      newTask.output,
      newTask.outputName,
    ]);

    return newTask;
  } catch (error) {
    console.error('Error inserting task:', error);
    throw error;
  }
}

async function updateTask(id, patch) {
  const connection = await getConnection();

  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'id') continue;

    let columnName;
    switch (key) {
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
        columnName = key; // 包含 location
        break;
    }

    fields.push(`${columnName} = ?`);
    values.push(value);
  }

  if (!fields.length) return { id };

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

    if (!rows.length) return null;

    const dbTask = rows[0];

    return {
      id: dbTask.id,
      url: dbTask.url,
      quality: dbTask.quality,
      status: dbTask.status,
      location: dbTask.location,
      error: dbTask.error,
      createdAt: dbTask.created_at,
      startedAt: dbTask.started_at,
      finishedAt: dbTask.finished_at,
      strategy: dbTask.strategy,
      output: dbTask.output,
      outputName: dbTask.output_name,
    };
  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;
  }
}

// 获取所有任务（分页 + 状态过滤）
async function getAllTasks(status = null, page = 1, limit = 20) {
  const connection = await getConnection();

  page = Number(page) || 1;
  limit = Number(limit) || 20;
  const offset = (page - 1) * limit;

  let where = '';
  const params = [];

  if (status !== null && status !== undefined) {
    where = 'WHERE status = ?';
    params.push(status);
  }

  const dataSql = `
    SELECT
      id,
      url,
      quality,
      status,
      location,
      error,
      created_at,
      started_at,
      finished_at,
      strategy,
      output,
      output_name
    FROM tasks
    ${where}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    const [rows] = await connection.query(dataSql, params);

    return rows.map(dbTask => ({
      id: dbTask.id,
      url: dbTask.url,
      quality: dbTask.quality,
      status: dbTask.status,
      location: dbTask.location,
      error: dbTask.error,
      createdAt: dbTask.created_at,
      startedAt: dbTask.started_at,
      finishedAt: dbTask.finished_at,
      strategy: dbTask.strategy,
      output: dbTask.output,
      outputName: dbTask.output_name,
    }));
  } catch (err) {
    console.error('Error fetching all tasks:', err);
    throw err;
  }
}



module.exports = {
  initializeTaskTable,
  createTask,
  updateTask,
  getTask,
  getAllTasks,
  /**
   * 多条件查询任务
   * @param {Object} filters - 筛选条件对象，支持所有字段
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise<Array>} 任务列表
   */
  async queryTasks(filters = {}, page = 1, limit = 20) {
    const connection = await getConnection();
    page = Number(page) || 1;
    limit = Number(limit) || 20;
    const offset = (page - 1) * limit;

    const whereArr = [];
    const params = [];
    // 字段映射
    const fieldMap = {
      createdAt: 'created_at',
      startedAt: 'started_at',
      finishedAt: 'finished_at',
      outputName: 'output_name',
    };
    for (const key in filters) {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        const col = fieldMap[key] || key;
        if (Array.isArray(filters[key])) {
          whereArr.push(`${col} IN (${filters[key].map(() => '?').join(',')})`);
          params.push(...filters[key]);
        } else if (typeof filters[key] === 'object' && filters[key] !== null) {
          // 支持范围查询 {createdAt: {min: 1, max: 2}}
          if (filters[key].min !== undefined) {
            whereArr.push(`${col} >= ?`);
            params.push(filters[key].min);
          }
          if (filters[key].max !== undefined) {
            whereArr.push(`${col} <= ?`);
            params.push(filters[key].max);
          }
        } else {
          whereArr.push(`${col} = ?`);
          params.push(filters[key]);
        }
      }
    }
    const where = whereArr.length ? `WHERE ${whereArr.join(' AND ')}` : '';
    const sql = `SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    try {
      const [rows] = await connection.query(sql, params);
      return rows.map(dbTask => ({
        id: dbTask.id,
        url: dbTask.url,
        quality: dbTask.quality,
        status: dbTask.status,
        location: dbTask.location,
        error: dbTask.error,
        createdAt: dbTask.created_at,
        startedAt: dbTask.started_at,
        finishedAt: dbTask.finished_at,
        strategy: dbTask.strategy,
        output: dbTask.output,
        outputName: dbTask.output_name,
      }));
    } catch (err) {
      console.error('Error querying tasks:', err);
      throw err;
    }
  },
};
