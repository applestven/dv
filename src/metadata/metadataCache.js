//   ⭐ title / duration / cover// metadata/metadataCache.js
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.resolve('metadata-cache.json');

function load() {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE));
}

function save(data) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}

function getCache(url) {
    return load()[url];
}

function setCache(url, meta) {
    const data = load();
    data[url] = meta;
    save(data);
}

module.exports = { getCache, setCache };
