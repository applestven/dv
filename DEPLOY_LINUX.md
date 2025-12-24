# Linux系统部署文档

## 1. 系统要求

- 操作系统：Ubuntu 18.04 LTS / 20.04 LTS / 22.04 LTS 或 CentOS 7 / 8
- Node.js: v18 或更高版本
- 内存：至少 4GB RAM
- 磁盘空间：至少 10GB 可用空间（用于视频存储）
- MySQL: 5.7 或 8.0 版本

## 2. 安装依赖软件

### 2.1 安装 Node.js

```bash
# 使用 NodeSource 仓库安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 2.2 安装 MySQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server
# 或使用 dnf (CentOS 8+)
sudo dnf install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 2.3 安装 FFmpeg

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg
# 或启用 EPEL 仓库后安装
sudo yum install epel-release
sudo yum install ffmpeg
```

### 2.4 安装 yt-dlp

```bash
# 方法 1：使用 curl 安装
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp

# 方法 2：使用包管理器安装
# Ubuntu/Debian (需要先添加仓库)
sudo curl -L https://yt-dlp.org/linux-repo/yt-dlp.list -o /etc/apt/sources.list.d/yt-dlp.list
sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys F5E83F1DC92F7A2B
sudo apt update
sudo apt install yt-dlp

# CentOS/RHEL
sudo yum install yt-dlp
```

### 2.5 安装 Chromium 依赖（用于 Puppeteer）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# CentOS/RHEL
sudo yum update
sudo yum install -y alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 libXcomposite.x86_64 libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXtst.x86_64 nss.x86_64 xdg-utils wget
```

## 3. 项目部署

### 3.1 克隆项目代码

```bash
git clone https://github.com/your-repo/dv.git
cd dv
```

### 3.2 安装 Node.js 依赖

```bash
npm install
# 或使用 pnpm（如果项目使用 pnpm）
# pnpm install
```

### 3.3 配置环境变量

创建 `.env` 文件：

```bash
# 创建环境配置文件
cp .env.example .env  # 如果有示例文件
# 或直接创建
touch .env
```

编辑 `.env` 文件：

```bash
# .env 文件内容示例
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=dv_task_db

# 服务器配置
SERVER_PORT=3456
DOWNLOAD_DIR=/home/user/dv/downloads
```

### 3.4 初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dv_task_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 运行数据库初始化脚本
npm run db:init
```

## 4. 配置服务

### 4.1 创建系统服务文件

创建 `/etc/systemd/system/dv.service`：

```bash
sudo nano /etc/systemd/system/dv.service
```

内容如下：

```
[Unit]
Description=DV Video Downloader Service
After=network.target mysql.service
Requires=mysql.service

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/dv
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```



## 5. 防火墙配置（如需要）

```bash
# Ubuntu (ufw)
sudo ufw allow 3456

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=3456/tcp
sudo firewall-cmd --reload
```

## 6. 项目专用命令

### 6.1 启动项目

```bash
npm start
# 或使用 PM2 进行进程管理
npm install -g pm2
pm2 start index.js --name "dv-app"
```

### 6.2 抖音 Cookie 操作

```bash
npm run dy:cookie
```

### 6.3 数据库初始化

```bash
npm run db:init
```

## 7. 监控和日志

### 7.1 查看服务日志

```bash
# systemd 服务日志
sudo journalctl -u dv -f

# 或使用 PM2 查看日志
pm2 logs dv-app
```

### 7.2 进程管理

```bash
# 使用 PM2 管理进程
pm2 start index.js --name "dv-app"  # 启动
pm2 stop dv-app                     # 停止
pm2 restart dv-app                  # 重启
pm2 list                            # 查看所有进程
pm2 monit                           # 监控资源使用情况
```

## 8. 常见问题排查

### 8.1 权限问题

如果遇到 Puppeteer 执行错误，确保用户有足够权限：

```bash
# 添加用户到相关组
sudo usermod -a -G audio,video $USER
```

### 8.2 Puppeteer Chromium 无法启动

```bash
# 以非沙盒模式启动（仅用于测试）
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### 8.3 数据库连接问题

```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 检查 MySQL 是否在监听
sudo netstat -tlnp | grep mysql
```

### 8.4 磁盘空间不足

```bash
# 定期清理下载目录
# 可以设置定时任务清理旧文件
crontab -e
# 添加以下行，每天凌晨2点清理7天前的文件
0 2 * * * find /path/to/downloads -type f -mtime +7 -delete
```

## 9. 备份和维护

### 9.1 数据库备份

```bash
# 备份数据库
mysqldump -u root -p dv_task_db > dv_task_db_backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p dv_task_db < backup_file.sql
```

### 9.2 定期更新

```bash
# 更新代码
git pull origin main

# 更新依赖
npm update

# 重启服务
sudo systemctl restart dv
```