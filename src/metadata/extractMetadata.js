const { spawn } = require('child_process');
const { resolveYtDlpPath } = require('../downloader/ytDlpBinary');

function extractMetadata({ url, cookiePath }) {
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

        proc.stdout.on('data', d => stdout += d.toString());
        proc.stderr.on('data', d => stderr += d.toString());

        proc.on('close', () => {
            // ✅ 正常拿到 metadata
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
                    // JSON 解析失败，继续走失败逻辑
                }
            }

            // ❗ Douyin 登录依赖（明确、可解释的失败）
            if (stderr.includes('Fresh cookies')) {
                return resolve({
                    ok: false,
                    platform: 'douyin',
                    needLogin: true,
                    reason: 'LOGIN_COOKIE_REQUIRED',
                });
            }

            // ❗ 其他失败（保留 stderr，方便日志）
            return resolve({
                ok: false,
                reason: 'DUMP_FAILED',
                stderr,
            });
        });
    });
}

module.exports = { extractMetadata };
