// 天使鹰眼 - 股票技术分析 API
// Vercel Serverless Function (Node.js)
// 数据源：Yahoo Finance v8 API（主）+ 东方财富（备用，港股/A股）

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawCode = (req.query.code || '').trim();
  // 前端明确传来的市场：港股 / A股 / 美股
  const marketParam = (req.query.market || '').trim();

  if (!rawCode) {
    return res.status(400).json({ error: '请提供股票代码' });
  }

  try {
    // 以前端选择的市场为准；若未传则自动检测（兜底）
    const market = marketParam || autoDetectMarket(rawCode);

    // 将用户输入的代码标准化
    const code = normalizeCode(rawCode, market);

    // 生成 Yahoo Finance ticker
    const ticker = toYFTicker(code, market);

    // 优先 Yahoo Finance
    let result = await fetchYahoo(ticker, code, market);

    // 备用：东方财富（港股/A股）
    if (!result && (market === '港股' || market === 'A股')) {
      result = await fetchEastMoney(code, market);
    }

    if (!result) {
      return res.status(404).json({ error: '未找到股票数据，请确认代码和市场是否正确' });
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: '数据获取失败: ' + e.message });
  }
}

// ─── 市场自动检测（仅兜底用，正常情况前端会传 market） ───
function autoDetectMarket(code) {
  if (/^\d{6}$/.test(code)) return 'A股';          // 严格6位 → A股
  if (/^\d{1,5}$/.test(code)) return '港股';        // 1-5位数字 → 港股
  if (/^[A-Za-z.]+$/.test(code)) return '美股';     // 纯字母 → 美股
  return '未知';
}

// ─── 代码标准化 ───
// 港股：用户可能输入 700 / 0700 / 00700，统一转成 5 位 00700 形式用于东财，4 位用于 Yahoo
function normalizeCode(code, market) {
  if (market === '港股') {
    // 去前导零后重新补到 5 位（东财标准）
    return String(parseInt(code, 10)).padStart(5, '0');
  }
  return code.toUpperCase();
}

// ─── 生成 Yahoo Finance ticker ───
function toYFTicker(code, market) {
  if (market === '港股') {
    // Yahoo 港股用 4 位，如 0700.HK
    const num = parseInt(code, 10);
    return String(num).padStart(4, '0') + '.HK';
  }
  if (market === 'A股') {
    return code.startsWith('6') ? code + '.SS' : code + '.SZ';
  }
  // 美股直接用代码
  return code.toUpperCase();
}

// ─── Yahoo Finance 取数 ───
async function fetchYahoo(ticker, code, market) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=6mo`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    const chart = data?.chart?.result?.[0];
    if (!chart) return null;

    const q = chart.indicators.quote[0];
    const closes  = q.close;
    const highs   = q.high;
    const lows    = q.low;
    const volumes = q.volume;
    const meta    = chart.meta;

    // 过滤 null 值（停牌日等）
    const valid = closes
      .map((c, i) => ({ c, h: highs[i], l: lows[i], v: volumes[i] }))
      .filter(x => x.c != null && !isNaN(x.c));

    if (valid.length < 20) return null;

    const cs = valid.map(x => x.c);
    const hs = valid.map(x => x.h);
    const ls = valid.map(x => x.l);

    const latest = cs[cs.length - 1];
    const prev   = cs[cs.length - 2] ?? latest;
    const change = (latest - prev) / prev * 100;

    const analysis = calcTA(cs, hs, ls);
    const name = meta.shortName || meta.longName || code;

    return {
      code,
      name,
      market,
      price:       round(latest, 3),
      change:      round(change, 2),
      volume:      valid[valid.length - 1].v || 0,
      analysis,
      data_source: 'yahoo'
    };
  } catch (e) {
    console.log('Yahoo failed:', e.message);
    return null;
  }
}

// ─── 东方财富 取数（港股/A股备用） ───
async function fetchEastMoney(code, market) {
  try {
    let secid;
    if (market === '港股') {
      // 东财港股 secid 格式：116.XXXXX（5位，含前导零）
      secid = `116.${code}`;
    } else if (code.startsWith('6')) {
      secid = `1.${code}`;   // 上交所
    } else {
      secid = `0.${code}`;   // 深交所
    }

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&end=20500101&lmt=130`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    const klines = data?.data?.klines;
    if (!klines || klines.length < 20) return null;

    const name = data.data.name || code;
    const rows = klines.map(k => {
      const p = k.split(',');
      return { c: parseFloat(p[2]), h: parseFloat(p[3]), l: parseFloat(p[4]) };
    }).filter(x => !isNaN(x.c));

    const cs = rows.map(x => x.c);
    const hs = rows.map(x => x.h);
    const ls = rows.map(x => x.l);

    const latest = cs[cs.length - 1];
    const prev   = cs[cs.length - 2] ?? latest;

    const analysis = calcTA(cs, hs, ls);

    return {
      code,
      name,
      market,
      price:       round(latest, 3),
      change:      round((latest - prev) / prev * 100, 2),
      volume:      0,
      analysis,
      data_source: 'eastmoney'
    };
  } catch (e) {
    console.log('EastMoney failed:', e.message);
    return null;
  }
}

