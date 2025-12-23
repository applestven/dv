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
    return quality.startsWith('audio_');
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
        if (platform === 'douyin') {
            const cookieInvalid =
                !autoCookie ||
                !fs.existsSync(autoCookie);

            if (cookieInvalid) {
                console.log('[douyin] refreshing fresh cookies via puppeteer...');
                autoCookie = await refreshDouyinCookie();
            }
        }

        const ytDlpBin = resolveYtDlpPath();

        const ytDlpArgs = buildYtDlpArgs({
            platform,
            quality: quality.replace('_', '-'),
            outputDir,
            suffix: quality,
        });

        const args = [
            url,
            ...ytDlpArgs,
            '--no-playlist',
        ];

        if (!isAudioMode(quality)) {
            args.push('--merge-output-format', 'mp4');
        }

        // ⭐ 注入 cookie
        if (autoCookie) {
            args.push('--cookies', autoCookie);
            console.log(`[yt-dlp] using cookie: ${autoCookie}`);
        }

        if (userAgent) {
            args.push('--user-agent', userAgent);
        }

        args.push(...extraArgs);

        console.log('[yt-dlp]', ytDlpBin, args.join(' '));

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
