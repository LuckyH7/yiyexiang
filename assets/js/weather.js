/* ═══════════════════════════════════════════
   一叶知乡 · 实时气象数据层
   ───────────────────────────────────────────
   数据源：Open-Meteo（开放气象接口，无需密钥）
   站点：潮州凤凰山（23.85°N, 116.62°E），按海拔 1,150 m 统计降尺度
   提供：气温 / 空气湿度 / 风速 / 光照强度（由短波辐射换算）
   不提供：土壤含水率、土壤 pH —— 需现场埋设传感器，本版仍为模拟值并标注
   容错：接口不可用时自动降级为模拟值与缓存值，绝不影响演示
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  const LAT = 23.85, LON = 116.62, ELEV = 1150;
  const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + LAT + '&longitude=' + LON + '&elevation=' + ELEV
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,shortwave_radiation,precipitation'
    + '&hourly=temperature_2m,relative_humidity_2m'
    + '&past_days=1&forecast_days=1'
    + '&timezone=Asia%2FShanghai&wind_speed_unit=ms';

  const KEY = 'yy_wx_v1';
  const TTL = 15 * 60 * 1000;

  const S = {
    mode: 'sim',      // live | cache | sim
    at: null,         // 数据时间
    cur: null,
    series: null,     // { t:[], rh:[] } 最近 24 小时
    err: ''
  };

  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad2 = n => String(n).padStart(2, '0');

  /* 海拔订正：以 1,150 m 为基准，每降低 100 m 气温 +0.6 ℃、湿度 -1.2 %、风速 -1.2 % */
  function lapse(alt) {
    const dz = (ELEV - alt) / 100;
    return { dt: dz * 0.6, dh: -dz * 1.2, dw: -dz * 0.012 };
  }

  function altOf(plot) {
    const m = String(plot.alt || '').replace(/[^0-9.]/g, '');
    const v = parseFloat(m);
    return isFinite(v) ? v : ELEV;
  }

  function nowKey() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
      + 'T' + pad2(d.getHours()) + ':00';
  }

  function readCache() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || 'null');
      return c && c.data ? c : null;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), data })); } catch (e) { /* 隐私模式忽略 */ }
  }

  /* 把接口返回的原始 JSON 整理成内部结构 */
  function normalize(raw) {
    const c = raw && raw.current;
    if (!c) throw new Error('empty');
    const h = raw.hourly || {};
    const times = h.time || [];
    const k = nowKey();
    let idx = -1;
    for (let i = 0; i < times.length; i++) { if (times[i] <= k) idx = i; }
    let series = null;
    if (idx > 0) {
      const from = Math.max(0, idx - 23);
      const t = [], rh = [], tm = [];
      for (let i = from; i <= idx; i++) {
        const a = num(h.temperature_2m ? h.temperature_2m[i] : null);
        const b = num(h.relative_humidity_2m ? h.relative_humidity_2m[i] : null);
        if (a !== null) t.push(a);
        if (b !== null) rh.push(b);
        tm.push(String(times[i] || '').slice(11, 16));
      }
      if (t.length >= 6 && rh.length >= 6) series = { t, rh, times: tm };
    }
    return {
      at: c.time || (times[idx] || ''),
      temp: num(c.temperature_2m),
      humidity: num(c.relative_humidity_2m),
      wind: num(c.wind_speed_10m),
      rad: num(c.shortwave_radiation),
      rain: num(c.precipitation),
      series
    };
  }

  function apply(data, mode) {
    S.cur = data;
    S.series = data.series;
    S.at = data.at;
    S.mode = mode;
  }

  function fetchLive() {
    return fetch(ENDPOINT, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(raw => {
        const d = normalize(raw);
        writeCache(d);
        apply(d, 'live');
        return S;
      });
  }

  function init() {
    const c = readCache();
    if (c) apply(c.data, 'cache');
    return fetchLive()
      .catch(e => {
        S.err = String(e && e.message || e);
        if (!S.cur) S.mode = 'sim';
        return S;
      });
  }

  /* ───── 对外取值接口 ───── */
  /* 返回 null 表示该要素无真实数据（土壤含水率 / pH），由调用方回落模拟值 */
  function metric(plot, key) {
    if (S.mode === 'sim' || !S.cur) return null;
    const L = lapse(altOf(plot));
    const d = S.cur;
    if (key === 'temp' && d.temp !== null) return +(d.temp + L.dt).toFixed(1);
    if (key === 'humidity' && d.humidity !== null) return Math.round(clamp(d.humidity + L.dh, 25, 99));
    if (key === 'wind' && d.wind !== null) return +clamp(d.wind * (1 + L.dw), 0.1, 20).toFixed(1);
    if (key === 'light' && d.rad !== null) return Math.round(clamp(d.rad * 0.11, 0, 120));
    return null;
  }

  function series(plot) {
    if (S.mode === 'sim' || !S.series) return null;
    const L = lapse(altOf(plot));
    return {
      t: S.series.t.map(v => +(v + L.dt).toFixed(1)),
      rh: S.series.rh.map(v => Math.round(clamp(v + L.dh, 25, 99))),
      times: S.series.times
    };
  }

  function label() {
    if (S.mode === 'live') return { text: '气象实测', real: true };
    if (S.mode === 'cache') return { text: '离线缓存', real: true };
    return { text: '模拟数据', real: false };
  }

  window.WEATHER = {
    init, metric, series, label,
    get mode() { return S.mode; },
    get at() { return S.at; },
    get err() { return S.err; }
  };
})();
