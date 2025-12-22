// src/downloader/ytDlpRunner.js
const { spawn } = require('child_process');
const path = require('path');
const { resolveYtDlpPath } = require('./ytDlpBinary');
// const { downloadLog } = require('../log');
const fs = require('fs');
const {
    buildYtDlpArgs,
    getFallbackQualities,
} = require('./ytDlpArgsBuilder');

async function runYtDlp(options) {
    const {
        url,
        outputDir = path.resolve(process.cwd(), 'downloads'),
        cookies,
        userAgent,
        timeout = 10 * 60 * 1000,
        extraArgs = [],
        debug = false, // ⭐ 开发 / 生产切换
    } = options;

    if (!url) {
        throw new Error('yt-dlp: url is required');
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const ytDlpBin = resolveYtDlpPath();

    const args = [];

    // cookies 永远最前
    if (cookies) {
        args.push('--cookies', cookies);
    }

    if (userAgent) {
        args.push('--user-agent', userAgent);
    }

    // 业务参数
    args.push(...extraArgs);

    // URL 永远最后
    args.push(url);

    console.log('[yt-dlp]', ytDlpBin, args.join(' '));

    return new Promise((resolve, reject) => {
        const proc = spawn(ytDlpBin, args, {
            windowsHide: true,
            stdio: debug ? 'inherit' : ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';

        const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error('yt-dlp timeout'));
        }, timeout);

        if (!debug) {
            proc.stderr.on('data', (d) => {
                stderr += d.toString();
            });
        }

        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });

        proc.on('close', (code) => {
            clearTimeout(timer);

            if (code === 0) {
                resolve();
            } else {
                reject(new Error(stderr || `yt-dlp exited with code ${code}`));
            }
        });
    });
}

function runOnce({
    url,
    outputDir,
    quality,
    cookies,
    userAgent,
    timeout,
}) {
    return new Promise((resolve, reject) => {
        const ytDlpBin = resolveYtDlpPath();
        const baseArgs = buildYtDlpArgs({ url, quality });
        const suffix = quality ? `-${quality}` : '';

        const args = [
            ...baseArgs,
            '-o', path.join(outputDir, `%(title)s${suffix}.%(ext)s`),
            '--merge-output-format', 'mp4',
            '--write-thumbnail',
            '--print-json',
            '--no-part',
            '--no-playlist',
        ];

        if (cookies) args.push('--cookies', cookies);
        if (userAgent) args.push('--user-agent', userAgent);

        console.log('[yt-dlp]', ytDlpBin, args.join(' '));

        const proc = spawn(ytDlpBin, args, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stderr = '';
        let lastJson;

        const timer = setTimeout(() => {
            proc.kill('SIGKILL');
            reject(new Error('yt-dlp timeout'));
        }, timeout);

        proc.stdout.on('data', d => {
            const text = d.toString();
            console.log(text);

            try {
                lastJson = JSON.parse(text);
            } catch { }
        });

        proc.stderr.on('data', d => {
            stderr += d.toString();
            console.log(d.toString());
        });

        proc.on('close', code => {
            clearTimeout(timer);
            if (code === 0) {
                resolve({
                    quality,
                    metadata: pickMetadata(lastJson),
                });
            } else {
                reject(new Error(stderr || `yt-dlp exit ${code}`));
            }
        });
    });
}

function pickMetadata(info = {}) {
    if (!info) return null;
    return {
        title: info.title,
        duration: info.duration,
        thumbnail: info.thumbnail,
        uploader: info.uploader,
        webpage_url: info.webpage_url,
        format: info.format,
        ext: info.ext,
    };
}

module.exports = { runYtDlp };


// function runYtDlp({
//     url,
//     outputDir = path.resolve(process.cwd(), 'downloads'),
//     quality = 'best',   // ⭐ 新增  worst 最差视频 | audio 获取音频 | best 最佳视频
//     cookies,
//     userAgent,
//     extraArgs = [],
//     timeout = 10 * 60 * 1000,
// }) {
//     return new Promise((resolve, reject) => {
//         try {
//             const ytDlpBin = resolveYtDlpPath();

//             const baseArgs = buildYtDlpArgs({ url, quality });
//             console.log(" runYtDlp -quality", quality)
//             // const args = [
//             //     url,
//             //     // '-f',
//             //     // format,
//             //     '-o',
//             //     path.join(outputDir, '%(title)s.%(ext)s'),
//             //     '--merge-output-format',
//             //     'mp4',
//             //     '--no-part',
//             // ];

//             // const args = [
//             //     url,
//             //     '-f',
//             //     'bestvideo+bestaudio/best',
//             //     '-o',
//             //     path.join(outputDir, '%(title)s.%(ext)s'),
//             //     '--merge-output-format', 'mp4',
//             //     '--no-part',
//             // ];

//             const args = [
//                 ...baseArgs,
//                 '-o', path.join(outputDir, '%(title)s.%(ext)s'),
//                 '--merge-output-format', 'mp4',
//                 '--no-part',
//                 '--no-playlist',
//             ];

//             if (cookies) {
//                 args.push('--cookies', cookies);
//             }

//             if (userAgent) {
//                 args.push('--user-agent', userAgent);
//             }

//             args.push(...extraArgs);

//             // downloadLog.info('[yt-dlp]', ytDlpBin, args.join(' '));
//             console.log('[yt-dlp]', ytDlpBin, args.join(' '));

//             const proc = spawn(ytDlpBin, args, {
//                 windowsHide: true,   // ★ Windows 下避免弹黑框
//                 stdio: ['ignore', 'pipe', 'pipe'],
//             });

//             let stderr = '';

//             const timer = setTimeout(() => {
//                 proc.kill('SIGKILL');
//                 reject(new Error('yt-dlp timeout'));
//             }, timeout);

//             proc.stdout.on('data', (d) => {
//                 //   downloadLog.debug(d.toString());
//                 console.log(d.toString());
//             });

//             proc.stderr.on('data', (d) => {
//                 stderr += d.toString();
//                 //   downloadLog.warn(d.toString());
//                 console.log(d.toString());
//             });

//             proc.on('close', (code) => {
//                 clearTimeout(timer);
//                 if (code === 0) {
//                     resolve();
//                 } else {
//                     reject(new Error(stderr || `yt-dlp exit ${code}`));
//                 }
//             });
//         } catch (error) {
//             console.error(error);
//         }
//     });
// }

// module.exports = { runYtDlp };
