## 整体架构（推荐） 

Client
  ↓ HTTP
Express API
  ↓
Download Queue（并发控制）
  ↓
Resolver（策略选择）
  ├─ yt-dlp（优先）
  ├─ yt-dlp-generic（未识别平台）
  └─ puppeteer-adapter（兜底）
  ↓
Downloader
  ↓
File Storage


## 三、核心模块划分（非常关键）


src/
├─ api/
│  └─ download.routes.js
├─ queue/
│  ├─ taskQueue.js        # 并发 + 队列
│  └─ taskWorker.js
├─ resolver/
│  ├─ platformDetect.js
│  ├─ strategyRouter.js
│  └─ strategies/
│     ├─ ytDlp.strategy.js
│     ├─ ytDlpGeneric.strategy.js
│     └─ puppeteer.strategy.js
├─ downloader/
│  └─ ytDlpRunner.js
├─ store/
│  └─ taskStore.js        # 状态表（内存 / DB）
├─ types/
│  └─ task.js
└─ app.js

## 四、下载任务状态表设计（重点） 

type TaskStatus =
  | 'pending'     // 已入队
  | 'running'     // 下载中
  | 'success'     // 成功
  | 'failed'      // 失败
  | 'fallback';   // 走兜底方案

###   Task 结构（核心） 

{
  id: string;
  url: string;
  platform: string;
  strategy: 'yt-dlp' | 'yt-dlp-generic' | 'puppeteer';
  status: TaskStatus;
  progress?: number;
  output?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

## 五、任务存储（先简单，后升级）

先用内存（开发 & 单机）
// src/store/taskStore.js

👉 后期可以无缝换成：

SQLite

MySQL

Redis

## 六、下载队列（并发控制，必须）

npm i p-queue 

``` js
// src/queue/taskQueue.js
const PQueue = require('p-queue').default;

const queue = new PQueue({
  concurrency: 2,   // Windows 推荐 ≤ 2
  intervalCap: 3,
  interval: 1000,
});

module.exports = queue;

```

## 七、平台识别 & 策略路由
// resolver/platformDetect.js
平台识别

// resolver/strategyRouter.js 
策略路由（关键）

## 八、yt-dlp 通用方案（你要的“未匹配平台”）
// resolver/strategies/ytDlpGeneric.strategy.js

yt-dlp Generic Strategy

## 九、Puppeteer 兜底预留（你自己那套）
// resolver/strategies/puppeteer.strategy.js
只在 yt-dlp 失败后调用

## 十、任务 Worker（核心调度）
// queue/taskWorker.js

## 十一、Express API（你直接能用）

// api/download.routes.js

## 十二、Windows 下 yt-dlp.exe 使用说明

👉 https://github.com/yt-dlp/yt-dlp/releases  yt-dlp.exe

wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp   linux

下载后放入 project/bin 目录下

👉 服务里不要 npm 安装 yt-dlp-js 那种包装库，坑多


## 十三、YouTube 支持说明（你关心） 

yt-dlp = YouTube 官方级支持

支持：

4K / 8K

DASH

字幕

合并

私有视频 → cookies

``` bash
yt-dlp --cookies cookies.txt https://youtube.com/...
```

## 十四、总结一句“架构价值” 

这套重构之后：

❌ Puppeteer 不再是主流程

✅ yt-dlp 成为“默认下载内核”

✅ 所有未知平台都有通用兜底

✅ Puppeteer 只在 真正需要时才启动

✅ Windows / Docker / Linux 都能跑

这已经是商业级视频下载服务的标准架构了。


## 十五、 不同系统里面的 yt-dlp.exe 使用方法

src/
└─ downloader/
   ├─ ytDlpBinary.js   ← ★ 新增
   └─ ytDlpRunner.js

   改造 ytDlpRunner 


##  十六、不同系统下的使用方式（你开发/部署时这样做）

✅ Windows（你平时开发） 

project/
└─ bin/
   └─ yt-dlp.exe

### Node 自动识别 win32，直接调用 exe

👉 不需要：

Python

WSL

shell

### 为了项目方便开发 我直接 把两个文件放入bin目录下了

chmod +x bin/yt-dlp 

### 同时 实际部署过程 和不同平台 安装  
[下载地址](#十二windows-下-yt-dlpexe-使用说明)
1. docker/linux

    RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

2. macos
    brew install yt-dlp
3. window 指定环境变量
setx YT_DLP_PATH "D:\tools\yt-dlp.exe"

## 十七、 YouTube / 未知平台 / 通用方案依然成立

因为你现在：

✔️ YouTube → yt-dlp 内置 extractor

✔️ 抖音 / B站 / 快手 → 内置

✔️ 未知平台 → --force-generic-extractor

✔️ 全部走 同一个 runYtDlp

系统差异 已经被隔离掉了。

## 十八、为 Puppeteer 兜底预留的统一接口（重要）

async function downloadWithFallback(task) {
  try {
    await runYtDlp({ url: task.url, outputDir: './downloads' });
  } catch (e) {
    // yt-dlp 失败 → 你自己的 Puppeteer
    return runByPuppeteer(task.url);
  }
}

## 在你现有 runner 上补「抖音兜底流程」

audio-low
  ↓
video-worst + merge
  ↓
-x 提取音频
  ↓
失败？
  ↓
刷新 cookie
  ↓
重试一次

## platformDownloaderFactory（核心）

👉 统一入口
👉 根据 URL 自动识别平台
👉 自动处理 cookies / retry / fallback
👉 自动缓存 metadata


## 最终下载链路

创建任务
   ↓
尝试 yt-dlp
   ↓
┌──────── 成功 ────────┐
│                      │
│                  callback(success)
│                      │
└──────── 失败 ────────┘
           ↓
    puppeteer 抓流
           ↓
   ┌──── 成功 ────┐
   │               │
callback(success)  │
                   │
   └──── 失败 ────┘
           ↓
     callback(failed)


## 抖音专用策略（强烈建议）
runYtDlp
  ↓
Douyin extractor 报 Fresh cookies needed
  ↓
调用 douyinCookieProvider（puppeteer）
  ↓
生成「新鲜 cookie 文件」
  ↓
再次 runYtDlp（携带 cookie）
