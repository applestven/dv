// 分镜方法

const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const path = require('path');
const ffprobePath = require('ffprobe-static').path;
const fs = require('fs').promises;
const { store } = require('../../store');
const debug = store.get('debug');
const { createFile, checkAndCreateFolder } = require('../../utils/initIpc/file');
const { ffmpegLog } = require('../../utils/log/index.js');
const dayjs = require('dayjs');

const pLimit = require('p-limit').default;

const limit = pLimit(2); // 控制ffmpeg并发数量为 2
/**
 * FFmpeg 智能分镜主函数（批量处理版）
 * @param {Object} config - 配置参数对象
 * @param {string} config.folder - 源视频目录路径
 * @param {string} config.exportfolder - 输出目录路径
 * @param {number} config.mode - 分镜模式 (1-4)
 * @param {number} config.slideValue - 分镜敏感度参数 (0.1-1)
 * @param {number} config.exportMode - 输出模式 (1: 分目录, 2: 同目录)
 * @param {boolean} config.gpu - 是否启用GPU加速
 * @returns {Promise<void>}
 */
async function smartSceneDetection({ folder, exportfolder, mode, slideValue, exportMode, gpu }) {
  //
  exportfolder = path.join(exportfolder, '分镜视频');
  console.log('@@gpu', gpu);
  try {
    // ==== 步骤1：验证输入参数 ====
    if (!folder || !exportfolder) {
      throw new Error('必须提供输入/输出目录');
    }

    // ==== 步骤2：获取待处理视频列表 ====
    const videoFiles = await getVideoFilesFromFolder(folder);
    if (videoFiles.length === 0) {
      throw new Error('素材目录中没有找到支持的视频文件');
    }

    // ==== 步骤3：并行处理所有视频 ====
    // await Promise.all(
    //   videoFiles.map(async (inputPath) => {
    //     const videoName = path.basename(inputPath, path.extname(inputPath));
    //     const videoExportFolder =
    //       exportMode === 1 ? path.join(exportfolder, videoName) : exportfolder;

    //     await processSingleVideo({
    //       inputPath,
    //       exportfolder: videoExportFolder,
    //       mode,
    //       slideValue,
    //       exportMode,
    //       gpu,
    //       videoName,
    //     });
    //   })
    // );

    // cpu和内存开销很大 改为最多并发2个
    await Promise.all(
      videoFiles.map((inputPath) =>
        limit(async () => {
          const videoName = path.basename(inputPath, path.extname(inputPath));
          const videoExportFolder =
            exportMode === 1 ? path.join(exportfolder, videoName) : exportfolder;

          await processSingleVideo({
            inputPath,
            exportfolder: videoExportFolder,
            mode,
            slideValue,
            exportMode,
            gpu,
            videoName,
          });
        })
      )
    );

    console.log(`✅ 成功处理 ${videoFiles.length} 个视频文件`);
  } catch (error) {
    console.error('❌ 批量处理失败:', error);
    throw error;
  }
}

/**
 * 处理单个视频文件的核心逻辑
 * @param {Object} params - 处理参数
 */
