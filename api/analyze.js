// 天使鹰眼 - 股票技术分析API
// Vercel Serverless Function (Node.js)
// 多源数据：Yahoo Finance v8 API + 东方财富

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const code = (req.query.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: '请提供股票代码' });
  }

  try {
    const market = detectMarket(code);
    const ticker = toYFTicker(code, market);

    // 第一源：Yahoo Finance v8 API
    let result = await fetchYahoo(ticker, code, market);
    
    // 第二源：东方财富（港股/A股备用）
    if (!result && (market === '港股' || market === 'A股')) {
      result = await fetchEastMoney(code, market);
    }

    if (!result) {
      return res.status(404).json({ error: '未找到该股票数据，请检查代码是否正确' });
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: '数据获取失败: ' + e.message });
  }
}

function detectMarket(code) {
  // A股必须是严格6位数字，优先判断，否则会被港股规则吃掉
  if (/^\d{6}$/.test(code)) return 'A股';
  // 港股：1~5位纯数字
  if (/^\d{1,5}$/.test(code)) return '港股';
  // 美股：纯字母
  if (/^[A-Za-z]+$/.test(code)) return '美股';
  return '未知';
}

function toYFTicker(code, market) {
  const c = code.toUpperCase();
  if (market === '港股') {
    // 去掉前导零后补到4位，例如 00700/0700/700 → 0700.HK
    const num = parseInt(c, 10).toString();
    return num.padStart(4, '0') + '.HK';
  }
  if (market === 'A股') return c.startsWith('6') ? c + '.SS' : c + '.SZ';
  return c;
}

async function fetchYahoo(ticker, code, market) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await resp.json();
    
    const chart = data?.chart?.result?.[0];
    if (!chart) return null;

    const closes = chart.indicators.quote[0].close;
    const highs = chart.indicators.quote[0].high;
    const lows = chart.indicators.quote[0].low;
    const volumes = chart.indicators.quote[0].volume;
    const meta = chart.meta;

    // 过滤null值
    const valid = closes.map((c, i) => ({ c, h: highs[i], l: lows[i], v: volumes[i] }))
                        .filter(x => x.c !== null);
    if (valid.length < 10) return null;

    const cs = valid.map(x => x.c);
    const hs = valid.map(x => x.h);
    const ls = valid.map(x => x.l);

    const latest = cs[cs.length - 1];
    const prev = cs[cs.length - 2] || latest;
    const change = ((latest - prev) / prev * 100);

    const analysis = calcTA(cs, hs, ls);
    const name = meta.shortName || meta.longName || code;

    return {
      code,
      name,
      market,
      price: round(latest, 2),
      change: round(change, 2),
      volume: valid[valid.length - 1].v || 0,
      analysis,
      data_source: 'yahoo'
    };
  } catch (e) {
    console.log('Yahoo failed:', e.message);
    return null;
  }
}

