const { execFile, spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const path = require('path');
const ffprobePath = require('ffprobe-static').path;
const fs = require('fs').promises;
const { store } = require('../../store');
const { ffmpegLog } = require('../log/index.js');

// 调试模式配置
const debug = store.get('debug');

// 基础函数：获取媒体时长
async function getDuration(filePath, isVideo = false) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];

    execFile(ffprobePath, args, (error, stdout) => {
      if (error) return reject(new Error(`FFprobe error: ${error.message}`));
      const duration = parseFloat(stdout);
      resolve(isVideo ? duration : Math.ceil(duration));
    });
  });
}

// Fisher-Yates洗牌算法
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 修改后的视频库处理器（支持子目录）
async function processVideoLibrary(folder) {
  const library = new Map();

  async function scanDirectory(dir) {
    const items = await fs.readdir(dir);

    await Promise.all(
      items.map(async (item) => {
        const fullPath = path.join(dir, item);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
          await scanDirectory(fullPath); // 递归处理子目录
        } else if (stats.isFile()) {
          try {
            const duration = await getDuration(fullPath, true);
            const durationKey = duration.toFixed(3);

            if (!library.has(durationKey)) {
              library.set(durationKey, []);
            }

            library.get(durationKey).push({
              path: fullPath,
              usage: 0,
              lastUsed: 0,
            });
          } catch (e) {
            console.warn(`Skipped invalid file: ${item}`, e.message);
          }
        }
      })
    );
  }

  await scanDirectory(folder);
  // console.log('视频库统计：', Array.from(library.keys()).length + ' 种不同时长', library);
  ffmpegLog.info('分镜视频共：', Array.from(library.keys()).length + ' 种不同时长');
  if(Array.from(library.keys()).length < 5) {
    // return error('视频库过少，请检查视频库路径！');
    // 抛出错误
    throw new Error('视频库过少，请检查视频库路径！');
  }
  return library;
}

// 组合生成算法（动态规划优化版）
// 改进的组合生成算法
function findOptimalCombinations(durations, target, maxTolerance = 2.0) {
  // 提高精度避免浮点误差
  const precisionFactor = 1000;
  target = Math.round(target * precisionFactor);
  maxTolerance = Math.round(maxTolerance * precisionFactor);

  // 过滤无效时长并转换精度
  durations = [...new Set(durations)]
    .filter((d) => typeof d === 'number' && d > 0)
    .map((d) => Math.round(d * precisionFactor))
    .sort((a, b) => b - a); // 降序排列

  // 创建动态规划数组
  const dpSize = target + maxTolerance + 1;
  const dp = Array.from({ length: dpSize }, () => []);
  dp[0] = [{ segments: [], sum: 0 }];

  // 动态规划处理
  for (const duration of durations) {
    for (let sum = target + maxTolerance; sum >= duration; sum--) {
      const prevSum = sum - duration;

      // 确保索引有效
      if (prevSum < 0 || prevSum >= dpSize) continue;

      const prevCombos = dp[prevSum];
      if (prevCombos && prevCombos.length > 0) {
        prevCombos.forEach((combo) => {
          const newSum = combo.sum + duration;
          if (newSum <= target + maxTolerance) {
            const existing = dp[newSum].find(
              (c) => c.segments.length === combo.segments.length + 1
            );
            if (!existing) {
              dp[newSum].push({
                segments: [...combo.segments, duration],
                sum: newSum,
              });
            }
          }
        });
      }
    }
  }

  // 收集并转换有效组合
  const validCombinations = [];
  const minSum = Math.max(0, target - maxTolerance);
  const maxSum = target + maxTolerance;

  for (let sum = minSum; sum <= maxSum; sum++) {
    if (dp[sum] && dp[sum].length > 0) {
      dp[sum].forEach((combo) => {
        validCombinations.push({
          segments: combo.segments.map((d) => d / precisionFactor),
          total: combo.sum / precisionFactor,
          score: calculateScore(
            combo.segments.map((d) => d / precisionFactor),
            target / precisionFactor
          ),
        });
      });
    }
  }

  // 评分函数
  function calculateScore(segments, target) {
    const sum = segments.reduce((a, b) => a + b, 0);
    return 0.7 * (1 - Math.abs(sum - target) / target) + 0.3 * (1 / segments.length);
  }

  return validCombinations.sort((a, b) => b.score - a.score).slice(0, 20);
}
// 分镜选择器
function selectClips(library, requiredDurations) {
  const selectedClips = [];
  const usageMap = new Map();

  for (const duration of requiredDurations) {
    const durationKey = duration.toFixed(3);
    const candidates = library.get(durationKey) || [];

    if (candidates.length === 0) {
      throw new Error(`No clips available for ${durationKey}s`);
    }

    // 选择策略：最少使用 + 最近未使用
    candidates.sort((a, b) => {
      const usageDiff = a.usage - b.usage;
      return usageDiff !== 0 ? usageDiff : a.lastUsed - b.lastUsed;
    });

    const selected = candidates[0];
    selected.usage++;
    selected.lastUsed = Date.now();
    selectedClips.push(selected.path);

    // 更新全局使用统计
    usageMap.set(durationKey, (usageMap.get(durationKey) || 0) + 1);
  }

  return selectedClips;
}

