# 部署（Windows）

本文件描述如何在 Windows 上使用 pm2 与 pm2-windows-service 部署并确保服务在重启后自动启动。

前提
- 在目标机器上已安装 Node.js 与 npm
- 以管理员权限运行 PowerShell

快速步骤
1. 安装 pm2 与 pm2-windows-service：

```powershell
npm install -g pm2 pm2-windows-service
```

2. 启动应用并保存 pm2 列表：

```powershell
npm run deploy
pm2 save
```

3. 使用仓库提供的 PowerShell 脚本注册 Windows 服务（以管理员运行）：

```powershell
# 在项目根目录下
.\bin\install-pm2-windows-service.ps1 -Username <yourUser> -Password <yourPassword>
```

脚本会调用 `pm2-service-install` 来安装并注册服务，服务名为 `dv-app`。安装后在“服务”管理器（services.msc）中将其设置为“自动”启动。

安全提示
- 建议不要在命令行中以明文方式传递密码；可使用交互式方式或把脚本改为接受 `SecureString/PSCredential`。

排查
- 检查服务是否存在并运行：在 services.msc 中查找 `dv-app`。
- 查看 pm2 日志：

```powershell
pm2 logs dv-app
```

- 如果服务未启动，查看 Windows 事件查看器中的应用或系统日志以获取错误信息。

高级：如果不想使用 pm2-windows-service，可使用 NSSM 把 `pm2 resurrect` 或 `node index.js` 包装成 Windows 服务。
