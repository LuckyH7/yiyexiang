/* ═══════════════════════════════════════════
   一叶知乡 · 离线缓存 Service Worker
   目的：首次打开后把页面与全部静态资源存入本机，
        此后断网仍可打开、可检索知识库、可看监测与溯源。
   跨域请求（Open-Meteo 气象接口）不拦截，断网时由页面
   自身的降级逻辑处理（缓存值 / 模拟值）。
   ═══════════════════════════════════════════ */

const VERSION = 'yiyexiang-v2';
const CORE = [
  './',
  './index.html',
  './assets/manifest.json',
  './assets/css/style.css',
  './assets/js/data.js',
  './assets/js/charts.js',
  './assets/js/kb.js',
  './assets/js/weather.js',
  './assets/js/app.js',
  './assets/img/hero-mountain.jpg',
  './assets/img/tea-still-life.jpg',
  './assets/img/icon.svg'
];

const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><title>一叶知乡 · 离线</title>' +
  '<body style="font-family:system-ui,-apple-system,\'PingFang SC\',sans-serif;background:#F6F1E7;color:#1F4736;margin:0;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center">' +
  '<div><h1 style="font-size:22px;margin:0 0 10px">本机缓存尚未建立</h1>' +
  '<p style="color:#6B7C71;font-size:14px;line-height:1.7;margin:0">请联网打开一次本页，之后即可离线使用。</p></div></body>';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // 气象接口等跨域请求不接管

  // 页面导航：优先联网取新版，失败则回退本机缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html')
          .then(hit => hit || caches.match('./'))
          .then(hit => hit || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
    );
    return;
  }

  // 静态资源：先用缓存，同时后台更新
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
