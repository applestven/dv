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
const { detectPlatform } = require('../utils/platformDetect');

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
            '-f',
            'worstvideo[ext=mp4]+bestaudio[ext=m4a]/worst[ext=mp4]',
            '--merge-output-format',
            'mp4',
        ],
        'video-best': [
            '-f',
            'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
            '--merge-output-format',
            'mp4',
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

    kuaishou: {
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
            // 快手不可靠区分 worst / best，直接兜底
            '--merge-output-format', 'mp4',
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
    // 统一把下划线转成中横线
    let q = quality.replace(/_/g, '-');

    // 别名映射：把用户可能传的 audio_worst / audio-worst 映射到我们在 FORMAT_MAP 中定义的 audio-low
    const ALIAS_MAP = {
        'audio-worst': 'audio-low',
        'audio_low': 'audio-low',
        'audio-low': 'audio-low',
        'audio-best': 'audio-best',
        'video-worst': 'video-worst',
        'video-best': 'video-best',
    };

    const normalizedQuality = ALIAS_MAP[q] || q;

    console.log('@@quality debug', { original: quality, normalizedToken: q, normalizedQuality });

    const platformMap = FORMAT_MAP[platform] || FORMAT_MAP.generic;
    let formatArgs = platformMap[normalizedQuality];
    if (!formatArgs) {
        // 兼容原来的下划线/中横线处理（作为兜底）
        const altQuality = q.includes('-') ? q.replace(/-/g, '_') : q.replace(/_/g, '-');
        formatArgs = platformMap[altQuality] || [];
    }
    console.log('@@formatArgs', formatArgs);
    // 如果是 youtube 平台，自动添加 clash 代理参数
    const proxyArgs = platform === 'youtube' ? ['--proxy', 'http://127.0.0.1:7890'] : [];
    return [
        ...formatArgs,
        ...proxyArgs,
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
