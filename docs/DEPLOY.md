# 部署与重启保活说明

本文档涵盖 Linux (systemd) 与 Windows 两种系统上使用 pm2 部署并确保服务在系统重启后自动启动的步骤。

## 前提
- 已在服务器上安装 Node.js 与 npm
- 在项目目录运行下列命令

## npm 脚本（已添加到 `package.json`）
- `npm run deploy`  — 使用 pm2 启动 `index.js`（名称 dv-app）并带上 --update-env
- `npm run deploy:save` — 执行 `pm2 save`，保存当前进程列表
- `npm run deploy:startup` — 生成注册系统启动脚本（在 Linux 上会输出需要以 sudo 执行的命令）
- `npm run deploy:full` — 依次执行 deploy、save 与 startup

## Linux (systemd) 推荐步骤
1. 登录为将运行 pm2 的用户（示例为 `deployuser`）。
2. 安装 pm2（若未安装）：

```bash
npm install -g pm2
```

3. 启动应用并保存：
# 部署说明索引

本仓库包含针对于 Linux 与 Windows 的单独部署指南：

- `docs/DEPLOY_LINUX.md` — 针对 Linux（systemd）的完整部署与保活步骤
- `docs/DEPLOY_WINDOWS.md` — 针对 Windows 的完整部署与保活步骤（使用 pm2-windows-service）

请根据目标系统打开对应文档查看详细步骤与排查指南。
```bash