async function processSingleVideo({
  inputPath,
  exportfolder,
  mode,
  slideValue,
  exportMode,
  gpu,
  videoName,
}) {
  // ==== 步骤1：创建临时目录 ====
  const timestamp = Date.now();
  const tempDir = path.join(exportfolder, `temp_${timestamp}`);
  try {
    // await clearFolder(tempDir);

    // ==== 步骤2：构建基础FFmpeg命令 ====
    const baseCommand = [
      '-y', // 覆盖已存在文件
      '-hide_banner', // 隐藏版本信息
      '-loglevel',
      debug ? 'info' : 'error', // 日志级别
    ];

    // GPU加速配置
    if (gpu) {
      baseCommand.push(
        '-hwaccel',
        'cuda', // CUDA硬件加速
        '-hwaccel_output_format',
        'cuda' // 输出格式
      );
    }
    // ==== 步骤3：根据分镜模式构建检测命令 ====
    let detectionCommand = [];
    // 将inputPath / 改为 \
    // inputPath = inputPath.replace(/\//g, '\\');

    // 创建存储视频分镜视频的文件夹
    checkAndCreateFolder(path.join(exportfolder));
    switch (mode) {
      case 1: {
        // 按视觉转场分镜
        const sceneThreshold = Math.max(0.1, Math.min(1, slideValue));

        // 获取系统类型
        const osType = process.platform;
        let ffmpegSafePath;
        // 根据系统类型设置ffmpegSafePath的值
        osType === 'darwin' ? ffmpegSafePath = path.join(path.parse(inputPath).dir, 'scene_changes.txt') :
          'scene_changes.txt';
        detectionCommand = [
          '-i',
          inputPath, // 直接使用路径，不需要引号
          '-vf',
          `scdet=threshold=${sceneThreshold},fps=25,metadata=print:file=${ffmpegSafePath}`,
          '-map',
          '0',
          '-f',
          'segment',
          '-segment_format',
          'mp4',
          '-reset_timestamps',
          '1',
          '-segment_time_delta',
          '0.1',
          '-strftime',
          '0',
          path.join(exportfolder, `${videoName}_%03d.mp4`),
        ];
        break;
      }

      case 2: {
        // 按固定时长分镜
        const duration = await getVideoDuration(inputPath);
        const segmentDuration = Math.max(1, Math.floor(duration * slideValue));
        detectionCommand = [
          '-i',
          inputPath,
          '-f',
          'segment', // 分段输出模式
          '-segment_time',
          segmentDuration.toString(),
          '-reset_timestamps',
          '1', // 重置时间戳
          '-c',
          'copy', // 直接复制流
          path.join(exportfolder, `${videoName}_%03d.mp4`),
        ];
        break;
      }

      case 3: {
        // 按分镜数量分镜
        const duration = await getVideoDuration(inputPath);
        const segmentCount = Math.max(1, Math.round(slideValue * 10)); // 0.1=1段，1=10段
        const segmentDuration = duration / segmentCount;
        detectionCommand = [
          '-i',
          inputPath,
          '-f',
          'segment',
          '-segment_time',
          segmentDuration.toFixed(2),
          '-reset_timestamps',
          '1',
          '-c',
          'copy',
          path.join(exportfolder, `${videoName}_%03d.mp4`),
        ];
        break;
      }

      case 4: {
        // 按音频静默分镜
        detectionCommand = [
          '-i',
          inputPath,
          '-af',
          `silencedetect=n=-30dB:d=0.5,ametadata=print:file=${path.join(tempDir, 'silence.txt')}`,
          '-f',
          'null',
          '-',
        ];
        break;
      }

      default:
        throw new Error(`无效的分镜模式: ${mode}`);
    }

    // ==== 步骤4：执行分镜检测命令 ====
    const fullCommand = [...baseCommand, ...detectionCommand];
    if (debug)
      ffmpegLog.transports.file.fileName =
        'ffmpeg-' + dayjs().format('YYYY-MM-DD HH.mm.ss') + '-' + '.log';
    // if (debug) ffmpegLog['info']('执行FFmpeg命令:' + ffmpegPath + " " + fullCommand + "\n");
    // 处理fullCommand数组转化为string字符串 每次拼接前都要加空格
    let fullCommandStr = '';
    fullCommand.forEach((item) => {
      fullCommandStr += item + ' ';
    });
    if (debug) ffmpegLog['info']('执行FFmpeg命令:' + ffmpegPath + ' ' + fullCommandStr + '\n');
    await executeFFmpeg(ffmpegPath, fullCommand);

    // ==== 步骤5：处理分析结果（仅限静默检测模式） ====
    if (mode === 4) {
      const analysisPath = path.join(tempDir, 'silence.txt');

      // 修复错误：确保总是返回数组
      const cutPoints = (await parseAnalysisResults(analysisPath, mode)) || [];

      // 创建一个存放的位置
      // let exportfolder = path.join(exportfolder, videoName);
      console.log('￥￥￥', exportfolder);

      if (cutPoints.length > 0) {
        await splitVideoAtPoints({
          inputPath,
          exportfolder,
          cutPoints,
          gpu,
          exportMode,
          videoName,
        });
      } else {
        console.warn(`⚠️ 未检测到有效分镜点: ${path.basename(inputPath)}`);
      }
    }

    // ==== 步骤6：清理临时文件 ====
    // await clearFolder(tempDir);
  } catch (error) {
    console.log('处理分镜处理失败', error);
    // await clearFolder(tempDir).catch(e => { });
    throw error;
  }
}

