/* ═══════════════════════════════════════════
   一叶知乡 · 零依赖 SVG 图表引擎
   不加载任何 CDN / 第三方库，弱网与离线演示完整可用
   ═══════════════════════════════════════════ */
(function () {
  'use strict';
  let uid = 0;
  const nid = () => 'cy' + (++uid);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function svgWrap(w, h, inner) {
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  /** 折线图（支持多序列、面积填充、网格、坐标标签） */
  function line(container, series, opts = {}) {
    const w = opts.w || 560, h = opts.h || 220;
    const pad = { t: 18, r: 16, b: 30, l: 38 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const all = series.flatMap(s => s.data);
    let min = opts.min !== undefined ? opts.min : Math.min(...all);
    let max = opts.max !== undefined ? opts.max : Math.max(...all);
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    min -= span * .12; max += span * .12;
    const n = Math.max(...series.map(s => s.data.length));
    const X = i => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
    const Y = v => pad.t + ih - ((v - min) / (max - min)) * ih;
    const gid = nid();
    let g = '';

    // 横向网格 + y 轴刻度
    const ticks = opts.ticks || 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.t + (i / ticks) * ih;
      const v = max - (i / ticks) * (max - min);
      g += `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w - pad.r}" y2="${y.toFixed(1)}" stroke="rgba(31,71,54,.09)" stroke-width="1"/>`;
      g += `<text x="${pad.l - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#8A9A90" font-family="system-ui">${v.toFixed(opts.dec === 0 ? 0 : 1)}</text>`;
    }
    // x 轴标签
    const labels = opts.labels || [];
    const step = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += step) {
      g += `<text x="${X(i).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#8A9A90" font-family="system-ui">${esc(labels[i] || '')}</text>`;
    }
    if (n > 1 && (n - 1) % step !== 0) {
      g += `<text x="${X(n - 1).toFixed(1)}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#8A9A90" font-family="system-ui">${esc(labels[n - 1] || '')}</text>`;
    }

    series.forEach((s, si) => {
      // 支持每条序列独立的量纲（双轴场景）：用 s.min / s.max 映射到同一画布
      const smin = s.min !== undefined ? s.min : min;
      const smax = s.max !== undefined ? s.max : max;
      const SY = v => pad.t + ih - ((v - smin) / (smax - smin || 1)) * ih;
      const pts = s.data.map((v, i) => `${X(i).toFixed(1)},${SY(v).toFixed(1)}`).join(' ');
      const color = s.color || '#4C7A5B';
      if (s.fill !== false && si === 0) {
        const areaId = nid();
        g = `<defs><linearGradient id="${areaId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".22"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>` + g;
        const first = `${X(0).toFixed(1)},${(pad.t + ih).toFixed(1)}`;
        const last = `${X(s.data.length - 1).toFixed(1)},${(pad.t + ih).toFixed(1)}`;
        g += `<polygon points="${first} ${pts} ${last}" fill="url(#${areaId})"/>`;
      }
      g += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${s.width || 2.2}" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (s.dots !== false) {
        s.data.forEach((v, i) => {
          if (i % Math.max(1, Math.floor(n / 8)) === 0 || i === n - 1) {
            g += `<circle cx="${X(i).toFixed(1)}" cy="${SY(v).toFixed(1)}" r="2.8" fill="#FFFDF9" stroke="${color}" stroke-width="1.8"/>`;
          }
        });
      }
    });

    container.innerHTML = svgWrap(w, h, g);
  }

  /** 柱状图 */
  function bar(container, values, labels, opts = {}) {
    const w = opts.w || 560, h = opts.h || 220;
    const pad = { t: 18, r: 14, b: 32, l: 34 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const max = opts.max || Math.max(...values) * 1.15;
    const n = values.length;
    const bw = Math.min(opts.barWidth || 30, (iw / n) * .55);
    const gap = iw / n;
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * ih;
      g += `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${w - pad.r}" y2="${y.toFixed(1)}" stroke="rgba(31,71,54,.09)"/>`;
      g += `<text x="${pad.l - 7}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#8A9A90">${(max - (i / 4) * max).toFixed(0)}</text>`;
    }
    const color = opts.color || '#4C7A5B';
    values.forEach((v, i) => {
      const bh = clamp((v / max) * ih, 0, ih);
      const x = pad.l + gap * i + (gap - bw) / 2;
      const y = pad.t + ih - bh;
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="${Array.isArray(color) ? color[i % color.length] : color}" opacity="${opts.opacity || .88}"/>`;
      if (opts.showValue !== false) {
        g += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="#33463C" font-weight="600">${v}</text>`;
      }
      g += `<text x="${(x + bw / 2).toFixed(1)}" y="${h - 9}" text-anchor="middle" font-size="10" fill="#8A9A90">${esc(labels[i] || '')}</text>`;
    });
    container.innerHTML = svgWrap(w, h, g);
  }

  /** 环形图（带中心文字） */
  function donut(container, items, opts = {}) {
    const w = opts.w || 300, h = opts.h || 200;
    const cx = w / 2, cy = h / 2, r = opts.r || 66, thick = opts.thick || 20;
    const total = items.reduce((a, b) => a + b.value, 0) || 1;
    let g = '', acc = -Math.PI / 2;
    const C = 2 * Math.PI * r;
    items.forEach(it => {
      const frac = it.value / total;
      const len = frac * C;
      g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${it.color}" stroke-width="${thick}"
        stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}"
        stroke-dashoffset="${(-acc * r + Math.PI / 2 * r).toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
      acc += frac * 2 * Math.PI;
    });
    g += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="22" font-family="Georgia,serif" fill="#1F4736" font-weight="600">${esc(opts.center || '')}</text>`;
    g += `<text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="10.5" fill="#8A9A90">${esc(opts.centerSub || '')}</text>`;
    container.innerHTML = svgWrap(w, h, g);
  }

  /** 迷你折线（指标卡 sparkline） */
  function spark(values, color = '#8FB39A', w = 120, h = 26) {
    const min = Math.min(...values), max = Math.max(...values);
    const sp = max - min || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1) * w).toFixed(1)},${(h - 3 - ((v - min) / sp) * (h - 6)).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:100%;display:block"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/></svg>`;
  }

  /** 水平堆叠条（收益分配） */
  function stacked(container, items, opts = {}) {
    const w = opts.w || 720, h = opts.h || 150;
    const pad = 22, barY = 28, barH = 34;
    const total = items.reduce((a, b) => a + b.value, 0) || 1;
    let g = '', x = pad;
    const iw = w - pad * 2;
    items.forEach(it => {
      const bw = (it.value / total) * iw;
      g += `<rect x="${x.toFixed(1)}" y="${barY}" width="${Math.max(0, bw - 2).toFixed(1)}" height="${barH}" rx="5" fill="${it.color}"/>`;
      g += `<text x="${(x + bw / 2).toFixed(1)}" y="${barY + 22}" text-anchor="middle" font-size="12" fill="#fff" font-weight="700">${it.value}%</text>`;
      x += bw;
    });
    // 图例
    let lx = pad;
    items.forEach(it => {
      g += `<rect x="${lx}" y="86" width="11" height="11" rx="3" fill="${it.color}"/>`;
      g += `<text x="${lx + 17}" y="96" font-size="12" fill="#33463C">${esc(it.label)}</text>`;
      lx += Math.max(150, it.label.length * 13 + 40);
    });
    g += `<text x="${pad}" y="128" font-size="11.5" fill="#8A9A90">${esc(opts.note || '')}</text>`;
    container.innerHTML = svgWrap(w, h, g);
  }

  /** 定性曲线：24h 温度与湿度 */
  function daySeries(plot) {
    const t = [], rh = [];
    for (let i = 0; i < 24; i++) {
      const phase = Math.sin((i - 6) / 24 * Math.PI * 2);
      t.push(+(plot.temp + phase * 5.2 + Math.sin(i * 1.7) * .5).toFixed(1));
      rh.push(+(plot.humidity - phase * 11 + Math.cos(i * 1.3) * 2).toFixed(1));
    }
    return { t, rh };
  }

  window.CHARTS = { line, bar, donut, spark, stacked, daySeries, svgWrap };
})();
