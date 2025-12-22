// src/downloader/ytDlpArgsBuilder.js

// 这个文件就是你以后维护的平台核心

// 根据不同平台（主要是音视频分离）单独工具文件（重点）

// 现在的 ytDlpRunner 不用再关心平台、质量

// type DownloadQuality =
//   | 'best'        // 最佳画质（默认）
//   | 'worst'       // 最差画质
//   | 'video-720p'  // 限制分辨率
//   | 'audio-best'  // 高质量音频
//   | 'audio-low';  // 低质量音频（快、体积小）

const path = require('path');

function detectPlatform(url = '') {
    if (/bilibili\.com/.test(url)) return 'bilibili';
    if (/douyin\.com|v\.douyin\.com/.test(url)) return 'douyin';
    if (/tiktok\.com/.test(url)) return 'tiktok';
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    return 'generic';
}

/**
 * 根据 quality + platform 构建 args
 */
// function buildYtDlpArgs({ url, quality = 'best' }) {
//     const platform = detectPlatform(url);
//     const args = [];

//     /* ---------- 音频模式 ---------- */
//     if (quality === 'audio-best') {
//         return [
//             url,
//             '-x',
//             '--audio-format', 'mp3',
//             '--audio-quality', '0', // best
//         ];
//     }

//     if (quality === 'audio-low') {
//         return [
//             url,
//             '-x',
//             '--audio-format', 'mp3',
//             '--audio-quality', '9', // worst
//         ];
//     }

//     /* ---------- 视频最差 ---------- */
//     if (quality === 'worst') {
//         if (['bilibili', 'youtube'].includes(platform)) {
//             args.push('-f', 'worstvideo+worstaudio/worst');
//         } else {
//             args.push('-f', 'worst');
//         }
//         return [url, ...args];
//     }

//     /* ---------- 720p ---------- */
//     if (quality === 'video-720p') {
//         if (['bilibili', 'youtube'].includes(platform)) {
//             args.push(
//                 '-f',
//                 'bestvideo[height<=720]+bestaudio/best[height<=720]'
//             );
//         }
//         // 抖音 / tiktok：不保证分辨率，交给 yt-dlp
//         return [url, ...args];
//     }

//     /* ---------- best（默认） ---------- */
//     if (['bilibili', 'youtube'].includes(platform)) {
//         args.push('-f', 'bestvideo+bestaudio/best');
//     }

//     return [url, ...args];
// }

// function buildYtDlpArgs({ platform, quality, suffix }) {
//   const map = {
//     'audio-low': ['-f', 'worst', '-x', '--audio-format', 'mp3', '--audio-quality', '9'],
//     'audio-best': ['-x', '--audio-format', 'mp3', '--audio-quality', '0'],
//     'video-worst': ['-f', 'worst', '--merge-output-format', 'mp4'],
//     'video-720p': ['-f', 'bv*[height<=720]/bv*+ba/b'],
//     'video-best': ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4'],
//   };

//   return [
//     ...(map[quality] || []),
//     '-o',
//     `%(title)s-${suffix}.%(ext)s`,
//   ];
// }

const FORMAT_MAP = {
    bilibili: {
        'audio-low': [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '9',
        ],
        'audio-best': [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
        ],
        'video-worst': [
            '-f', 'bv*+ba/b',
            '--merge-output-format', 'mp4',
        ],
        'video-best': [
            '-f', 'bv*+ba/bv*',
            '--merge-output-format', 'mp4',
        ],
    },

    youtube: {
        'audio-low': [
            '-f', 'ba/worst',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '9',
        ],
        'audio-best': [
            '-f', 'ba/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
        ],
        'video-worst': [
            '-f', 'worstvideo+bestaudio/worst',
            '--merge-output-format', 'mp4',
        ],
        'video-best': [
            '-f', 'bestvideo+bestaudio/best',
            '--merge-output-format', 'mp4',
        ],
    },

    douyin: {
        'audio-low': [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '9',
        ],
        'audio-best': [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
        ],
        'video-best': [
            '--merge-output-format', 'mp4',
        ],
    },

    generic: {
        'audio-low': [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '9',
        ],
        'audio-best': [
            '-f', 'bestaudio/best',
            '-x',
            '--audio-format', 'mp3',
            '--audio-quality', '0',
        ],
        'video-best': [
            '--merge-output-format', 'mp4',
        ],
    },
};

function buildYtDlpArgs({
    platform = 'generic',
    quality = 'video-best',
    outputDir,
    suffix,
}) {
    const platformMap = FORMAT_MAP[platform] || FORMAT_MAP.generic;
    const formatArgs = platformMap[quality] || [];

    return [
        ...formatArgs,
        '-o',
        path.join(outputDir, `%(title)s-${suffix}.%(ext)s`),
        '--no-part',
    ];
}


/**
 * fallback 顺序
 */
function getFallbackQualities(quality) {
    const map = {
        best: ['worst'],
        'video-720p': ['best', 'worst'],
        'audio-best': ['audio-low'],
    };
    return map[quality] || [];
}







module.exports = {
    buildYtDlpArgs,
    getFallbackQualities,
    detectPlatform,
};