/**
 * 视频分割实现（修复length错误）
 * @param {Object} params - 分割参数
 */
async function splitVideoAtPoints({
  inputPath,
  exportfolder,
  cutPoints = [], // 默认空数组防止undefined
  gpu,
  exportMode,
  videoName,
}) {
  // ==== 安全校验 ====
  if (!Array.isArray(cutPoints)) {
    throw new Error('无效的分割点参数');
  }

  // ==== 步骤1：生成时间段信息 ====
  const segments = [];
  let start = 0;

  // 处理中间片段
  for (let i = 0; i < cutPoints.length; i++) {
    const end = cutPoints[i];
    const duration = end - start;

    // 过滤无效片段（至少0.1秒）
    if (duration >= 0.1) {
      segments.push({ start, duration, index: i });
    }

    start = end;
  }

  // 处理最后一段
  const totalDuration = await getVideoDuration(inputPath);
  if (start < totalDuration - 0.1) {
    segments.push({
      start,
      duration: totalDuration - start,
      index: cutPoints.length,
    });
  }

  // ==== 步骤2：并行处理所有片段 ====
  await Promise.all(
    segments.map(async ({ start, duration, index }) => {
      // 构建输出路径
      const outputPath =
        exportMode === 1
          ? path.join(exportfolder, `scene_${index + 1}`, `output.mp4`)
          : path.join(exportfolder, `${videoName}_${String(index + 1).padStart(3, '0')}.mp4`);

      // 创建输出目录
      if (exportMode === 1) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
      }

      // 构建FFmpeg命令
      const command = [
        '-y',
        '-ss',
        start.toFixed(3), // 精确到毫秒
        '-i',
        inputPath,
        '-t',
        duration.toFixed(3),
        '-avoid_negative_ts',
        '1', // 避免负时间戳
      ];

      // 编码参数
      if (gpu) {
        command.push(
          '-hwaccel',
          'cuda',
          '-c:v',
          'h264_nvenc', // NVIDIA编码器
          '-preset',
          'fast',
          '-profile:v',
          'high',
          '-rc',
          'constqp', // 恒定质量模式
          '-qp',
          '23' // 质量参数（0-51，值越小质量越高）
        );
      } else {
        command.push(
          '-c:v',
          'libx264', // 软件编码
          '-preset',
          'fast',
          '-crf',
          '23'
        );
      }

      // 音频参数
      command.push(
        '-c:a',
        'aac', // 音频编码格式
        '-b:a',
        '128k', // 音频比特率
        '-movflags',
        '+faststart', // 快速启动
        outputPath
      );

      await executeFFmpeg(ffmpegPath, command);
    })
  );
}

/**
 * 获取目录中的视频文件（增强版）
 */
async function getVideoFilesFromFolder(folder) {
  try {
    const files = await fs.readdir(folder);
    return files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv'].includes(ext);
      })
      .map((file) => path.join(folder, file));
  } catch (error) {
    console.error('读取目录失败:', error);
    return [];
  }
}

/**
 * 安全获取视频时长
 */
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    spawn(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      (error, stdout, stderr) => {
        if (error || !stdout) {
          reject(new Error(`获取时长失败: ${stderr || '无输出'}`));
          return;
        }
        resolve(Math.max(0, parseFloat(stdout) || 0));
      }
    );
  });
}

