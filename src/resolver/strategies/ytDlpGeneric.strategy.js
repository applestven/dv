// resolver/strategies/ytDlpGeneric.strategy.js
const { runYtDlp } = require('../../downloader/ytDlpRunner');

module.exports = async function run(task) {
    return runYtDlp({
        url: task.url,
        outputDir: './downloads',
        extraArgs: ['--force-generic-extractor'],
    });
};
