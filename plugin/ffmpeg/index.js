const { execFile } = require('child_process');
// const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked')

// const ffprobePath = require('ffprobe-static').path

// Get the paths to the packaged versions of the binaries we want to use
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');
// tell the ffmpeg package where it can find the needed binaries.
// ffmpeg.setFfmpegPath(ffmpegPath)
// ffmpeg.setFfprobePath(ffprobePath)

// 获取ffmpeg版本信息
function getFFmpegVersion() {
  return new Promise((resolve, reject) => {
    execFile(ffmpegPath, ['-version'], (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        const match = /version (\S+)/.exec(stdout);
        if (!match) {
          reject(new Error('无法获取版本信息'));
        } else {
          resolve(match[1]);
        }
      }
    });
  });
}
// 转换视频
function convertAudio(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-i', inputFile, '-acodec', 'libmp3lame', '-ab', '128k', outputFile],
      {
        maxBuffer: 10 * 1024 * 1024,
      },
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

// 得到视频时间
function getVideoDuration(inputFile) {
  // 返回一个Promise对象
  return new Promise((resolve, reject) => {
    // 执行ffprobe命令
    execFile(
      ffprobePath,
      ['-i', inputFile, '-show_format', '-v', 'quiet'],
      {
        maxBuffer: 10 * 1024 * 1024,
      },
      (error, stdout) => {
        // 如果出错，则拒绝Promise
        if (error) {
          reject(error);
        } else {
          // 找到duration字段
          const match = /duration=(\d+:\d+:\d+)/m.exec(stdout);
          if (match) {
            // 将字段转换为数字
            const [hours, minutes, seconds] = match.groups();
            const duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
            resolve(duration);
          } else {
            // 没有找到duration字段，则拒绝Promise
            reject(new Error('无法获取视频持续时间'));
          }
        }
      }
    );
  });
}

// 获取视频第一帧
function getVideoFirstFrame(videoPath, outputPath) {
  // console.log("videoPath",videoPath,"outputPath",outputPath)
  return new Promise((resolve, reject) => {
    const command = ffmpegPath;

    const args = [
      '-ss',
      '00:00:00.001', // 设置截取时间为视频的第一帧
      '-i',
      videoPath,
      '-vframes',
      '1', // 设置只截取一帧
      '-f',
      'image2', // 指定输出格式为图片
      outputPath,
    ];
    console.log(
      'command',
      command,
      'args',
      args,
      'ffmpegPath',
      ffmpegPath,
      'ffprobePath',
      ffprobePath
    );
    // 执行 FFmpeg 命令
    execFile(command, args, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(outputPath);
    });
  });
}

// 合并音视频
function mergeAudioVideo(audioPath, videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    const command = ffmpegPath;

    const args = [
      '-i',
      videoPath,
      '-i',
      audioPath,
      '-c:v',
      'copy', // 使用原始视频编码
      '-c:a',
      'aac', // 使用 AAC 编码音频
      '-strict', // 输出长度与音频最短部分一致
      'experimental',
      outputPath,
    ];
    // 执行 FFmpeg 命令
    execFile(command, args, (error) => {
      if (error) {
        console.log('合并音视频失败', error);
        reject(error);
        return;
      }
      resolve(outputPath);
    });
  });
}

// 重新编码为普适编码h264
function reEncodeH264Video(inputFile, outputFile) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      [
        '-i',
        inputFile,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-b:a',
        '128k',
        outputFile,
      ],
      {
        maxBuffer: 10 * 1024 * 1024,
      },
      (error) => {
        if (error) {
          console.log('重新编码为普适编码h264失败', error);
          reject(error);
          return;
        }
        resolve(outputFile);
      }
    );
  });
}

module.exports = {
  getFFmpegVersion,
  convertAudio,
  getVideoDuration,
  getVideoFirstFrame,
  mergeAudioVideo,
  reEncodeH264Video,
};
