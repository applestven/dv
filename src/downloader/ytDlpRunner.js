// src/downloader/ytDlpRunner.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { resolveYtDlpPath } = require('./ytDlpBinary');

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

    const ytDlpBin = resolveYtDlpPath();
    const format = resolveFormatByQuality(quality);

    const args = [
        url,
        '-f', format,
        '-o', path.join(outputDir, `%(title)s${quality}.%(ext)s`),
        '--no-playlist',
        '--no-part',
    ];

    // 视频模式才合并 mp4
    if (!isAudioMode(quality)) {
        args.push('--merge-output-format', 'mp4');
    }

    if (cookies) args.push('--cookies', cookies);
    if (userAgent) args.push('--user-agent', userAgent);

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
                reject(new Error(stderr || `yt-dlp exited with ${code}`));
            }
        });
    });
}

module.exports = { runYtDlp };
