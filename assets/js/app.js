/* ═══════════════════════════════════════════
   一叶知乡 · 应用逻辑
   ═══════════════════════════════════════════ */
(function () {
  'use strict';
  const D = window.DATA, C = window.CHARTS, K = window.KB;
  const W = window.WEATHER || {
    init: () => Promise.resolve(),
    metric: () => null,
    series: () => null,
    label: () => ({ text: '模拟数据', real: false })
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = n => String(n).padStart(2, '0');
  const nowStr = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };

  /* ───── 状态 ───── */
  const state = {
    view: 'home',
    plot: 'A',
    variety: '全部',
    sort: 'default',
    cart: {},
    adopted: [],
    live: {}
  };
  try { state.cart = JSON.parse(localStorage.getItem('yy_cart') || '{}'); } catch (e) { state.cart = {}; }
  try { state.adopted = JSON.parse(localStorage.getItem('yy_adopt') || '[]'); } catch (e) { state.adopted = []; }
  const saveCart = () => localStorage.setItem('yy_cart', JSON.stringify(state.cart));
  const saveAdopt = () => localStorage.setItem('yy_adopt', JSON.stringify(state.adopted));

  /* ───── 通用 UI ───── */
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    $('#toastRoot').appendChild(t);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 320); }, 2200);
  }
  function modal(html, cls = '') {
    const root = $('#modalRoot');
    root.innerHTML = `<div class="modal-mask"><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
    root.querySelector('.modal-mask').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    $$('.modal-close', root).forEach(b => b.addEventListener('click', closeModal));
    document.body.style.overflow = 'hidden';
    return root;
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; document.body.style.overflow = ''; }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ───── 导航 ───── */
  function go(view) {
    if (!D || !$('#view-' + view)) return;
    state.view = view;
    $$('.view').forEach(v => v.classList.toggle('is-active', v.id === 'view-' + view));
    $$('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.nav === view));
    $('#nav').classList.remove('is-open');
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    if (view === 'farm') renderFarm();
    if (view === 'adopt') renderTrees();
    if (view === 'trace') renderTrace($('#traceInput').value.trim());
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-nav]');
    if (b) { e.preventDefault(); go(b.dataset.nav); }
  });
  $('#navToggle').addEventListener('click', () => $('#nav').classList.toggle('is-open'));
  window.addEventListener('scroll', () => $('#topbar').classList.toggle('is-scrolled', scrollY > 10), { passive: true });

  /* ───── 实时模拟数据 ───── */
  function liveValue(plot, key) {
    const def = D.metricDefs.find(m => m.key === key);
    const base = plot[key] !== undefined ? plot[key] : def.base;
    const id = plot.id + '_' + key;
    const prev = state.live[id] === undefined ? base : state.live[id];
    let v = prev + (Math.random() - .5) * def.range * .28;
    v = Math.max(base - def.range * 1.6, Math.min(base + def.range * 1.6, v));
    state.live[id] = v;
    return v;
  }
  const fmtVal = (v, key) => key === 'ph' ? v.toFixed(1) : (key === 'light' || key === 'humidity' || key === 'soil' ? v.toFixed(0) : v.toFixed(1));
  const isWarn = (v, key) => {
    const d = D.metricDefs.find(m => m.key === key);
    if (key === 'soil') return v < 45;
    if (key === 'light') return v > 60;
    return v > d.warn[0] || v < d.warn[1];
  };

  /* ── 真实气象优先，缺失则回落模拟值 ── */
  const mval = (plot, key) => {
    const r = W.metric(plot, key);
    return (r === null || r === undefined) ? liveValue(plot, key) : r;
  };
  const pickLabels = a => {
    if (!a || !a.length) return [];
    const k = Math.min(5, a.length);
    return Array.from({ length: k }, (_, i) => a[Math.round(i * (a.length - 1) / ((k - 1) || 1))] || '');
  };

  /* 数据来源角标 + 说明文案，随气象接口可用性切换 */
  function updateSourceUI() {
    const lb = W.label();
    const b = $('#srcBadge');
    if (b) { b.textContent = lb.text; b.classList.toggle('is-real', lb.real); }
    const foot = $('#heroFoot');
    if (foot) {
      if (lb.real) {
        foot.innerHTML = (W.mode === 'cache')
          ? `<span>离线缓存（最近一次同步）</span><span>土壤 · pH 为模拟</span>`
          : `<span>气温 · 湿度 · 风速 · 光照为气象实测</span><span>土壤 · pH 为模拟</span>`;
      } else {
        foot.innerHTML = `<span>18 个监测点位（方案设计）</span><span>5 s 模拟刷新</span>`;
      }
    }
    const sub = $('#farmSub');
    if (sub) {
      sub.innerHTML = lb.real
        ? (W.mode === 'cache'
          ? `3 个地块 · 18 个监测点位（方案设计） · 每 5 秒刷新一次（<b>气象要素为离线缓存（最近一次同步）；土壤含水率与 pH 为模拟值</b>）`
          : `3 个地块 · 18 个监测点位（方案设计） · 每 5 秒刷新一次（<b>气温 / 湿度 / 风速 / 光照为 Open-Meteo 公开气象数据，按海拔订正；土壤含水率与 pH 待接传感器，为模拟值</b>）`)
        : `3 个地块 · 18 个监测点位（方案设计） · 每 5 秒刷新一次（<b>未连上气象接口，当前为模拟数据流；土壤含水率与 pH 亦为模拟值</b>）`;
    }
  }

  /* ───── 首页 ───── */
  function renderHome() {
    $('#heroStats').innerHTML = D.heroStats.map(s => `<div class="hero-stat"><b>${esc(s.n)}</b><span>${esc(s.t)}</span></div>`).join('');
    $('#painGrid').innerHTML = D.pains.map(p => `
      <article class="pain-card">
        <div class="pain-num">${p.num} / PAIN POINT</div>
        <div class="pain-quote">${esc(p.quote)}</div>
        <h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p>
        <span class="pain-tag">${esc(p.tag)}</span>
      </article>`).join('');
    $('#techGrid').innerHTML = D.techs.map(t => `
      <article class="tech-card">
        <div class="tech-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${t.icon}"/></svg></div>
        <h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p><em>${esc(t.tag)}</em>
      </article>`).join('');
    $('#impactNums').innerHTML = D.impacts.map(i => `<div class="impact-num"><b>${esc(i.n)}</b><span>${esc(i.t)}</span><small>${esc(i.d)}</small></div>`).join('');
    const kd = D.kbDist;
    C.bar($('#impactChart'), kd.map(x => x.v), kd.map(x => x.label), { color: ['#2F6047', '#3C6B52', '#4C7A5B', '#638C74', '#7CA78D', '#93B7A2', '#ABCBB8'], h: 230, showValue: true });
  }

  function renderHeroLive() {
    const plot = D.plots.find(p => p.id === 'A');
    const keys = ['temp', 'humidity', 'soil', 'ph'];
    $('#heroMetrics').innerHTML = keys.map(k => {
      const v = mval(plot, k), d = D.metricDefs.find(m => m.key === k);
      const real = W.metric(plot, k) !== null;
      return `<div class="hero-metric"><label>${d.label}${real ? '<span class="live-tag">实测</span>' : ''}</label><b>${fmtVal(v, k)}<i>${d.unit}</i></b><small>${d.desc}</small></div>`;
    }).join('');
    const ds = W.series(plot);
    if (ds) {
      const t = ds.t.slice(-14);
      const lo = Math.min(...t), hi = Math.max(...t);
      const sp = Math.max(2, hi - lo);
      C.line($('#heroChart'), [{ data: t, color: '#4C7A5B', dots: false }], { h: 90, w: 400, min: Math.floor(lo - sp * .25), max: Math.ceil(hi + sp * .25), ticks: 3, labels: ds.times.slice(-14).map((s, i) => (i % 3 === 0 ? s : '')), dec: 0 });
    } else {
      const t = Array.from({ length: 14 }, (_, i) => 19 + Math.sin(i / 2.4) * 3.1 + Math.cos(i * .8) * .7);
      C.line($('#heroChart'), [{ data: t, color: '#4C7A5B', dots: false }], { h: 90, w: 400, min: 13, max: 26, ticks: 3, labels: ['06:00', '', '', '09:00', '', '', '12:00', '', '', '15:00', '', '', '18:00', ''], dec: 0 });
    }
    $('#heroClock').textContent = nowStr();
    updateSourceUI();
  }

  /* ───── 智慧茶园 ───── */
  function renderFarm() {
    const plot = D.plots.find(p => p.id === state.plot);
    $('#plotSwitch').innerHTML = D.plots.map(p => `<button class="plot-btn ${p.id === state.plot ? 'is-active' : ''}" data-plot="${p.id}">${esc(p.name)} · ${p.alt}</button>`).join('');
    $$('#plotSwitch .plot-btn').forEach(b => b.addEventListener('click', () => { state.plot = b.dataset.plot; renderFarm(); }));

    const sds = W.series(plot);
    $('#farmMetrics').innerHTML = D.metricDefs.map(d => {
      const v = mval(plot, d.key), warn = isWarn(v, d.key);
      const real = W.metric(plot, d.key) !== null;
      let spark = Array.from({ length: 12 }, () => v + (Math.random() - .5) * d.range);
      if (real && sds) {
        const arr = d.key === 'temp' ? sds.t : (d.key === 'humidity' ? sds.rh : null);
        if (arr && arr.length >= 6) spark = arr.slice(-12);
      }
      return `<div class="metric-card ${warn ? 'is-warn' : ''}">
        <label>${d.label}${real ? '<span class="live-tag">实测</span>' : ''}</label><b>${fmtVal(v, d.key)}<i>${esc(d.unit)}</i></b>
        <div class="spark">${C.spark(spark, warn ? '#C58B70' : '#8FB39A')}</div>
        <small>${warn && d.key === 'soil' ? '⚠ 低于灌溉阈值' : (warn ? '⚠ 超出适宜区间' : d.desc)}</small>
      </div>`;
    }).join('');

    const wds = W.series(plot);
    if (wds) {
      const lo = Math.min(...wds.t), hi = Math.max(...wds.t);
      const sp = Math.max(3, hi - lo);
      const tmin = Math.floor(lo - sp * .2), tmax = Math.ceil(hi + sp * .2);
      const rlo = Math.min(...wds.rh), rhi = Math.max(...wds.rh);
      C.line($('#tempChart'), [
        { data: wds.t, color: '#2F6047', min: tmin, max: tmax },
        { data: wds.rh, color: '#C0A062', min: rlo - 8, max: rhi + 8, fill: false, width: 2 }
      ], { h: 224, w: 560, min: tmin, max: tmax, ticks: 4, dec: 0, labels: wds.times });
      $('#tempLegend').innerHTML = `<span><i style="background:#2F6047"></i>气温 °C（左轴 ${tmin}–${tmax}）</span><span><i style="background:#C0A062"></i>空气湿度 %</span>`;
    } else {
      const ds = C.daySeries(plot);
      C.line($('#tempChart'), [
        { data: ds.t, color: '#2F6047', min: 8, max: 34 },
        { data: ds.rh, color: '#C0A062', min: 45, max: 100, fill: false, width: 2 }
      ], { h: 224, w: 560, min: 8, max: 34, ticks: 4, dec: 0, labels: Array.from({ length: 24 }, (_, i) => pad2(i) + ':00') });
      $('#tempLegend').innerHTML = `<span><i style="background:#2F6047"></i>气温 °C（左轴 8–34）</span><span><i style="background:#C0A062"></i>空气湿度 %（右轴 45–100）</span>`;
    }
    $('#curveTag').textContent = plot.name;

    C.bar($('#soilChart'), [54, 56, 51, 48, 45, 43, 43], ['11/16', '11/17', '11/18', '11/19', '11/20', '11/21', '11/22'], { h: 224, w: 560, color: '#4C7A5B', max: 80, showValue: true });

    const alerts = D.alertsBase.map((a, i) => ({ ...a, title: i === 0 ? `B 区土壤含水率 ${fmtVal(plot.soil, 'soil')}%，低于灌溉阈值 45%` : a.title }));
    $('#alertCount').textContent = `${alerts.filter(a => a.level !== '正常' && a.level !== '低').length} 条待处理`;
    $('#alertList').innerHTML = alerts.map(a => `<li>
      <span class="alert-badge ${a.type}">${a.level}</span>
      <div class="alert-text"><strong>${esc(a.title)}</strong><span>${esc(a.desc)}</span></div>
      <span class="alert-time">${esc(a.time)}</span></li>`).join('');

    $('#plotTable').innerHTML = `<thead><tr><th>地块</th><th>海拔</th><th>面积</th><th>茶树</th><th>主栽品种</th><th>状态</th></tr></thead><tbody>` +
      D.plots.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${p.alt}</td><td>${p.area}</td><td class="num">${p.trees}</td><td>${esc(p.variety)}</td><td><span class="status-pill ${p.status !== '正常' ? 'warn' : ''}">${p.status}</span></td></tr>`).join('') + `</tbody>`;

    $('#farmCalendar').innerHTML = D.calendar.map((c, i) => `<div class="cal-day ${i === 5 ? 'is-today' : ''}"><span>周${c.day}</span><b>${c.d.split('/')[1]}</b>${c.events.map(e => `<div class="cal-event ${e.c}">${esc(e.t)}</div>`).join('')}</div>`).join('');
  }

  /* ───── 茶树认养 ───── */
  let variety = '全部', sortKey = 'default';
  /* 份额制：每份对应成茶量由年产与总份额均摊，取整到 10g；
     已领份额 = 示例台账预置值 + 本机认养记录（演示环境无后端，页面已标注口径） */
  const shareG = t => Math.round(parseFloat(t.yield) * 1000 / t.shares / 10) * 10;
  const localTaken = code => state.adopted.filter(r => r.treeCode === code).length;
  const remainOf = t => t.shares - (t.taken || 0) - localTaken(t.code);
  function renderTrees() {
    const varieties = ['全部', ...new Set(D.trees.map(t => t.variety))];
    $('#varietyFilter').innerHTML = varieties.map(v => `<button class="chip ${v === variety ? 'is-active' : ''}" data-variety="${esc(v)}">${esc(v)}</button>`).join('');
    $$('#varietyFilter .chip').forEach(b => b.addEventListener('click', () => { variety = b.dataset.variety; renderTrees(); }));
    $$('.chip[data-sort]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.sort === sortKey);
      b.onclick = () => { sortKey = b.dataset.sort; renderTrees(); };
    });

    let list = D.trees.filter(t => variety === '全部' || t.variety === variety);
    if (sortKey === 'altitude') list = [...list].sort((a, b) => b.alt - a.alt);
    if (sortKey === 'price') list = [...list].sort((a, b) => a.price - b.price);

    $('#adoptSummary').innerHTML = `<div><b>${D.trees.length}</b>棵可认养茶树</div><div><b>${D.trees.reduce((s, t) => s + Math.max(0, remainOf(t)), 0)}</b>份剩余份额</div><button class="my-adopt-link" id="myAdoptBtn" type="button"><b>${state.adopted.length}</b>我的认养 ›</button>`;
    $('#myAdoptBtn').addEventListener('click', openMyAdopts);
    $('#treeGrid').innerHTML = list.map(t => {
      const remain = remainOf(t);
      return `
      <article class="tree-card" data-code="${t.code}">
        <div class="tree-visual" style="--tc:${t.color}">
          <span class="tree-code">${t.code}</span>
          <span class="tree-badge ${t.rare ? 'is-rare' : ''}">${t.rare ? '老丛珍稀' : '高山单丛'}</span>
          ${D.TEA_ICON}
        </div>
        <div class="tree-body">
          <h3>${esc(t.name)}</h3>
          <div class="tree-variety">${esc(t.variety)} · ${esc(t.aroma)}</div>
          <div class="tree-specs">
            <span>海拔<b>${t.alt} m</b></span><span>树龄<b>${t.age} 年</b></span>
            <span>年产<b>${esc(t.yield)}</b></span><span>份额<b>${remain > 0 ? `剩 ${remain} / ${t.shares}` : '已满'}</b></span>
          </div>
          <div class="tree-foot"><div class="tree-price"><b>¥${t.price}</b><small>/ 份 · 年</small></div><div class="tree-cta">${remain > 0 ? '查看详情 →' : '已认领满'}</div></div>
        </div>
      </article>`;
    }).join('');
    $$('#treeGrid .tree-card').forEach(c => c.addEventListener('click', () => openTree(c.dataset.code)));
  }

  function openTree(code) {
    const t = D.trees.find(x => x.code === code);
    if (!t) return;
    const remain = remainOf(t);
    modal(`
      <div class="modal-head"><h3>${esc(t.name)}</h3><button class="modal-close">×</button></div>
      <div class="modal-body">
        <div class="modal-banner" style="--tc:${t.color}">${D.TEA_ICON}</div>
        <div class="tree-variety" style="margin-bottom:10px">${t.code} · ${esc(t.variety)}</div>
        <p class="prose">${esc(t.note)} 香气特征：${esc(t.aroma)}。认养期 1 年，春季单株采制后直寄到家，附全年生长数据记录与专属溯源码。</p>
        <div class="detail-grid">
          <div><label>海拔</label><b>${t.alt} m</b></div><div><label>树龄</label><b>${t.age} 年</b></div>
          <div><label>预计成茶</label><b>${esc(t.yield)} / 年</b></div><div><label>认养费</label><b>¥${t.price} / 份</b></div>
        </div>
        <p style="font-size:12.5px;color:#5A6B60;margin:6px 0 0">本株共 ${t.shares} 份，每份对应约 <b>${shareG(t)}g</b> 当年成茶（按年产 ${esc(t.yield)} 均摊）与全年生长数据记录；本株剩余 <b>${Math.max(0, remain)}</b> 份可认领。</p>
        <p style="font-size:12px;color:#5A6B60;margin-top:4px">价格口径：凤凰镇毛茶大宗均价约 257 元/kg（公开数据）· 单株采制茶零售 2,560–6,880 元/kg（商城同档）· 认养预售价介于两者——预售锁量、省去渠道与礼盒溢价。</p>
        <div class="form-row"><label>认养人姓名（必填）</label><input id="adName" placeholder="请输入姓名" value=""></div>
        <div class="form-grid">
          <div class="form-row"><label>单位 / 身份（选填）</label><input id="adDept" placeholder="如：学校、企业、家庭或个人茶友"></div>
          <div class="form-row"><label>认养年限</label><select id="adYears"><option value="1">1 年</option><option value="2">2 年（9 折）</option><option value="3">3 年（85 折）</option></select></div>
        </div>
        <div class="form-row"><label>联系电话（选填，用于寄送春茶）</label><input id="adPhone" placeholder="仅本地保存，不上传"></div>
        <p style="font-size:12px;color:#5A6B60;margin-top:4px">认养费分配：茶农 70% · 平台运维 20% · 学校乡村振兴公益基金 10%。本演示版不产生真实支付，份额占用记录仅保存在本机浏览器。</p>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost modal-close">再看看</button><button class="btn btn-primary" id="adSubmit" ${remain > 0 ? '' : 'disabled'}>${remain > 0 ? `确认认养 · ¥${t.price} / 份` : '份额已认领满'}</button></div>`);
    $('#adSubmit').addEventListener('click', () => {
      if (remainOf(t) <= 0) { toast('该茶树份额已认领满，看看其他茶树吧'); return; }
      const name = $('#adName').value.trim();
      if (!name) { toast('请填写认养人姓名'); $('#adName').focus(); return; }
      const years = +$('#adYears').value;
      const discount = years === 3 ? .85 : years === 2 ? .9 : 1;
      /* 证书编号确定性：树代号 + 年份 + 本机序号（含示例台账预置数），同一记录重开页面不变化 */
      const seq = String((t.taken || 0) + localTaken(t.code) + 1).padStart(3, '0');
      const code2 = 'YY-' + t.code.slice(3) + '-' + new Date().getFullYear() + '-' + seq;
      const rec = { code: code2, tree: t.name, treeCode: t.code, shareG: shareG(t), name, dept: $('#adDept').value.trim(), years, price: Math.round(t.price * discount), date: new Date().toLocaleDateString('zh-CN') };
      state.adopted.push(rec); saveAdopt();
      showCert(rec);
      renderTrees();
    });
  }

  /** 绘制示意溯源标识（非可扫码，页面已标注演示用途） */
  function drawMark(canvas, seed) {
    const N = 25, cell = 4, size = N * cell;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const finder = (ox, oy) => {
      ctx.fillStyle = '#1F4736';
      ctx.fillRect(ox * cell, oy * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#fff'; ctx.fillRect((ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#1F4736'; ctx.fillRect((ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell);
    };
    const reserved = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    ctx.fillStyle = '#1F4736';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!reserved(x, y) && rnd() > .5) ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  }

  function showCert(rec) {
    modal(`
      <div class="modal-head"><h3>认养成功</h3><button class="modal-close">×</button></div>
      <div class="modal-body">
        <div class="cert">
          <div class="cert-seal">茶</div>
          <p>2026 · 凤凰单丛数字认养</p>
          <h2>认 养 证 书</h2>
          <div class="cert-sub">一叶知乡 · 让每一棵茶树都有主人</div>
          <div class="cert-info">
            <div><label>认养人</label><b>${esc(rec.name)}</b></div>
            <div><label>认养茶树</label><b>${esc(rec.tree)}</b></div>
            <div><label>茶树编号</label><b>${esc(rec.treeCode)}</b></div>
            <div><label>本份成茶</label><b>约 ${rec.shareG || '—'} g / 年</b></div>
            <div><label>认养期限</label><b>${rec.years} 年 · 至 ${2026 + rec.years} 年春</b></div>
            <div><label>认养金额</label><b>¥${rec.price}</b></div>
            <div><label>签发日期</label><b>${esc(rec.date)}</b></div>
          </div>
          <div class="qr"><canvas id="certQr" width="100" height="100" aria-label="溯源示意标识"></canvas></div>
          <p>溯源标识（示意） · 编号 ${esc(rec.code)}</p>
        </div>
        <p style="font-size:12px;color:#5A6B60;text-align:center;margin-top:16px">本证书为竞赛演示生成，记录已保存在本地浏览器，不产生真实交易。证书可在「茶树认养 · 我的认养」中回看。</p>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" id="certTrace">查看茶树溯源</button><button class="btn btn-ghost" id="certPrint">打印证书</button><button class="btn btn-primary modal-close">完成</button></div>`);
    drawMark($('#certQr'), rec.code);
    $('#certTrace').addEventListener('click', () => {
      const batch = D.batchIndex && D.batchIndex[rec.treeCode];
      closeModal(); go('trace');
      if (batch) { $('#traceInput').value = batch; renderTrace(batch); }
      else toast('该茶树当年批次尚未录入，可先用示例批次查看演示');
    });
    $('#certPrint').addEventListener('click', () => window.print());
    toast('认养成功，证书已生成');
  }

  /* 我的认养：历史记录回看，可重新打开证书 */
  function openMyAdopts() {
    const list = state.adopted;
    const body = list.length ? `<ul class="cart-list">${list.map((r, i) => `<li>
      <div class="ci"><strong>${esc(r.tree)}</strong><span>${esc(r.name)} · ${esc(r.code)} · ${esc(r.date)}</span></div>
      <button class="btn btn-ghost btn-sm" data-cert="${i}">查看证书</button>
    </li>`).join('')}</ul>` : '<div class="empty">还没有认养记录，去挑一棵茶树吧。</div>';
    modal(`<div class="modal-head"><h3>我的认养</h3><button class="modal-close">×</button></div>
      <div class="modal-body"><p style="font-size:12px;color:#5A6B60;margin:0 0 10px">记录仅保存在本机浏览器；本演示版不产生真实支付与发货。</p>${body}</div>
      <div class="modal-foot"><button class="btn btn-primary modal-close">关闭</button></div>`);
    $$('[data-cert]').forEach(b => b.addEventListener('click', () => showCert(state.adopted[+b.dataset.cert])));
  }

  /* ───── AI 助手 ───── */
  let chatReady = false;
  function pushMsg(text, who = 'bot') {
    const body = $('#chatBody');
    const div = document.createElement('div');
    div.className = 'msg ' + (who === 'user' ? 'msg-user' : '');
    div.innerHTML = `<div class="msg-avatar">${who === 'user' ? '我' : '茶'}</div><div class="msg-bubble">${who === 'user' ? esc(text) : text}</div>`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }
  function sendQ(q) {
    q = String(q || '').trim();
    if (!q) return;
    pushMsg(q, 'user');
    $('#chatInput').value = '';
    const typing = document.createElement('div');
    typing.className = 'msg';
    typing.innerHTML = `<div class="msg-avatar">茶</div><div class="msg-bubble"><div class="typing"><i></i><i></i><i></i></div></div>`;
    $('#chatBody').appendChild(typing);
    $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
    setTimeout(() => {
      typing.remove();
      pushMsg(K.answerHTML(K.ask(q)));
    }, 520);
  }
  function initChat() {
    if (chatReady) return; chatReady = true;
    $('#quickList').innerHTML = K.QUICK.map(q => `<button class="quick-q" data-q="${esc(q)}">${esc(q)}</button>`).join('');
    $$('#quickList .quick-q').forEach(b => b.addEventListener('click', () => sendQ(b.dataset.q)));
    // 自测用例：直接取知识库内已收录、且不与上方快捷问题重复的条目，任选一条都能命中
    const cases = K.list.filter(x => !K.QUICK.includes(x.q)).slice(0, 10);
    const box = $('#aiCases');
    if (box) {
      box.innerHTML = cases.map((x, i) => `<button class="case-chip" data-q="${esc(x.q)}" title="命中来源：${esc(x.src)}">${String(i + 1).padStart(2, '0')} ${esc(x.q)}</button>`).join('');
      $$('#aiCases .case-chip').forEach(b => b.addEventListener('click', () => sendQ(b.dataset.q)));
    }
    pushMsg(`<p>你好，我是<strong>茶博士</strong>，凤凰单丛种植知识库检索助手。</p><p>我内置 ${K.stats().total} 条覆盖${K.stats().cats.join('、')}的问答，<strong>断网也能用</strong>——山上没信号的时候，这正是我存在的理由。</p><p>直接问我病虫害、水肥、修剪、做青焙火，或者平台怎么运转都行。每条答案都会标注命中的知识库来源。</p><span class="msg-source">本地知识库 · 离线可用</span>`);
    $('#chatForm').addEventListener('submit', e => { e.preventDefault(); sendQ($('#chatInput').value); });
  }

  /* ───── 助农商城 ───── */
  function cartCount() { return Object.values(state.cart).reduce((a, b) => a + b, 0); }
  function updateCartBadge() { $('#cartCount').textContent = cartCount(); }
  function addToCart(id) {
    state.cart[id] = (state.cart[id] || 0) + 1; saveCart(); updateCartBadge();
    const p = D.products.find(x => x.id === id); toast(`已加入购物车 · ${p.name}`);
  }
  function renderShop() {
    $('#shopGrid').innerHTML = D.products.map(p => `
      <article class="product">
        <div class="product-visual" style="--tc:${p.color}">
          ${p.tag ? `<span class="product-tag">${esc(p.tag)}</span>` : ''}
          ${D.TEA_ICON}
        </div>
        <div class="product-body">
          <h3>${esc(p.name)}</h3><div class="origin">${esc(p.origin)}</div>
          <p>${esc(p.desc)}</p>
          <div class="product-foot">
            <div><b>¥${p.price}</b><small> / ${esc(p.spec)}</small></div>
            <button class="add-btn" data-add="${p.id}" aria-label="加入购物车">+</button>
          </div>
        </div>
      </article>`).join('');
    $$('#shopGrid .add-btn').forEach(b => b.addEventListener('click', () => addToCart(b.dataset.add)));
    C.stacked($('#supplyChart'), [
      { label: '茶农收益', value: 71, color: '#2F6047' },
      { label: '平台运维与物流', value: 19, color: '#8FB39A' },
      { label: '乡村振兴公益基金', value: 10, color: '#C0A062' }
    ], { note: '方案设计值：认养与直发模式省去中间批发环节，茶农在终端售价中的占比据测算可达 71%；传统多级收购渠道参照行业通行结构估算约 38%。该比例为运营方案测算，非实测交易数据。' });
  }
  function openCart() {
    const items = Object.entries(state.cart).filter(([, n]) => n > 0).map(([id, n]) => ({ p: D.products.find(x => x.id === id), n })).filter(x => x.p);
    const total = items.reduce((s, x) => s + x.p.price * x.n, 0);
    const body = items.length ? `<ul class="cart-list">${items.map(x => `<li>
      <div class="ci"><strong>${esc(x.p.name)}</strong><span>${esc(x.p.spec)} · ¥${x.p.price}</span></div>
      <div class="cart-qty"><button data-minus="${x.p.id}">−</button><b>${x.n}</b><button data-plus="${x.p.id}">+</button></div>
      <b style="font-family:Georgia,serif;color:#1F4736;min-width:52px;text-align:right">¥${x.p.price * x.n}</b>
    </li>`).join('')}</ul><div class="cart-total"><span>合计</span><b>¥${total}</b></div>` : '<div class="empty">购物车还是空的，去挑一罐春茶吧。</div>';
    modal(`<div class="modal-head"><h3>购物车</h3><button class="modal-close">×</button></div>
      <div class="modal-body">${body}</div>
      <div class="modal-foot"><button class="btn btn-ghost modal-close">继续逛逛</button><button class="btn btn-primary" id="checkout" ${items.length ? '' : 'disabled'}>提交订单</button></div>`);
    $$('[data-minus]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.minus; state.cart[id] = Math.max(0, (state.cart[id] || 0) - 1);
      if (!state.cart[id]) delete state.cart[id];
      saveCart(); updateCartBadge(); openCart();
    }));
    $$('[data-plus]').forEach(b => b.addEventListener('click', () => { addToCart(b.dataset.plus); openCart(); }));
    $('#checkout').addEventListener('click', () => {
      const no = 'YY' + Date.now().toString().slice(-9);
      state.cart = {}; saveCart(); updateCartBadge(); closeModal();
      toast(`订单 ${no} 已生成（演示）`);
    });
  }

  /* ───── 溯源 ───── */
  function renderTrace(code) {
    const box = $('#traceResult');
    const b = D.batches[code];
    if (!b) {
      box.innerHTML = `<div class="trace-error">未查到批次 <b>${esc(code)}</b>。可尝试示例批次 <b>FC-2026-0427</b> 或 <b>FC-2026-0512</b>。</div>`;
      return;
    }
    box.innerHTML = `<div class="trace-result">
      <div class="trace-hero">
        <div><h3>${esc(b.name)}</h3><p>批次 ${esc(code)} · ${esc(b.plot)} · 合作茶农 ${esc(b.farmer)}</p><p>${esc(b.qc)}</p></div>
        <div class="trace-stamp"><b>溯源认证</b><span>一树一码 · 8 道工序</span></div>
      </div>
      <div class="trace-grid">
        <div class="card"><div class="card-head"><h3>制作全链路</h3><span class="card-tag">${b.steps.length} 道工序</span></div>
          <div class="timeline">${b.steps.map(s => `<div class="tl-item ${s.key ? 'is-key' : ''}"><h4>${esc(s.t)}<span class="tl-date">${esc(s.d)}</span></h4><p>${esc(s.p)}</p></div>`).join('')}</div>
        </div>
        <div class="card"><div class="card-head"><h3>质检报告</h3><span class="card-tag">潮州质检所</span></div>
          <ul class="qc-list">${b.checks.map(c => `<li><span>${esc(c[0])}</span><b>${esc(c[1])}</b></li>`).join('')}</ul>
          <div class="card-note">留样编号 ${code}-S 独立存档，品质争议可回溯复检。每批茶叶包装附一树一码溯源卡。</div>
        </div>
      </div>
    </div>`;
  }

  /* ───── 关于 ───── */
  function renderAbout() {
    $('#archDiagram').innerHTML = D.arch.map(a => `<div class="arch-step"><em>${a.e}</em><h4>${esc(a.h)}</h4><p>${esc(a.p)}</p></div>`).join('');
    $('#specGrid').innerHTML = D.specs.map(s => `<div class="spec-item"><label>${esc(s.l)}</label><b>${esc(s.v)}</b><p>${esc(s.p)}</p></div>`).join('');
    $('#impactMini').innerHTML = D.impactMini.map(i => `<div><b>${esc(i.n)}</b><span>${esc(i.t)}</span></div>`).join('');
    const dg = $('#dataNoteGrid');
    if (dg) {
      dg.innerHTML = D.dataNotes.map(n => {
        const sim = /模拟|测算/.test(n.v);
        return `<div class="note-item${sim ? ' is-sim' : ''}">
          <div class="note-head"><span class="note-k">${esc(n.k)}</span><span class="note-v">${esc(n.v)}</span></div>
          <p>${esc(n.d)}</p>
        </div>`;
      }).join('');
    }
  }

  /* ───── 启动 ───── */
  function boot() {
    renderHome(); renderHeroLive(); renderFarm(); renderTrees(); initChat(); renderShop(); renderAbout();
    renderTrace('FC-2026-0427');
    updateCartBadge();

    $('#traceForm').addEventListener('submit', e => { e.preventDefault(); renderTrace($('#traceInput').value.trim().toUpperCase()); });
    $('#traceSample').addEventListener('click', () => { $('#traceInput').value = 'FC-2026-0427'; renderTrace('FC-2026-0427'); });
    $('#cartBtn').addEventListener('click', openCart);

    // 实时刷新：首页气象面板 + 可见的茶园指标
    setInterval(() => {
      if (state.view === 'home') renderHeroLive();
      else if (state.view === 'farm') {
        const plot = D.plots.find(p => p.id === state.plot);
        $$('#farmMetrics .metric-card').forEach((card, i) => {
          const d = D.metricDefs[i]; if (!d) return;
          const v = mval(plot, d.key);
          card.querySelector('b').innerHTML = `${fmtVal(v, d.key)}<i>${esc(d.unit)}</i>`;
          card.classList.toggle('is-warn', isWarn(v, d.key));
        });
      }
    }, 5000);
    setInterval(() => { if (state.view === 'home') $('#heroClock').textContent = nowStr(); }, 1000);

    const hash = location.hash.replace('#', '');
    if (hash && $('#view-' + hash)) go(hash);

    /* 拉取真实气象数据；成功或失败都会刷新一次的界面（失败则保持模拟值） */
    W.init().then(() => {
      updateSourceUI();
      renderHeroLive();
      if (state.view === 'farm') renderFarm();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
