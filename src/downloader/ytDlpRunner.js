// src/downloader/ytDlpRunner.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { resolveYtDlpPath } = require('./ytDlpBinary');

const { detectPlatform } = require('../utils/platformDetect');
const { resolveCookieByPlatform } = require('../utils/cookieResolver');
const { DownloadFallbackError } = require('../errors/DownloadFallbackError');

const { refreshDouyinCookie } = require('../puppeteer/douyinCookieProvider');

const {
    buildYtDlpArgs
} = require('./ytDlpArgsBuilder');

function resolveFormatByQuality(quality) {
    switch (quality) {
        case 'video_best':
            return 'bestvideo+bestaudio/best';
        case 'video_worst':
            return 'worstvideo+worstaudio/worst';
        case 'audio_best':
            return 'bestaudio';
        case 'audio_worst':
            return 'worstaudio';
        default:
            return 'bestvideo+bestaudio/best';
    }
}

function isAudioMode(quality) {
    // 支持下划线和中横线两种命名：audio_worst / audio-worst
    return quality.startsWith('audio_') || quality.startsWith('audio-');
}

// function runYtDlp({
//     url,
//     outputDir = path.resolve(process.cwd(), 'downloads'),
//     quality = 'video_best',
//     cookies,           // ⭐ 允许外部强制指定
//     userAgent,
//     extraArgs = [],
//     timeout = 10 * 60 * 1000,
// }) {
//     if (!url) {
//         return Promise.reject(new Error('yt-dlp: url is required'));
//     }

//     if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//     }

//     // ⭐ 平台识别
//     const platform = detectPlatform(url);

//     // ⭐ cookie 解析优先级：手动传入 > 平台 cookie > 无
//     const autoCookie = cookies || resolveCookieByPlatform(platform);

//     const ytDlpBin = resolveYtDlpPath();
//     // const format = resolveFormatByQuality(quality);

//     // const args = [
//     //     url,
//     //     '-f', format,
//     //     '-o', path.join(outputDir, `%(title)s-${quality}.%(ext)s`),
//     //     '--no-playlist',
//     //     '--no-part',
//     // ];

//     const ytDlpArgs = buildYtDlpArgs({
//         platform,
//         quality: quality.replace('_', '-'), // video_best → video-best
//         outputDir,
//         suffix: quality,
//     });
//     const args = [
//         url,
//         ...ytDlpArgs,
//         '--no-playlist',
//     ];


//     if (!isAudioMode(quality)) {
//         args.push('--merge-output-format', 'mp4');
//     }

//     // ⭐ 自动注入 cookie（如果存在）
//     if (autoCookie) {
//         args.push('--cookies', autoCookie);
//         console.log(`[yt-dlp] using cookie: ${autoCookie}`);
//     }

//     if (userAgent) {
//         args.push('--user-agent', userAgent);
//     }

//     args.push(...extraArgs);

//     console.log('[yt-dlp]', ytDlpBin, args.join(' '));

//     return new Promise((resolve, reject) => {
//         const proc = spawn(ytDlpBin, args, {
//             windowsHide: true,
//             stdio: ['ignore', 'pipe', 'pipe'],
//         });

//         let stderr = '';

//         const timer = setTimeout(() => {
//             proc.kill('SIGKILL');
//             reject(new Error('yt-dlp timeout'));
//         }, timeout);

//         proc.stdout.on('data', d => console.log(d.toString()));
//         proc.stderr.on('data', d => {
//             stderr += d.toString();
//             console.warn(d.toString());
//         });

//         proc.on('close', code => {
//             clearTimeout(timer);
//             if (code === 0) {
//                 resolve();
//             } else {
//                 reject(new DownloadFallbackError(
//                     'yt-dlp download failed',
//                     {
//                         raw: stderr || `yt-dlp exited with ${code}`,
//                         platform,
//                         url,
//                     }
//                 ));
//             }
//         });
//     });
// }



