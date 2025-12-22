// const { downloadLog }  = require('../log/index.js');
// const { store } = require('../store/index.js');
// const debug = store.get('debug');
const mockVideoList = [
  // 音 视分离 分片传输
  {
    抖音: [
      'https://www.douyin.com/discover?modal_id=7395840723544853769',
      '3.35 02/16 s@r.rE tEU:/ 任武林谁领风骚 我却只为你折腰 # 战国袍的宿命感 # 最美王昭君 # 三峡千古情景区 # 汉服  https://v.douyin.com/iMqhEoPL/ 复制此链接，打开Dou音搜索，直接观看视频！',
    ],
  },
  // 音 视分离 分片传输
  {
    bilbil: [
      'https://www.bilibili.com/video/BV17i421a7Rr/?spm_id_from=333.1007.tianma.1-2-2.click',
      '【深圳保姆揭露顶级富豪逆天奢华生活：“有钱人，和你想的不一样”】 https://www.bilibili.com/video/BV1r24y1k78s/?share_source=copy_web&vd_source=cee3eea1e310905716ead516a0517457',
    ],
  },
  // 音视合并 分片传输
  {
    西瓜视频: [
      'https://www.ixigua.com/7395508316144665123?logTag=8c329126324dbb3c7e6d',
      'https://www.ixigua.com/7395508316144665123',
    ],
  },
  //完整视频传输
  {
    快手: [
      'https://www.kuaishou.com/f/X3WSzyq5difpwM7',
      'https://www.kuaishou.com/short-video/3xbdzwyc97gbk3a?authorId=3xn5uutmx7mrhsa&streamSource=find&area=homexxbrilliant',
    ],
  },
  //完整视频传输
  {
    qq短视: [
      'https://xsj.qq.com/video?feed_key=CgASLT9mPUJfaDU1MmM4NDY2ZWM5YzBlMDBlandOZDNjUWRqNE0wWDVjJnQ9MCZ1PRgA&childmode=0',
    ],
  },
];

const keywordList = ['douyin.com', 'bilibili.com', 'ixigua.com', 'kuaishou.com', 'qq.com', 'jable.tv'];
const keywordType = {
  'douyin.com': {
    platform: '抖音',
    downloadType: 'FULL', // SLICE 分片下载  | FULL 整片下载
    tag: 'source',
  },
  'bilibili.com': {
    platform: 'bilbil',
    downloadType: 'SLICE',
    audioMode: 'separation', // combined  音视合并 // separation 音视分离  判断rule 是否有单独提供音频过滤规则 没有就需要收集两个不一样的url
    // keyCode: { video: "media-video", audio: "media-audio" },
    rule: {
      video: (url) => url.split('?')[0].slice(-3) === 'm4s',
      audio: null,
    },
  },
  'ixigua.com': {
    platform: '西瓜视频',
    downloadType: 'SLICE',
    audioMode: 'combined',
    rule: {
      video: (url) => url.includes('video/tos'),
      audio: null,
    },
  },
  'kuaishou.com': {
    platform: '快手',
    downloadType: 'FULL',
  },
  'qq.com': {
    platform: 'qq短视',
    downloadType: 'FULL',
    tag: 'video',
  },
  'jable.tv': { // 因为需要同时兼容多种下载规则 暂时放弃 准备写通用规则
    platform: 'jable.tv',
    downloadType: 'SLICE',
    tag: 'video',
    audioMode: 'combined',
    rule: {
      video: (url) => url.includes('video/tos'),
      audio: null,
    },
  }
};

// 过滤请求头range数据不同的请求
function removeDuplicateRanges(downloadUrl) {
  const uniqueRanges = new Map();

  // 遍历下载链接列表
  for (const item of downloadUrl) {
    const range = item.headers.range;

    // 如果 map 中没有该 range，则添加进去
    if (!uniqueRanges.has(range)) {
      uniqueRanges.set(range, item);
    }
  }

  // 将 map 的值转换为数组返回
  return Array.from(uniqueRanges.values());
}

// 过滤响应 通过关键字监听页面请求符合的
// 控制监听时间 满足条件个数立即返回
function filterResponse(page, audioRule, videoRule, requestsHeader, downloadUrl, audioMode, browser) {
  return new Promise((resolve) => {
    let resolved = false;

    page.on('response', (response) => {
      if (resolved) return;

      const url = response.url();
      const headers = response.headers();
      const rangeValue = headers['content-range'];

      if (!audioRule && rangeValue) {
        if (videoRule(url) && requestsHeader[url]) {
          downloadUrl.push({
            url,
            headers: {
              ...requestsHeader[url],
              range: '0-' + rangeValue.split('/')[1],
            },
          });
        }
      }

      const result = removeDuplicateRanges(downloadUrl);

      // if (debug) {
      //   downloadLog.info(
      //     `过滤请求响应，剩余请求数量: ${result.length}, 音频模式: ${audioMode}`
      //   );
      // }

      const shouldResolve =
        (audioMode === 'separation' && result.length >= 2) ||
        (audioMode === 'combined' && result.length >= 1);

      if (shouldResolve) {
        resolved = true;
        page.removeAllListeners('response'); // 防止多次触发
        browser?.close?.(); // 如果传入 browser 实例，就关闭
        resolve(result);
      }
    });
  });
}


module.exports = {
  mockVideoList,
  keywordList,
  keywordType,
  removeDuplicateRanges,
  filterResponse,
};
