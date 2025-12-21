const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const path = require('path');
const ffprobePath = require('ffprobe-static').path;
const fs = require('fs').promises;
const { clearFolder } = require('../../utils/fileDeal');
const { store } = require('../../store');
const debug = store.get('debug');
const { checkAndCreateFolder } = require('../../utils/initIpc/file');
const { ffmpegLog } = require('../../utils/log/index.js');

// 获取音视频流信息
async function getStreamInfo(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobePath,
      ['-v', 'error', '-show_streams', '-of', 'json', filePath],
      (error, stdout, stderr) => {
        if (error) return reject(error);
        try {
          const { streams = [] } = JSON.parse(stdout);
          resolve({
            hasVideo: streams.some((s) => s.codec_type === 'video'),
            hasAudio: streams.some((s) => s.codec_type === 'audio'),
            audioCodec: streams.find((s) => s.codec_type === 'audio')?.codec_name,
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

// 音频编码到扩展名映射
const AUDIO_EXT_MAP = {
  aac: 'm4a',
  mp3: 'mp3',
  opus: 'opus',
  vorbis: 'ogg',
  pcm_s16le: 'wav',
};

// 执行FFmpeg命令
function runFFmpeg(args, inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      //参数打印
      console.log('ffmpegPath', ffmpegPath);
      console.log('@@args', args, '@@inputPath', inputPath, '@@outputPath', outputPath);

      execFile(ffmpegPath, args, (error) => {
        if (error) {
          reject(new Error(`处理失败: ${path.basename(inputPath)} (${error.message})`));
        } else {
          debug &&
            ffmpegLog['info'](
              `处理成功: ${path.basename(inputPath)} → ${path.basename(outputPath)}`
            );
          resolve();
        }
      });
    } catch (error) {
      console.log('runFFmpeg', error);
    }
  });
}

// 处理单个文件
async function processFile(filePath, videoDir, audioDir) {
  const { hasVideo, hasAudio, audioCodec } = await getStreamInfo(filePath);
  const promises = [];
  const basename = path.parse(filePath).name;

  // 处理视频
  if (hasVideo) {
    const output = path.join(videoDir, path.basename(filePath));
    promises.push(
      runFFmpeg(['-i', filePath, '-map', '0:v', '-c:v', 'copy', '-y', output], filePath, output)
    );
  }

  // 处理音频
  if (hasAudio) {
    const ext = AUDIO_EXT_MAP[audioCodec] || 'aac';
    const output = path.join(audioDir, `${basename}.${ext}`);
    promises.push(
      runFFmpeg(['-i', filePath, '-map', '0:a', '-c:a', 'copy', '-y', output], filePath, output)
    );
  }

  await Promise.all(promises);
}

// 主方法
async function splitAudioVideo(folder, exportfolder, progress) {
  try {
    const videoDir = path.join(exportfolder, 'video');
    const audioDir = path.join(exportfolder, 'audio');

    // 初始化目录
    await checkAndCreateFolder(videoDir);
    await checkAndCreateFolder(audioDir);
    await clearFolder(videoDir);
    await clearFolder(audioDir);

    // 获取有效媒体文件
    const files = (await fs.readdir(folder))
      .filter((f) => !f.startsWith('.')) // 忽略隐藏文件
      .map((f) => path.join(folder, f));

    // 过滤有效媒体文件
    const validFiles = [];
    for (const file of files) {
      try {
        const { hasVideo, hasAudio } = await getStreamInfo(file);
        if (hasVideo || hasAudio) validFiles.push(file);
      } catch (e) {
        ffmpegLog['error'](`[跳过] 无效媒体文件: ${path.basename(file)}`);
      }
    }

    // 处理进度更新
    const total = validFiles.length;
    let processed = 0;
    const updateProgress = () => progress(Math.min(++processed / total, 1));

    // 顺序处理保证进度准确
    for (const file of validFiles) {
      try {
        await processFile(file, videoDir, audioDir);
      } catch (e) {
        ffmpegLog['error'](
          `[失败] ${'audioVideoSeparation.js ' + e.message + '@@@' + videoDir + '---' + audioDir}`
        );
      } finally {
        updateProgress();
      }
    }
  } catch (error) {
    console.log('splitAudioVideo ', error);
    throw error;
  }
}

module.exports = { splitAudioVideo };
