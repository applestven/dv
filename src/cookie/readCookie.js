const fs = require('fs');
const path = require('path');

function readCookieIfExists(platform) {
    const p = path.resolve(process.cwd(), 'cookies', `${platform}.txt`);
    if (fs.existsSync(p)) {
        return p;
    }
    return null;
}

module.exports = { readCookieIfExists };
