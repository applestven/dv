const fs = require('fs');
const path = require('path');
const platformConfig = require('./platformCookieConfig');
const { refreshPlatformCookie } = require('./refreshPlatformCookie');

function matchPlatform(url) {
  return Object.values(platformConfig).find(p =>
    p.domains.some(d => url.includes(d))
  ) || platformConfig.generic;
}

function isExpired(cookiePath, days) {
  if (!fs.existsSync(cookiePath)) return true;

  const stat = fs.statSync(cookiePath);
  const age = (Date.now() - stat.mtimeMs) / 86400000;
  return age > days;
}

async function ensureFreshCookie(url) {
  const platform = matchPlatform(url);

  if (!platform || !platform.cookiePath) {
    return null;
  }

  const {
    cookiePath,
    refreshIntervalDays,
    refreshStrategy, // ⭐ 关键
  } = platform;

  const expired = isExpired(cookiePath, refreshIntervalDays);

  if (!expired) {
    return cookiePath;
  }

  console.log('[cookie] refreshing for', url);

  try {
    await refreshPlatformCookie({
      platform,
      url,              // ⭐ 必须传
      strategy: refreshStrategy,
    });
  } catch (err) {
    console.warn('[cookie] refresh failed:', err.message);
    // ❗ 不 throw，让上层决定是否 retry / fallback
  }

  return cookiePath;
}


module.exports = { ensureFreshCookie };