/**
 * 执行FFmpeg命令的通用方法
 * @param {string} ffmpegPath - FFmpeg可执行文件路径
 * @param {Array} args - 命令参数数组
 * @returns {Promise<void>}
 */
async function executeFFmpeg(ffmpegPath, args) {
  ffmpegPath = ffmpegPath.replace(/\\/g, '/');
  args = args.map(arg => arg.replace(/\\/g, '/'));

  return new Promise((resolve, reject) => {
    const fullCommand = [ffmpegPath, ...args].join(' ');

    const child = spawn(ffmpegPath, args, { windowsHide: true });

    let stdoutData = '';
    let stderrData = '';

    child.stdout?.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (debug) {
          if (stdoutData.trim()) {
            console.log('FFmpeg 标准输出:\n', stdoutData);
            ffmpegLog.info('[FFmpeg stdout]\n' + stdoutData);
          }
          if (stderrData.trim()) {
            console.log('FFmpeg 错误输出:\n', stderrData);
            ffmpegLog.info('[FFmpeg stderr]\n' + stderrData);
          }
        }
        resolve();
      } else {
        const errorMsg = [
          `FFmpeg 执行失败，退出码: ${code}`,
          `命令: ${fullCommand}`,
          stderrData ? `错误输出:\n${stderrData}` : '',
          stdoutData ? `标准输出:\n${stdoutData}` : ''
        ].filter(Boolean).join('\n\n');

        console.error(errorMsg);
        ffmpegLog.info('[FFmpeg Error]\n' + errorMsg);
        reject(new Error(errorMsg));
      }
    });

    child.on('error', (err) => {
      const errMsg = [
        `FFmpeg 进程错误: ${err.message}`,
        `命令: ${fullCommand}`
      ].join('\n');
      console.error(errMsg);
      ffmpegLog.info('[FFmpeg Process Error]\n' + errMsg);
      reject(new Error(errMsg));
    });
  });
}


/**
 * 解析分析结果文件（支持视觉分镜和静默检测）
 * @param {string} filePath - 分析结果文件路径
 * @param {number} mode - 分析模式 (1:视觉 4:音频)
 * @returns {Promise<number[]>} - 返回分镜时间点数组（单位：秒）
 */
async function parseAnalysisResults(filePath, mode) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const lines = data.split('\n').filter((line) => line.trim() !== '');

    // 模式1：视觉分镜检测（scdet输出）
    if (mode === 1) {
      const timePoints = [];
      for (const line of lines) {
        // 示例行：frame:17477 pts:2802744 pts_time:31.1416 scene:1
        const match = line.match(/pts_time:([\d.]+).*scene:1/);
        if (match) {
          const time = parseFloat(match[1]);
          if (!isNaN(time)) {
            timePoints.push(time);
          }
        }
      }
      return [...new Set(timePoints)] // 去重
        .sort((a, b) => a - b) // 排序
        .filter((t) => t > 0.1); // 过滤无效时间
    }

    // 模式4：音频静默检测
    if (mode === 4) {
      const silencePoints = [];
      let lastSilenceEnd = 0;

      for (let i = 0; i < lines.length; i++) {
        // 示例行：
        // lavfi.silence_start=5.672
        // lavfi.silence_end=7.904
        if (lines[i].includes('silence_start')) {
          const start = parseFloat(lines[i].split('=')[1]);
          const endLine = lines.find((l, idx) => idx > i && l.includes('silence_end'));
          const end = endLine ? parseFloat(endLine.split('=')[1]) : start + 1;

          // 记录静默结束后的时间点作为分镜点
          if (end > lastSilenceEnd) {
            silencePoints.push(end);
            lastSilenceEnd = end;
          }
        }
      }
      return silencePoints.filter((t) => t > 0.5); // 过滤短于0.5秒的静默
    }

    throw new Error(`不支持的解析模式: ${mode}`);
  } catch (error) {
    console.error('解析分析结果失败:', error);
    return []; // 始终返回数组防止后续处理出错
  }
}

module.exports = { smartSceneDetection };