async function fetchEastMoney(code, market) {
  try {
    let secid;
    if (market === '港股') secid = `116.${parseInt(code, 10).toString().padStart(5,'0')}`;
    else if (code.startsWith('6')) secid = `1.${code}`;
    else secid = `0.${code}`;

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=0&end=20500101&lmt=90`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await resp.json();

    const klines = data?.data?.klines;
    if (!klines || klines.length < 10) return null;

    const name = data.data.name || code;
    const rows = klines.map(k => {
      const p = k.split(',');
      return { c: parseFloat(p[2]), h: parseFloat(p[3]), l: parseFloat(p[4]) };
    }).filter(x => !isNaN(x.c));

    const cs = rows.map(x => x.c);
    const hs = rows.map(x => x.h);
    const ls = rows.map(x => x.l);

    const latest = cs[cs.length - 1];
    const prev = cs[cs.length - 2] || latest;

    const analysis = calcTA(cs, hs, ls);

    return {
      code,
      name,
      market,
      price: round(latest, 2),
      change: round((latest - prev) / prev * 100, 2),
      volume: 0,
      analysis,
      data_source: 'eastmoney'
    };
  } catch (e) {
    console.log('EastMoney failed:', e.message);
    return null;
  }
}

function calcTA(cs, hs, ls) {
  const n = cs.length;
  const ma = (arr, w) => {
    const slice = arr.slice(-w);
    return slice.length < w ? null : slice.reduce((a, b) => a + b, 0) / w;
  };

  const ma5  = ma(cs, 5);
  const ma10 = ma(cs, 10);
  const ma20 = ma(cs, 20);
  const ma60 = ma(cs, Math.min(60, n));

  // RSI(14)
  const diffs  = cs.slice(1).map((v, i) => v - cs[i]);
  const gains  = diffs.slice(-14).map(d => d > 0 ? d : 0);
  const losses = diffs.slice(-14).map(d => d < 0 ? -d : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
  const rsi = avgLoss === 0 ? 100 : round(100 - 100 / (1 + avgGain / avgLoss), 1);

  // MACD(12,26,9) — 标准算法：DIF = EMA12 - EMA26，DEA = EMA9(DIF)
  const calcEMA = (arr, span) => {
    const k = 2 / (span + 1);
    return arr.reduce((prev, cur) => prev === null ? cur : prev * (1 - k) + cur * k, null);
  };
  const ema12 = calcEMA(cs.slice(-40), 12);
  const ema26 = calcEMA(cs.slice(-40), 26);
  const macdDIF = ema12 - ema26;

  // DEA（Signal line）：对最近几个 DIF 值做 EMA9
  // 用整段历史重新推导逐日DIF，再算EMA9(DIF)
  const difSeries = [];
  let e12 = null, e26 = null;
  for (const p of cs) {
    e12 = e12 === null ? p : e12 * (1 - 2/13) + p * 2/13;
    e26 = e26 === null ? p : e26 * (1 - 2/27) + p * 2/27;
    difSeries.push(e12 - e26);
  }
  const macdDEA = calcEMA(difSeries.slice(-20), 9);
  const macdHist = round((macdDIF - macdDEA) * 2, 4); // MACD柱 = (DIF-DEA)*2

  // 布林带(20)
  const slice20 = cs.slice(-20);
  const bMa  = slice20.reduce((a, b) => a + b, 0) / slice20.length;
  const std   = Math.sqrt(slice20.reduce((s, v) => s + (v - bMa) ** 2, 0) / slice20.length);
  const upper = bMa + 2 * std;
  const lower = bMa - 2 * std;

  const latest = cs[n - 1];

  // 趋势评分
  let trendScore = 50;
  if (ma5  && latest > ma5)  trendScore += 10;
  if (ma10 && latest > ma10) trendScore += 10;
  if (ma20 && latest > ma20) trendScore += 10;
  if (ma60 && latest > ma60) trendScore += 10;
  if (ma5  && ma10 && ma5  > ma10) trendScore += 5;
  if (ma10 && ma20 && ma10 > ma20) trendScore += 5;
  trendScore = Math.min(100, Math.max(0, trendScore));

  // 动量评分
  let momScore = 50;
  if (rsi > 50) momScore += 15;
  if (rsi > 70) momScore += 10;
  if (macdDIF > 0)  momScore += 10;
  if (macdDIF > macdDEA) momScore += 5;
  momScore = Math.min(100, Math.max(0, momScore));

  // 波动评分（布林带位置）
  const bPos     = upper === lower ? 50 : Math.round((latest - lower) / (upper - lower) * 100);
  const volScore = Math.min(100, Math.max(0, bPos));

  const totalScore = Math.round((trendScore + momScore + volScore) / 3);

  // 综合信号
  let bull = 0, bear = 0;
  if (trendScore > 60) bull++; else if (trendScore < 40) bear++;
  if (momScore   > 60) bull++; else if (momScore   < 40) bear++;
  if (macdDIF > macdDEA) bull++; else bear++;
  if (rsi > 50) bull++; else bear++;
  const signal = bull >= 3 ? '买入' : bear >= 3 ? '卖出' : '观望';

  const label = s => s >= 80 ? '优秀' : s >= 60 ? '良好' : s >= 40 ? '中性' : s >= 20 ? '偏弱' : '弱势';

  return {
    score:      totalScore,
    trend:      { score: trendScore, label: label(trendScore) },
    momentum:   { score: momScore,   label: label(momScore)   },
    volatility: { score: volScore,   label: label(volScore)   },
    signal,
    latest_price: round(latest, 2),  // 供前端均线/布林带判断使用
    support:    round(lower, 2),
    resistance: round(upper, 2),
    rsi,
    macd_dif:   round(macdDIF, 4),
    macd_dea:   round(macdDEA, 4),
    macd_hist:  macdHist,
    ma5:        ma5  ? round(ma5,  2) : null,
    ma10:       ma10 ? round(ma10, 2) : null,
    ma20:       ma20 ? round(ma20, 2) : null,
    ma60:       ma60 ? round(ma60, 2) : null,
    upper_band: round(upper, 2),
    lower_band: round(lower, 2)
  };
}

function round(v, d) {
  return Math.round(v * 10 ** d) / 10 ** d;
}
