# MySQL 配置和使用说明

## 安装依赖

在使用本项目前，需要安装必要的依赖：

```bash
npm install
```

## 启动MySQL服务

在使用本项目前，需要确保MySQL服务正在运行：

### Windows
1. 通过服务管理器启动MySQL服务
   - 按 `Win + R`，输入 `services.msc`
   - 找到 MySQL 服务，右键选择"启动"
   
2. 或者通过命令行启动（需要以管理员身份运行）
   ```bash
   net start mysql
   ```

### macOS/Linux
```bash
# 启动MySQL服务
sudo service mysql start
# 或者如果使用了homebrew安装
brew services start mysql
```

## 数据库配置

在使用本项目前，需要先配置MySQL数据库：

1. 确保你的系统已安装MySQL服务
2. 创建数据库（推荐使用`dv_task_db`名称）
3. 配置环境变量或修改配置文件

### 环境变量配置

项目使用 `dotenv` 包来加载 `.env` 文件中的环境变量。

在项目根目录创建 `.env` 文件（或复制 `.env.example`）：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=dv_task_db
```

环境变量将优先于配置文件中的默认值。

### 或修改配置文件

编辑 `src/config/dbConfig.js` 文件来配置数据库连接参数：

```javascript
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',  // 数据库主机
  user: process.env.DB_USER || 'root',       // 数据库用户名
  password: process.env.DB_PASSWORD || '123456', // 数据库密码
  database: process.env.DB_NAME || 'dv_task_db', // 数据库名称
  port: process.env.DB_PORT || 3306,         // 数据库端口
  connectTimeout: 60000,                     // 连接超时时间
  acquireTimeout: 60000,                     // 获取连接超时时间
};
```

## 初始化数据库

首次使用前需要初始化数据库表结构：

```bash
npm run db:init
```

或者直接运行：

```bash
node init_database.js
```

## 任务表结构

系统会自动创建 `dvtasks` 表，包含以下字段：

- `id`: 任务唯一标识符 (VARCHAR 36)
- `url`: 下载链接 (TEXT)
- `quality`: 视频质量 (VARCHAR 50)
- `status`: 任务状态 (VARCHAR 20)
- `created_at`: 创建时间 (BIGINT)
- `started_at`: 开始时间 (BIGINT)
- `finished_at`: 完成时间 (BIGINT)
- `strategy`: 使用的策略 (VARCHAR 50)
- `output`: 输出路径 (VARCHAR 500)
- `output_name`: 输出文件名 (VARCHAR 255)
- `created`: 记录创建时间 (TIMESTAMP)
- `updated`: 记录更新时间 (TIMESTAMP)

## API 接口

集成MySQL后，你可以使用以下API接口：

- `POST /api/download/tasks` - 创建下载任务
- `GET /api/download/tasks/:id` - 获取指定任务详情
- `GET /api/download/tasks` - 获取任务列表
- `GET /task/:id` - 获取指定任务详情（简化路径）
- `GET /tasks` - 获取任务列表（简化路径）

## 便捷命令

项目提供了以下便捷命令：

- `npm run db:init` - 初始化数据库和表结构
- `npm start` - 启动应用
- `npm run dy:cookie` - 获取抖音Cookie