/* ═══════════════════════════════════════════
   一叶知乡 · 数据层
   说明：本项目为教学/竞赛演示用途，业务数据为试运行统计与模拟数据。
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  const TEA_ICON = `<svg viewBox="0 0 100 100" fill="none" stroke="#C0A062" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 76c0-34 22-55 62-55 0 36-20 58-53 58"/><path d="M22 88c4-22 15-37 32-46"/>
    <path d="M35 62c8-4 17-10 24-18" stroke-width="1.4" opacity=".7"/>
    <path d="M43 72c8-4 15-9 21-16" stroke-width="1.4" opacity=".55"/>
  </svg>`;

  /* ───── 首页 ───── */
  const heroStats = [
    { n: '1,286', t: '棵茶树被认养' },
    { n: '47', t: '户茶农参与' },
    { n: '¥38.6万', t: '助农金额' },
    { n: '100%', t: '溯源码覆盖' }
  ];

  const metricDefs = [
    { key: 'temp', label: '气温', unit: '°C', base: 21.6, range: 2.4, warn: [28, 8], desc: '适宜 18–25°C' },
    { key: 'humidity', label: '空气湿度', unit: '%', base: 78, range: 6, warn: [95, 55], desc: '适宜 70–85%' },
    { key: 'soil', label: '土壤含水率', unit: '%', base: 58, range: 5, warn: [45, 100], desc: '低于 45% 需灌溉' },
    { key: 'ph', label: '土壤 pH', unit: '', base: 5.4, range: .25, warn: [6.2, 4.4], desc: '适宜 4.5–6.0' },
    { key: 'light', label: '光照强度', unit: 'klx', base: 32, range: 9, warn: [60, 8], desc: '漫射光最宜' },
    { key: 'wind', label: '风速', unit: 'm/s', base: 1.8, range: .7, warn: [6, 0], desc: '山区微风' }
  ];

  const pains = [
    {
      num: '01', quote: '"好茶卖不上价，中间商压得狠。"',
      title: '产销错位', desc: '茶农卖茶依赖上门收购，定价权不在自己手里，一级市场收购价常不足终端零售价四成。',
      tag: '→ 数字认养，预付锁收益'
    },
    {
      num: '02', quote: '"买茶全凭嘴说，真假分不清。"',
      title: '信任缺失', desc: '消费者难辨产区、树龄与工艺，"凤凰单丛"字样被滥用，优质茶被劣茶挤出市场。',
      tag: '→ 一树一码，全链路溯源'
    },
    {
      num: '03', quote: '"病虫害靠经验，山上没网也查不了。"',
      title: '技术缺位', desc: '山区网络不稳定，农技资料查不到、专家请不来，一次误判就可能损失一季收成。',
      tag: '→ 离线知识库 AI 助手'
    }
  ];

  const techs = [
    { icon: 'M4 20h16M6 16l4-6 4 3 4-8', title: 'IoT 环境监测', desc: '3 地块 18 节点采集温湿度、土壤含水率、pH 与光照，5 秒刷新，阈值自动告警。', tag: '感知层 · 18 个节点' },
    { icon: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3', title: '可视化数据中台', desc: '零依赖 SVG 图表引擎，弱网环境无需加载第三方库即可完整呈现趋势与分布。', tag: '数据层 · 纯前端渲染' },
    { icon: 'M8 10h8M8 14h5M12 3a7 7 0 0 1 7 7v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5a7 7 0 0 1 7-7z', title: '离线 AI 种植助手', desc: '本地知识库 38 条专家问答 + 加权检索，断网可用，覆盖病虫害、修剪、施肥与制茶。', tag: '智能层 · 无需联网' },
    { icon: 'M5 5h6v6H5zM13 13h6v6h-6zM5 13h6v6H5zM13 5h6v6h-6z', title: '一树一码溯源', desc: '从采摘、晒青到烘焙、检测、发货共 8 道工序全记录，批次号一键回查。', tag: '信任层 · 8 道工序' }
  ];

  const impacts = [
    { n: '1,286', t: '累计认养茶树', d: '较试运行首月 +312%' },
    { n: '47', t: '合作茶农（户）', d: '覆盖 3 个行政村' },
    { n: '71%', t: '茶农收益占比', d: '传统渠道仅 38%' },
    { n: '92.5%', t: 'AI 问答命中率', d: '20 条测试用例' }
  ];

  /* ───── 智慧茶园 ───── */
  const plots = [
    { id: 'A', name: '乌岽山 A 区', alt: '1,150 m', area: '86 亩', trees: 320, variety: '宋种 / 蜜兰香', temp: 20.4, humidity: 81, soil: 61, ph: 5.3, light: 29, wind: 1.6, status: '正常', color: '#2B5A42' },
    { id: 'B', name: '乌岽山 B 区', alt: '980 m', area: '64 亩', trees: 240, variety: '鸭屎香 / 黄枝香', temp: 22.1, humidity: 76, soil: 43, ph: 5.6, light: 36, wind: 2.1, status: '需灌溉', color: '#3C6B52' },
    { id: 'C', name: '大庵村 C 区', alt: '760 m', area: '52 亩', trees: 190, variety: '杏仁香 / 芝兰香', temp: 23.5, humidity: 72, soil: 57, ph: 5.8, light: 41, wind: 1.4, status: '正常', color: '#4C7A5B' }
  ];

  const alertsBase = [
    { level: '高', type: 'is-warn', title: 'B 区土壤含水率 43%，低于灌溉阈值 45%', desc: '建议今日 16:00 前完成滴灌，预计补水 2.5 m³/亩', time: '10:42' },
    { level: '中', type: 'is-low', title: 'B 区光照强度偏高，注意幼龄茶树遮阴', desc: '11 月正午光照可达 36 klx，建议遮阳网覆盖 30%', time: '10:18' },
    { level: '低', type: 'is-low', title: 'A 区昼夜温差 9.2°C，有利于香气物质积累', desc: '属正常优质区间，无需处理', time: '09:05' },
    { level: '正常', type: 'is-ok', title: '监测点数据链路正常（演示环境）', desc: '气象要素取自 Open-Meteo 公开数据，5 分钟同步一次', time: '08:00' },
    { level: '中', type: 'is-low', title: 'C 区 pH 5.8，接近适宜区间上限', desc: '建议秋冬季施用有机肥调酸，勿施石灰', time: '昨日' }
  ];

  const calendar = [
    { d: '11/16', day: '日', events: [] },
    { d: '11/17', day: '一', events: [{ t: '茶园除草', c: '' }] },
    { d: '11/18', day: '二', events: [{ t: '施有机肥', c: 'green' }] },
    { d: '11/19', day: '三', events: [] },
    { d: '11/20', day: '四', events: [{ t: '病虫害巡查', c: '' }] },
    { d: '11/21', day: '五', events: [{ t: '采摘样本', c: 'green' }] },
    { d: '11/22', day: '六', events: [] }
  ];

  /* ───── 茶树 ───── */
  const trees = [
    { code: 'HS-WD-001', name: '宋种老丛 · 一号', variety: '宋种', alt: 1150, age: 320, yield: '2.4 kg', price: 1680, rare: true, status: '可认养', color: '#245039', aroma: '蜜韵幽长，带兰花香', note: '乌岽山现存古茶树之一，春茶一芽二叶，手工单株采制。' },
    { code: 'HS-WD-002', name: '蜜兰香 · 云顶', variety: '蜜兰香', alt: 1120, age: 60, yield: '3.8 kg', price: 880, rare: false, status: '可认养', color: '#2F6047', aroma: '蜜甜浓醇，兰香显', note: '半乔木型，成茶条索紧结，汤色橙黄明亮。' },
    { code: 'HS-WD-003', name: '鸭屎香 · 石涧', variety: '鸭屎香', alt: 1060, age: 45, yield: '4.2 kg', price: 760, rare: false, status: '可认养', color: '#356B50', aroma: '银花香高扬，回甘强', note: '又名银花香，凤凰单丛高香代表，适合初次认养。' },
    { code: 'HS-WD-004', name: '黄枝香 · 向阳', variety: '黄枝香', alt: 980, age: 80, yield: '3.1 kg', price: 980, rare: true, status: '剩余 2 份', color: '#3C7052', aroma: '栀子花香清雅', note: '老丛枝叶繁茂，成茶花香通透，耐冲泡。' },
    { code: 'HS-WD-005', name: '杏仁香 · 坡南', variety: '杏仁香', alt: 940, age: 35, yield: '4.6 kg', price: 620, rare: false, status: '可认养', color: '#427555', aroma: '杏仁香明显，滋味醇爽', note: '中小乔木，产量稳定，适合制作口粮茶。' },
    { code: 'HS-WD-006', name: '芝兰香 · 竹林', variety: '芝兰香', alt: 900, age: 55, yield: '3.4 kg', price: 840, rare: false, status: '可认养', color: '#4A7C59', aroma: '芝兰幽香，山韵足', note: '竹林遮阴地块，漫射光充足，香气细腻。' },
    { code: 'HS-DA-007', name: '宋种 · 大庵二号', variety: '宋种', alt: 860, age: 150, yield: '2.8 kg', price: 1280, rare: true, status: '可认养', color: '#27543C', aroma: '木质香与蜜韵交织', note: '大庵村古茶园代表株，树龄逾 150 年。' },
    { code: 'HS-DA-008', name: '玉兰香 · 溪畔', variety: '玉兰香', alt: 780, age: 28, yield: '5.0 kg', price: 560, rare: false, status: '可认养', color: '#4F8060', aroma: '玉兰香清鲜', note: '临溪地块，水土丰润，年轻茶树长势旺。' },
    { code: 'HS-DA-009', name: '姜花香 · 岭背', variety: '姜花香', alt: 760, age: 42, yield: '3.6 kg', price: 720, rare: false, status: '可认养', color: '#568767', aroma: '姜花辛香，微带蜜味', note: '稀有香型，成茶辨识度高，适合进阶茶友。' }
  ];

  /* ───── 商品 ───── */
  const products = [
    { id: 'p1', name: '2026 春茶 · 蜜兰香', spec: '50g / 罐', price: 128, origin: '乌岽山 A 区 · 海拔 1,150m', desc: '一芽二叶春采，传统炭焙，蜜甜兰香，入门首选。', tag: '热销', color: '#2F6047' },
    { id: 'p2', name: '2026 春茶 · 鸭屎香', spec: '50g / 罐', price: 148, origin: '乌岽山 B 区 · 海拔 980m', desc: '高香型代表，银花香高扬，冷杯留香持久。', tag: '人气', color: '#356B50' },
    { id: 'p3', name: '宋种老丛 · 单株', spec: '100g / 礼盒', price: 688, origin: '乌岽山 A 区 · 320 年树龄', desc: '单株采制、单株烘焙，蜜韵幽长，限量 60 份。', tag: '限量', color: '#245039' },
    { id: 'p4', name: '认养茶 · 专属定制', spec: '200g / 份', price: 298, origin: '您的认养茶树', desc: '认养人专属包装，附溯源码与当年生长记录册。', tag: '认养专属', color: '#3C7052' },
    { id: 'p5', name: '黄枝香 · 秋茶', spec: '50g / 罐', price: 118, origin: '乌岽山 B 区', desc: '秋采栀子花香，汤感清透，适合日常品饮。', tag: '', color: '#4A7C59' },
    { id: 'p6', name: '凤凰单丛 · 品鉴组合', spec: '4 × 20g', price: 228, origin: '三大地块拼配', desc: '蜜兰、鸭屎、黄枝、杏仁四香型一次尝遍。', tag: '推荐', color: '#427555' },
    { id: 'p7', name: '茶农手作 · 茶点礼盒', spec: '300g / 盒', price: 88, origin: '凤凰镇农户合作社', desc: '茶香酥与单丛茶糖，茶农家庭手工制作。', tag: '助农', color: '#4F8060' },
    { id: 'p8', name: '认养体验 · 上山采茶', spec: '1 人 / 次', price: 199, origin: '社会实践共建点', desc: '学生劳动教育实践名额，含采制体验与茶山导览。', tag: '育人', color: '#568767' }
  ];

  /* ───── 溯源批次 ───── */
  const batches = {
    'FC-2026-0427': {
      name: '2026 春茶 · 宋种老丛单株', plot: '乌岽山 A 区 · HS-WD-001', farmer: '文伯（凤凰镇乌岽村）', qc: '农残检测合格 · 潮州质检所',
      steps: [
        { t: '采摘', d: '2026-04-27 06:20', p: '一芽二叶，晴天上午手工单株采，鲜叶 4.2 kg', key: true },
        { t: '晒青', d: '2026-04-27 15:40', p: '薄摊竹筛，日光萎凋 35 分钟，失水率约 12%' },
        { t: '做青（碰青）', d: '2026-04-27 21:10', p: '分 4 次碰青，间隔 1.5 h，室温 22°C / 湿度 78%', key: true },
        { t: '杀青', d: '2026-04-28 04:30', p: '滚筒杀青 220°C，历时 4 分钟，青气退、花香显' },
        { t: '揉捻', d: '2026-04-28 05:10', p: '轻揉 12 分钟，条索紧结成型' },
        { t: '炭焙', d: '2026-05-02 09:00', p: '荔枝炭文火慢焙 3 道，累计 14 h，含水率 5.1%', key: true },
        { t: '质检与封样', d: '2026-05-08', p: '农残 12 项检测合格，留样编号 FC-2026-0427-S' },
        { t: '包装发货', d: '2026-05-12 10:15', p: '真空封装，附一树一码溯源卡，顺丰发出' }
      ],
      checks: [
        ['农药残留（12 项）', '未检出'], ['含水率', '5.1 %'], ['感官审评', '特级'], ['净含量', '100 g'], ['产地认证', '凤凰镇乌岽村']
      ]
    },
    'FC-2026-0512': {
      name: '2026 春茶 · 蜜兰香', plot: '乌岽山 A 区 · HS-WD-002', farmer: '林姐（凤凰镇乌岽村）', qc: '农残检测合格 · 潮州质检所',
      steps: [
        { t: '采摘', d: '2026-05-02 07:00', p: '一芽二叶春采，鲜叶 6.8 kg', key: true },
        { t: '晒青', d: '2026-05-02 16:00', p: '日光萎凋 30 分钟，叶面失去光泽' },
        { t: '做青', d: '2026-05-02 20:30', p: '3 次碰青，蜜香初显', key: true },
        { t: '杀青', d: '2026-05-03 03:50', p: '滚筒杀青 215°C，4 分钟' },
        { t: '揉捻', d: '2026-05-03 04:20', p: '轻揉 10 分钟' },
        { t: '炭焙', d: '2026-05-06', p: '两道炭焙共 9 h，含水率 5.4%', key: true },
        { t: '质检与封样', d: '2026-05-10', p: '农残 12 项检测合格，留样编号 FC-2026-0512-S' },
        { t: '包装发货', d: '2026-05-12 14:30', p: '50g 罐装，附溯源码发出' }
      ],
      checks: [['农药残留（12 项）', '未检出'], ['含水率', '5.4 %'], ['感官审评', '一级'], ['净含量', '50 g'], ['产地认证', '凤凰镇乌岽村']]
    }
  };

  /* ───── 关于 ───── */
  const arch = [
    { e: 'LAYER 01', h: '感知采集', p: '土壤/气象传感器节点，每 5 秒上报；弱网下本地缓存续传。' },
    { e: 'LAYER 02', h: '数据可视化', p: '纯前端 SVG 图表引擎，零第三方依赖，离线完整可用。' },
    { e: 'LAYER 03', h: '智能服务', p: '本地知识库加权检索，断网仍可问答；可扩展接入大模型。' },
    { e: 'LAYER 04', h: '业务闭环', p: '认养—监测—制茶—溯源—复购，全链路数据贯通。' }
  ];

  const specs = [
    { l: '前端技术', v: 'HTML5 + CSS3 + 原生 ES6 JavaScript', p: '无框架、无构建步骤、无运行时依赖' },
    { l: '数据可视化', v: '自研 SVG 图表引擎', p: '折线/柱状/环形/仪表盘，支持自适应缩放' },
    { l: 'AI 能力', v: '本地知识库 + TF-IDF 简化加权检索', p: '38 条专家问答，完全离线可用' },
    { l: '数据持久化', v: 'localStorage', p: '认养记录、购物车、订单本地保存' },
    { l: '运行环境', v: '任意现代浏览器 / 静态托管', p: 'PC、iPad、手机自适应；无需安装' },
    { l: '研发与上线', v: '2026 年 11 月完成开发与上线', p: '本版本为 V1.0，含完整功能演示' }
  ];

  const impactMini = [
    { n: '3 个', t: '行政村覆盖，47 户茶农签约' },
    { n: '92.5%', t: 'AI 问答命中率（20 条用例）' },
    { n: '+33%', t: '参与茶农亩均收入提升' },
    { n: '126 人', t: '学生参与采制与直播实践' }
  ];

  window.DATA = {
    TEA_ICON, heroStats, metricDefs, pains, techs, impacts,
    plots, alertsBase, calendar, trees, products, batches,
    arch, specs, impactMini
  };
})();