function runYtDlp({
    url,
    outputDir = path.resolve(process.cwd(), 'downloads'),
    quality = 'video_best',
    cookies,
    userAgent,
    extraArgs = [],
    timeout = 10 * 60 * 1000,
}) {
    if (!url) {
        return Promise.reject(new Error('yt-dlp: url is required'));
    }

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // ⭐ 平台识别
    const platform = detectPlatform(url);
    console.log("@@ 平台识别", platform);

    return (async () => {
        // ⭐ cookie 优先级
        let autoCookie = cookies || resolveCookieByPlatform(platform);
        /**
         * ⭐⭐ 抖音专属策略 ⭐⭐
         * - 没 cookie
         * - 或 cookie 文件不存在
         * → 直接用 puppeteer 刷新
         */
        // 目前没跑通 后续再看
        // if (platform === 'douyin') {
        //     const cookieInvalid =
        //         !autoCookie ||
        //         !fs.existsSync(autoCookie);

        //     if (cookieInvalid) {
        //         console.log('[douyin] refreshing fresh cookies via puppeteer...');
        //         autoCookie = await refreshDouyinCookie();
        //     }
        // }

        const ytDlpBin = resolveYtDlpPath();

        const ytDlpArgs = buildYtDlpArgs({
            platform,
            quality: quality.replace(/_/g, '-'),
            outputDir,
            suffix: quality,
        });

        // 先把所有选项拼好，URL 必须放在最后
        const args = [
            ...ytDlpArgs,
            '--no-playlist',
        ];

        // ⭐ 注入 cookie（必须在 URL 之前）
        if (autoCookie) {
            args.push('--cookies', autoCookie);
            console.log(`[yt-dlp] using cookie: ${autoCookie}`);
        }

        if (userAgent) {
            args.push('--user-agent', userAgent);
        }

        // 如果不是音频模式，确保在 URL 之前加入 merge 输出格式
        if (!isAudioMode(quality)) {
            args.push('--merge-output-format', 'mp4');
        }

        // 用户自定义额外参数也要在 URL 之前
        if (extraArgs && extraArgs.length) {
            args.push(...extraArgs);
        }

        // 最后把 URL 放到参数末尾
        args.push(url);

        // 打印完整参数数组，方便调试（可复制到终端直接运行）
        console.log('[yt-dlp]', ytDlpBin, args.join(' '));
        console.log('[yt-dlp args array]', JSON.stringify(args));

        return new Promise((resolve, reject) => {
            const proc = spawn(ytDlpBin, args, {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let stderr = '';

            const timer = setTimeout(() => {
                proc.kill('SIGKILL');
                reject(new Error('yt-dlp timeout'));
            }, timeout);

            proc.stdout.on('data', d => console.log(d.toString()));
            proc.stderr.on('data', d => {
                stderr += d.toString();
                console.warn(d.toString());
            });

            proc.on('close', code => {
                clearTimeout(timer);
                if (code === 0) {
                    // 查找输出目录中匹配后缀的文件并返回文件路径（优先返回最近修改的）
                    const suffixToken = quality; // buildYtDlpArgs 中使用的 suffix 是原始 quality
                    try {
                        const files = fs.readdirSync(outputDir);
                        const matched = files.filter(f => f.includes(`-${suffixToken}.`));
                        if (matched.length > 0) {
                            matched.sort((a, b) => {
                                const aStat = fs.statSync(path.join(outputDir, a));
                                const bStat = fs.statSync(path.join(outputDir, b));
                                return bStat.mtimeMs - aStat.mtimeMs;
                            });
                            const finalFile = path.join(outputDir, matched[0]);
                            return resolve(finalFile);
                        }
                    } catch (err) {
                        console.warn('[yt-dlp] find output file failed', err.message);
                    }

                    // 未找到文件时仍然正常 resolve（上层可根据是否存在 output 字段判断）
                    resolve();
                } else {
                    reject(new DownloadFallbackError(
                        'yt-dlp download failed',
                        {
                            raw: stderr || `yt-dlp exited with ${code}`,
                            platform,
                            url,
                        }
                    ));
                }
            });
        });
    })();
}


module.exports = { runYtDlp };
