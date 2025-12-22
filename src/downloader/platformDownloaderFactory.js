// ① platformDownloaderFactory（核心）

// 👉 统一入口
// 👉 根据 URL 自动识别平台
// 👉 自动处理 cookies / retry / fallback
// 👉 自动缓存 metadata


const { detectPlatform } = require('../utils/platformDetect');
const { getPlatformDownloader } = require('./platforms');
const { ensureCookie } = require('../cookie/cookieManager');
const { extractMetadata } = require('../metadata/extractMetadata');

async function platformDownloaderFactory({
    url,
    quality,
    outputDir,
}) {
    if (!url) {
        throw new Error('platformDownloaderFactory: url is required');
    }
    const platform = detectPlatform(url);
    const downloader = getPlatformDownloader(platform);

    let cookiePath = await ensureCookie(platform);

    try {
        const metadata = await extractMetadata({ url, cookiePath });

        await downloader.download({
            url,
            quality,
            outputDir,
            cookies: cookiePath,
            metadata,
        });

        return metadata;
    } catch (err) {
        // ⭐ 统一 Fresh cookies 兜底
        if (/Fresh cookies/i.test(err.message)) {
            cookiePath = await ensureCookie(platform, true);

            const metadata = await extractMetadata({ url, cookiePath });

            await downloader.download({
                url,
                quality,
                outputDir,
                cookies: cookiePath,
                metadata,
            });

            return metadata;
        }

        throw err;
    }
}

module.exports = { platformDownloaderFactory };