// FFmpeg渲染器
// 参数
// clipListPath: 分镜列表文件路径
// audioPath: 音频文件路径
// outputPath: 输出文件路径
// i: 当前渲染的视频索引
// length: 总共需要渲染的视频数量
async function renderVideo(clipListPath, audioPath, outputPath, i, length) {
  //打印参数
  // console.log('renderVideo@@@clipListPath', clipListPath);
  // console.log('renderVideo@@@audioPath', audioPath);
  // console.log('renderVideo@@@outputPath', outputPath);
  return new Promise((resolve, reject) => {
    const args = [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      clipListPath, // 输入视频片段列表
      '-i',
      audioPath, // 输入音频文件
      '-map',
      '0:v', // 只选择第一个输入的视频流
      '-map',
      '1:a', // 只选择第二个输入的音频流
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest', // 以音频/视频中最短的为准
      '-movflags',
      '+faststart',
      '-y',
      outputPath,
    ];
    const ffmpegProcess = spawn(ffmpegPath, args);

    // 记录logs
    let fullCommandStr = '';
    args.forEach((item) => {
      fullCommandStr += item + ' ';
    });
    if (debug) ffmpegLog['info']('执行FFmpeg命令:' + ffmpegPath + ' ' + fullCommandStr + '\n');



    //
    ffmpegProcess.on('close', (code) => {
      ffmpegLog.info(`生成第${i + 1}视频完成，文件位置：${outputPath}`);
      if (i + 1 == length) {
        ffmpegLog.info(`所有视频生成完成`);
      }
      // 删除临时文件
      fs.unlink(clipListPath)
        .then(() => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        })
        .catch((unlinkError) => {
          console.warn('Failed to delete temp file:', unlinkError);
        });
    });

    if (debug) {
      ffmpegProcess.stderr.on('data', (data) => {
        if (debug) ffmpegLog.info(`FFmpeg: ${data.toString()}`);
      });
    }
  });
}