// ─── 技术指标计算 ───
function calcTA(cs, hs, ls) {
  const n = cs.length;

  // ── 移动均线 ──
  const sma = (arr, w) => {
    if (arr.length < w) return null;
    const s = arr.slice(-w);
    return s.reduce((a, b) => a + b, 0) / w;
  };
  const ma5  = sma(cs, 5);
  const ma10 = sma(cs, 10);
  const ma20 = sma(cs, 20);
  const ma60 = n >= 60 ? sma(cs, 60) : sma(cs, n);

  // ── RSI(14) ──
  const diffs  = cs.slice(1).map((v, i) => v - cs[i]);
  const last14 = diffs.slice(-14);
  const gains  = last14.map(d => d > 0 ? d : 0);
  const losses = last14.map(d => d < 0 ? -d : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
  const rsi = avgLoss === 0 ? 100 : round(100 - 100 / (1 + avgGain / avgLoss), 1);

  // ── MACD(12, 26, 9) 标准算法 ──
  // 用全部历史数据逐日推导 EMA，保证收敛精度
  const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
  let e12 = cs[0], e26 = cs[0];
  const difSeries = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      e12 = cs[0];
      e26 = cs[0];
    } else {
      e12 = e12 * (1 - k12) + cs[i] * k12;
      e26 = e26 * (1 - k26) + cs[i] * k26;
    }
    difSeries.push(e12 - e26);
  }
  const macdDIF = difSeries[n - 1];

  // DEA = EMA9(DIF 序列)
  let dea = difSeries[0];
  for (let i = 1; i < difSeries.length; i++) {
    dea = dea * (1 - k9) + difSeries[i] * k9;
  }
  const macdDEA  = dea;
  const macdHist = round((macdDIF - macdDEA) * 2, 4);

  // ── 布林带(20, 2σ) ──
  const slice20 = cs.slice(-20);
  const bMa  = slice20.reduce((a, b) => a + b, 0) / 20;
  const std   = Math.sqrt(slice20.reduce((s, v) => s + (v - bMa) ** 2, 0) / 20);
  const upper = bMa + 2 * std;
  const lower = bMa - 2 * std;

  const latest = cs[n - 1];

  // ── 趋势评分 ──
  let trendScore = 50;
  if (ma5  && latest > ma5)  trendScore += 10;
  if (ma10 && latest > ma10) trendScore += 10;
  if (ma20 && latest > ma20) trendScore += 10;
  if (ma60 && latest > ma60) trendScore += 10;
  if (ma5  && ma10 && ma5  > ma10) trendScore += 5;
  if (ma10 && ma20 && ma10 > ma20) trendScore += 5;
  trendScore = clamp(trendScore, 0, 100);

  // ── 动量评分 ──
  let momScore = 50;
  if (rsi > 50)           momScore += 10;
  if (rsi > 60)           momScore += 5;
  if (rsi > 70)           momScore += 5;
  if (macdDIF > 0)        momScore += 10;
  if (macdDIF > macdDEA)  momScore += 10;
  if (rsi < 30)           momScore -= 20;
  if (macdDIF < macdDEA)  momScore -= 5;
  momScore = clamp(momScore, 0, 100);

  // ── 波动评分（布林带位置） ──
  const bPos     = upper === lower ? 50 : Math.round((latest - lower) / (upper - lower) * 100);
  const volScore = clamp(bPos, 0, 100);

  const totalScore = Math.round((trendScore + momScore + volScore) / 3);

  // ── 综合信号 ──
  let bull = 0, bear = 0;
  if (trendScore > 60) bull++; else if (trendScore < 40) bear++;
  if (momScore   > 60) bull++; else if (momScore   < 40) bear++;
  if (macdDIF > macdDEA) bull++; else bear++;
  if (rsi > 50) bull++; else if (rsi < 45) bear++;
  const signal = bull >= 3 ? '买入' : bear >= 3 ? '卖出' : '观望';

  const label = s => s >= 80 ? '强势' : s >= 60 ? '偏强' : s >= 40 ? '中性' : s >= 20 ? '偏弱' : '弱势';

  return {
    score:        totalScore,
    trend:        { score: trendScore, label: label(trendScore) },
    momentum:     { score: momScore,   label: label(momScore)   },
    volatility:   { score: volScore,   label: label(volScore)   },
    signal,
    latest_price: round(latest, 3),
    support:      round(lower, 3),
    resistance:   round(upper, 3),
    rsi,
    macd_dif:     round(macdDIF, 4),
    macd_dea:     round(macdDEA, 4),
    macd_hist:    macdHist,
    ma5:          ma5  ? round(ma5,  3) : null,
    ma10:         ma10 ? round(ma10, 3) : null,
    ma20:         ma20 ? round(ma20, 3) : null,
    ma60:         ma60 ? round(ma60, 3) : null,
    upper_band:   round(upper, 3),
    lower_band:   round(lower, 3)
  };
}

function round(v, d) {
  return Math.round(v * 10 ** d) / 10 ** d;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
