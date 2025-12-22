const { spawn } = require('child_process');
const { resolveYtDlpPath } = require('../downloader/ytDlpBinary');
const { ensureFreshCookie } = require('../cookie/cookieManager');

function runDump({ url, cookiePath }) {
    return new Promise((resolve, reject) => {
        const ytDlp = resolveYtDlpPath();

        const args = [
            '--dump-json',
            '--no-playlist',
        ];

        if (cookiePath) {
            args.push('--cookies', cookiePath);
        }

        args.push(url);

        const proc = spawn(ytDlp, args, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);

        proc.on('close', code => {
            if (code === 0 && stdout) {
                resolve(JSON.parse(stdout));
            } else {
                reject(new Error(stderr || 'yt-dlp dump failed'));
            }
        });
    });
}

function extractMetadata({ url, cookiePath, retry = 0 }) {
    return new Promise((resolve) => {
        const ytDlpBin = resolveYtDlpPath();

        const args = [
            '--dump-json',
            '--no-playlist',
        ];

        if (cookiePath) {
            args.push('--cookies', cookiePath);
        }

        args.push(url);

        const proc = spawn(ytDlpBin, args, {
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);

        proc.on('close', async () => {
            // ✅ 成功
            if (stdout.trim().startsWith('{')) {
                try {
                    const json = JSON.parse(stdout);
                    return resolve({
                        ok: true,
                        platform: json.extractor_key,
                        title: json.title,
                        duration: json.duration,
                        thumbnail: json.thumbnail,
                        raw: json,
                    });
                } catch {
                    // fallthrough
                }
            }

            // ❗ Douyin / 风控 / cookie 问题 —— 不抛异常
            if (
                stderr.includes('Fresh cookies') ||
                stderr.includes('Failed to parse JSON')
            ) {
                console.warn('[metadata] need fresh cookies for', url, stderr);
                return resolve({
                    ok: false,
                    needLogin: true,
                    reason: 'COOKIE_REQUIRED',
                    stderr,
                });
            }

            // ❗ 其他未知失败
            return resolve({
                ok: false,
                reason: 'DUMP_FAILED',
                stderr,
            });
        });
    });
}



module.exports = { extractMetadata };