// 文件夹清理工具
async function clearFolder(folder) {
  try {
    const files = await fs.readdir(folder);
    await Promise.all(
      files.map(async (item) => {
        const fullPath = path.join(folder, item);
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      })
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

// 主入口函数
async function autoMixClip(generateQuantity = 5, audioFolder, videoFolder, savePath) {
  ffmpegLog.info('开始智能混剪视频，请稍后...生成数量：' + generateQuantity);
  try {
    // console.log('@@savePath', savePath);
    // console.log('@@audioFolder', audioFolder);
    // console.log('@@videoFolder', videoFolder);
    // 初始化工作目录
    // const outputDir = path.join(savePath, '混剪视频');
    const outputDir = path.join(savePath);
    await fs.mkdir(outputDir, { recursive: true });
    await clearFolder(outputDir);

    // 加载媒体库
    const [videoLibrary, audioFiles] = await Promise.all([
      processVideoLibrary(videoFolder),
      fs
        .readdir(audioFolder)
        .then((files) => files.filter((f) => ['.mp3', '.wav', '.m4a'].includes(path.extname(f)))),
    ]);

    // 参数校验
    if (audioFiles.length === 0) throw new Error('No valid audio files found');
    const durationList = [...videoLibrary.keys()].map(Number);
    if (durationList.length === 0) throw new Error('No valid video clips found');

    ffmpegLog.info("正在智能匹配分镜视频和音频文件，请稍后...")
    // 生产流水线
    for (let i = 0; i < generateQuantity; i++) {
      const startTime = Date.now();
      try {
        // 随机选择音频
        const audioFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];
        const audioPath = path.join(audioFolder, audioFile);
        const targetDuration = await getDuration(audioPath);

        console.log(`Processing ${i + 1}/${generateQuantity}: ${audioFile}`);

        // 动态容差策略
        let tolerance = Math.min(1.0, targetDuration * 0.05);
        // console.log("@@@tolerance",tolerance)
        let combinations = findOptimalCombinations(durationList, targetDuration, tolerance);
        // console.log('@@@匹配规则combinations', combinations);
        // 容差递增策略
        let attempts = 0;
        while (combinations.length === 0 && attempts < 3) {
          tolerance += 0.5;
          combinations = findOptimalCombinations(durationList, targetDuration, tolerance);
          attempts++;
        }

        if (combinations.length === 0) {
          console.warn(`No valid combination found after ${attempts} attempts`);
          continue;
        }

        // 选择并准备分镜
        const bestCombo = combinations[0];
        console.log('bestCombo', bestCombo);
        const clipPaths = selectClips(videoLibrary, shuffleArray(bestCombo.segments));
        // console.log('@@@clipPaths', clipPaths);


        // 生成临时文件列表
        const listPath = path.join(outputDir, `temp_${Date.now()}.txt`);
        await fs.writeFile(listPath, clipPaths.map((p) => `file '${p}'`).join('\n'));

        // 渲染输出
        const outputFile = path.join(outputDir, `output_${i}_${Date.now()}.mp4`);
        await renderVideo(listPath, audioPath, outputFile, i, generateQuantity);

        // console.log(`Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        ffmpegLog.log(`Completed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error(`Error processing item ${i + 1}:`, error.message);
      }
    }

    return { success: true, outputDir };
  } catch (error) {
    console.error('Critical error in autoMixClip:', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    };
  }
}

module.exports = {
  autoMixClip,
  utils: {
    getDuration,
    shuffleArray,
    clearFolder,
  },
};

// 混剪说明 :

//             以音频为视频长度 使用算法拼接分镜视频 生成一个完整视频

//             参数 : 生成个数 generateQuantity
//             音频文件夹 audioFolder
//             分镜视频文件夹 videoFolder
//             导出文件夹 savePath

//             生成视频算法 :
//             1. 读取音频文件夹下所有的音频文件 随机选中一个 获取到音频的长度
//             2. 获取到所有的分镜视频的属性（包括子文件夹的所有的分镜视频） 如长度 具体路径 名称等
//             3.根据音频的长度 写出多个公式(最多为10种超过不去算)  随机选中公式
//             2. 分镜视频的长度很有可能重复比如都为1秒 这个时候随机选择一个分镜视频避免重复从上往下取

//             举个例子 {time:1,videoNma:'1.mp4',path:'./1.mp4'} {time:2,videoNma:'2.mp4',path:'./2.mp4'} {time:3,videoNma:'3.mp4',path:'./3.mp4'}

//             此时的音频长度为10

//             那么拼接公式可能为 1+2+3+4 = 10  1+1+3+4 = 10 等等  随机选中公式

//             比如选中 1+2+3+4  打乱公式 3+1+2+4

//             以公式 3+1+2+4 取分镜视频 但分镜视频又会有多个 满足3s的分镜视频有五个 那么从五个中再随机取一个

//             最后 使用ffmpeg拼接分镜视频 使用选中的音频 生成一个新的视频

// 报错 ：Error processing item 1: Cannot read properties of undefined (reading 'length')
