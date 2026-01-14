// src/store/taskStore.js
const { getConnection } = require('../database/mysqlConnection');
const { v4: uuidv4 } = require('uuid');

// 初始化任务表
async function initializeTaskTable() {
  const connection = await getConnection();

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS dvtasks (
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
      size BIGINT,
      created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await connection.execute(createTableQuery);
    console.log('Dvtasks table created or already exists');
  } catch (error) {
    console.error('Error creating dvtasks table:', error);
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
    size: task.size || null,
  };

  const query = `
    INSERT INTO dvtasks (
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
      output_name,
      size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      newTask.size,
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
      case 'size':
        columnName = 'size';
        break;
      default:
        columnName = key; // 包含 location
        break;
    }

    fields.push(`${columnName} = ?`);
    values.push(value);
  }

  if (!fields.length) return { id };

  const query = `UPDATE dvtasks SET ${fields.join(', ')} WHERE id = ?`;
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

  const query = 'SELECT * FROM dvtasks WHERE id = ?';

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
      size: dbTask.size,
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
      output_name,
      size
    FROM dvtasks
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
      size: dbTask.size,
    }));
  } catch (err) {
    console.error('Error fetching all tasks:', err);
    throw err;
  }
}

const { scheduleClear } = require('./clearOldTasks');

// 添加统计任务数量的函数
async function getTaskStats() {
  const connection = await getConnection();

  // 查询所有任务总数
  const totalQuery = 'SELECT COUNT(*) as totalCount FROM dvtasks';
  // 查询正在下载的任务数量 (status 为 'running' 或 'pending')
  const downloadingQuery = "SELECT COUNT(*) as downloadingCount FROM dvtasks WHERE status IN ('running', 'pending')";
  // 查询下载失败的任务数量 (status 为 'failed')
  const failedQuery = "SELECT COUNT(*) as failedCount FROM dvtasks WHERE status = 'failed'";

  try {
    // 并行执行查询
    const [[totalResult], [downloadingResult], [failedResult]] = await Promise.all([
      connection.execute(totalQuery),
      connection.execute(downloadingQuery),
      connection.execute(failedQuery)
    ]);

    return {
      total: totalResult[0].totalCount || 0,
      downloading: downloadingResult[0].downloadingCount || 0,
      failed: failedResult[0].failedCount || 0
    };
  } catch (error) {
    console.error('Error fetching task statistics:', error);
    throw error;
  }
}

module.exports = {
  initializeTaskTable,
  createTask,
  updateTask,
  getTask,
  getAllTasks,
  getTaskStats, // 导出新添加的统计函数
  /**
   * 多条件查询任务
   * @param {Object} filters - 筛选条件对象，支持所有字段
   * @param {number} page - 页码
   * @param {number} limit - 每页数量
   * @returns {Promise<Object>} 包含任务列表和分页信息的对象
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
    
    // 执行两个查询：总数和当前页数据
    const countSql = `SELECT COUNT(*) as total FROM dvtasks ${where}`;
    const dataSql = `SELECT * FROM dvtasks ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    try {
      // 并行执行查询
      const [[countResult], [dataRows]] = await Promise.all([
        connection.query(countSql, params),
        connection.query(dataSql, params)
      ]);
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      const tasks = dataRows.map(dbTask => ({
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
        size: dbTask.size,
      }));
      
      return {
        tasks,
        pagination: {
          page,
          pageSize: limit,
          total,
          totalPages
        }
      };
    } catch (err) {
      console.error('Error querying tasks:', err);
      throw err;
    }
  },
};

// 启动定时清理任务
scheduleClear();
