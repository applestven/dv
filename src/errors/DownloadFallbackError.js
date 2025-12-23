// ✅ 不在 runYtDlp 内部调用 puppeteer

// ✅ 失败时返回一个「结构化错误」

// ✅ 告诉上层：这个失败是否“建议走 puppeteer”


class DownloadFallbackError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'DownloadFallbackError';

        // ⭐ 是否建议走 puppeteer
        this.canFallback = true;

        // 原始 stderr / 错误信息
        this.raw = options.raw || '';

        // 平台信息（douyin / bilibili / generic）
        this.platform = options.platform;

        // 原始 url
        this.url = options.url;
    }
}

module.exports = { DownloadFallbackError };
