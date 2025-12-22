const { extractMetadata } = require('./src/metadata/extractMetadata');
// extractMetadata({
//     url: 'https://v.douyin.com/TP4sJ9eTXZs',
//     cookiePath: 'cookies/douyin.txt',
// });

// 单独跑 runYtDlp（不走 factory） 跑通了
// const { runYtDlp } = require('./src/downloader/ytDlpRunner');
// const { buildYtDlpArgs } = require('./src/downloader/ytDlpArgsBuilder');

// runYtDlp({
//     url: "https://www.bilibili.com/video/BV1Ca2eBHEkL/?spm_id_from=333.1007.tianma.3-4-10.click&vd_source=0c88b82560db687e3ba0427782c655e3",
//     cookies: "",
//     extraArgs: buildYtDlpArgs({
//         quality: 'audio-low',
//         outputDir: './downloads',
//         suffix: 'audio-low',
//     }),
// });


async function test() {
    const { ensureFreshCookie } = require('./src/cookie/cookieManager');

    // const cookiePath = await ensureFreshCookie("https://v.douyin.com/XZVpfWQaPLE");

    // await extractMetadata({
    //     url: "https://v.douyin.com/XZVpfWQaPLE",
    //     cookiePath,
    // });



    const cookiePath = await ensureFreshCookie("https://v.douyin.com/XZVpfWQaPLE");

    // runYtDlp({
    // url,
    // cookies: cookiePath,
    // extraArgs,
    // });


    const meta = await extractMetadata({
        url: "https://v.douyin.com/XZVpfWQaPLE",
        cookiePath,
    });

    if (!meta.ok) {
        console.warn('[metadata] failed:', meta.reason);

        // 👉 继续下载，不要中断
        // yt-dlp 下载通常比 dump-json 宽松
    } else {
        console.log('[metadata]', meta.title);
    }
}
test();