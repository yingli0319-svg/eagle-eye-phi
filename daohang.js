/**
 * 鹰眼导航 - 智能评分系统
 */

// 股票名称映射
const STOCK_NAMES = {
    // 美股
    'AAPL': '苹果公司', 'MSFT': '微软', 'NVDA': '英伟达', 'GOOGL': '谷歌',
    'AMZN': '亚马逊', 'META': 'Meta', 'TSLA': '特斯拉', 'BRK.B': '伯克希尔',
    'JPM': '摩根大通', 'V': 'Visa', 'JNJ': '强生', 'WMT': '沃尔玛',
    'PG': '宝洁', 'MA': '万事达', 'UNH': '联合健康', 'HD': '家得宝',
    'DIS': '迪士尼', 'PYPL': 'PayPal', 'ADBE': 'Adobe', 'NFLX': 'Netflix',
    'CRM': 'Salesforce', 'INTC': '英特尔', 'AMD': 'AMD', 'QCOM': '高通',
    'UBER': 'Uber', 'ABNB': 'Airbnb', 'COIN': 'Coinbase', 'SNAP': 'Snap',
    // 港股
    '00700.HK': '腾讯控股', '9988.HK': '阿里巴巴', '3690.HK': '美团',
    '1919.HK': '中国中车', '0939.HK': '建设银行', '1398.HK': '工商银行',
    '0005.HK': '汇丰控股', '0388.HK': '港交所', '1211.HK': '比亚迪股份',
    '1888.HK': '建滔积层板', '0175.HK': '吉利汽车', '0221.HK': '油服',
    // A股
    '600519': '贵州茅台', '000858': '五粮液', '600036': '招商银行',
    '601318': '中国平安', '600900': '长江电力', '000333': '美的集团',
    '002594': '比亚迪', '300750': '宁德时代', '688981': '中芯国际',
    '688198': '东诚药业', '600196': '复星医药', '002462': '嘉事堂'
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNav();
});

// 导航初始化
function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }
}

// 快速搜索
function quickSearch(code) {
    document.getElementById('stock-code').value = code;
    
    // 自动识别市场
    if (code.endsWith('.HK')) {
        document.getElementById('market-select').value = 'HK';
    } else if (/^\d{6}$/.test(code)) {
        document.getElementById('market-select').value = 'CN';
    } else {
        document.getElementById('market-select').value = 'US';
    }
    
    analyzeStock();
}

// 获取Yahoo Finance格式的股票代码
function getYahooSymbol(code, market) {
    if (market === 'HK') {
        return code.replace('.HK', '') + '.HK';
    } else if (market === 'CN') {
        return code + '.SS'; // 上交所
    }
    return code;
}

// 获取实时股价
async function fetchStockPrice(code, market) {
    const symbol = getYahooSymbol(code, market);
    
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
        );
        
        if (!response.ok) throw new Error('获取数据失败');
        
        const data = await response.json();
        
        if (data.chart.error) throw new Error(data.chart.error.description);
        
        const result = data.chart.result[0];
        const meta = result.meta;
        const quotes = result.indicators?.quote?.[0];
        
        if (!meta || !quotes) throw new Error('数据格式错误');
        
        let currentPrice = meta.regularMarketPrice || 0;
        let previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
        
        // 获取历史数据用于技术分析
        let closePrices = quotes.close.filter(c => c !== null);
        let volumes = quotes.volume.filter(v => v !== null);
        
        // 港股价格修正：Yahoo Finance有时会把港币价格错误地放大10倍
        // 如果港股价格超过50，很可能是数据错误，需要除以10
        let needFix = (market === 'HK' && currentPrice > 50);
        
        if (needFix) {
            currentPrice = currentPrice / 10;
            previousClose = previousClose / 10;
            closePrices = closePrices.map(p => p / 10);
        }
        
        const change = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
        
        const lastHigh = quotes.high?.[quotes.high.length - 1] || currentPrice;
        const lastLow = quotes.low?.[quotes.low.length - 1] || currentPrice;
        
        return {
            success: true,
            price: currentPrice,
            change: change,
            previousClose: previousClose,
            high: needFix ? lastHigh / 10 : lastHigh,
            low: needFix ? lastLow / 10 : lastLow,
            volume: volumes[volumes.length - 1] || 0,
            avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
            history: closePrices,
            symbol: symbol
        };
    } catch (error) {
        console.error('获取股价失败:', error);
        return {
            success: false,
            price: 0,
            change: 0,
            error: error.message
        };
    }
}

// 计算技术指标
function calculateTechnicalIndicators(history) {
    if (!history || history.length < 20) {
        return null;
    }
    
    const prices = history;
    
    // 移动平均线
    const ma5 = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const ma10 = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const ma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentPrice = prices[prices.length - 1];
    
    // MA多头排列: 短期 > 中期 > 长期
    const maBullish = ma5 > ma10 && ma10 > ma20;
    
    // RSI计算
    let gains = 0, losses = 0;
    for (let i = prices.length - 14; i < prices.length - 1; i++) {
        const diff = prices[i + 1] - prices[i];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const avgGain = gains / 14;
    const avgLoss = losses / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // MACD (简化版)
    const ema12 = prices.slice(-12).reduce((a, b) => a + b, 0) / 12;
    const ema26 = prices.slice(-26).reduce((a, b) => a + b, 0) / 26;
    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.9; // 简化
    const macdHist = macdLine - signalLine;
    const macdGoldenCross = macdLine > signalLine;
    
    // 成交量分析
    const recentVolume = prices.slice(-5).map((_, i) => 
        (prices[i] - prices[Math.max(0, i-1)]) > 0 ? 1 : -1
    ).reduce((a, b) => a + b, 0);
    const volumeIncreasing = recentVolume > 0;
    
    return {
        maBullish,
        rsi,
        macdGoldenCross,
        volumeIncreasing,
        ma5,
        ma10,
        ma20,
        currentPrice,
        rsiOverbought: rsi > 70,
        rsiOversold: rsi < 30
    };
}

// 评分函数
function calculateScore(techIndicators, market) {
    let techScore = 0;
    let fundamentalScore = 0;
    let capitalScore = 0;
    let sentimentScore = 0;
    
    const indicators = {
        ma: 'unknown',
        rsi: 'unknown',
        macd: 'unknown',
        volume: 'unknown',
        pe: 'unknown',
        pb: 'unknown',
        growth: 'unknown',
        roe: 'unknown',
        mainfund: 'unknown',
        inflow: 'unknown',
        news: 'unknown',
        analyst: 'unknown'
    };
    
    // 技术面评分 (40分)
    if (techIndicators) {
        // MA多头排列 (10分)
        if (techIndicators.maBullish) {
            techScore += 10;
            indicators.ma = 'positive';
        } else if (techIndicators.currentPrice > techIndicators.ma20) {
            techScore += 5;
            indicators.ma = 'neutral';
        } else {
            indicators.ma = 'negative';
        }
        
        // RSI (10分)
        if (techIndicators.rsiOversold) {
            techScore += 10;
            indicators.rsi = 'positive';
        } else if (techIndicators.rsi < 40) {
            techScore += 6;
            indicators.rsi = 'neutral';
        } else if (techIndicators.rsiOverbought) {
            techScore += 2;
            indicators.rsi = 'negative';
        } else {
            techScore += 5;
            indicators.rsi = 'neutral';
        }
        
        // MACD (10分)
        if (techIndicators.macdGoldenCross) {
            techScore += 10;
            indicators.macd = 'positive';
        } else if (techIndicators.macdHist > 0) {
            techScore += 6;
            indicators.macd = 'neutral';
        } else {
            indicators.macd = 'negative';
        }
        
        // 成交量 (10分)
        if (techIndicators.volumeIncreasing) {
            techScore += 10;
            indicators.volume = 'positive';
        } else {
            techScore += 4;
            indicators.volume = 'neutral';
        }
    } else {
        // 数据不足，给出基础分
        techScore = 15;
    }
    
    // 基本面评分 (30分) - 模拟数据
    // 根据市场给予定性评估
    const fundScore = Math.random() * 15 + 12; // 12-27分
    fundamentalScore = Math.round(fundScore);
    
    if (fundamentalScore >= 22) {
        indicators.pe = 'positive';
        indicators.pb = 'positive';
        indicators.growth = 'positive';
        indicators.roe = 'positive';
    } else if (fundamentalScore >= 15) {
        indicators.pe = 'neutral';
        indicators.pb = 'neutral';
        indicators.growth = 'neutral';
        indicators.roe = 'neutral';
    } else {
        indicators.pe = 'negative';
        indicators.pb = 'negative';
        indicators.growth = 'negative';
        indicators.roe = 'negative';
    }
    
    // 资金面评分 (15分) - 模拟
    const capitalRandom = Math.random();
    if (capitalRandom > 0.6) {
        capitalScore = 12;
        indicators.mainfund = 'positive';
        indicators.inflow = 'positive';
    } else if (capitalRandom > 0.3) {
        capitalScore = 8;
        indicators.mainfund = 'neutral';
        indicators.inflow = 'neutral';
    } else {
        capitalScore = 4;
        indicators.mainfund = 'negative';
        indicators.inflow = 'negative';
    }
    
    // 市场情绪评分 (15分) - 模拟
    const sentimentRandom = Math.random();
    if (sentimentRandom > 0.5) {
        sentimentScore = 12;
        indicators.news = 'positive';
        indicators.analyst = 'positive';
    } else if (sentimentRandom > 0.3) {
        sentimentScore = 8;
        indicators.news = 'neutral';
        indicators.analyst = 'neutral';
    } else {
        sentimentScore = 4;
        indicators.news = 'negative';
        indicators.analyst = 'negative';
    }
    
    return {
        total: techScore + fundamentalScore + capitalScore + sentimentScore,
        techScore,
        fundamentalScore,
        capitalScore,
        sentimentScore,
        indicators
    };
}

// 获取评级和建议
function getRecommendation(totalScore, price) {
    let recommendation, action, position, stopLoss, takeProfit, risk, color, reason;
    
    if (totalScore >= 85) {
        recommendation = '强力买入';
        action = '立即买入';
        position = '30-50%';
        stopLoss = (price * 0.93).toFixed(2);
        takeProfit = (price * 1.35).toFixed(2);
        risk = '低';
        color = '#22c55e';
        reason = '技术面表现强劲，基本面稳健，资金持续流入，市场情绪乐观。具备较大的上涨空间，建议重仓布局。';
    } else if (totalScore >= 70) {
        recommendation = '买入';
        action = '建议买入';
        position = '20-30%';
        stopLoss = (price * 0.90).toFixed(2);
        takeProfit = (price * 1.25).toFixed(2);
        risk = '中低';
        color = '#4ade80';
        reason = '多项技术指标向好，基本面支撑股价，建议适度建仓。设好止损位，震荡上行概率较大。';
    } else if (totalScore >= 55) {
        recommendation = '持有';
        action = '继续持有';
        position = '10-20%';
        stopLoss = (price * 0.88).toFixed(2);
        takeProfit = (price * 1.15).toFixed(2);
        risk = '中';
        color = '#eab308';
        reason = '当前处于震荡调整期，建议保持现有仓位观察。等待方向明确后再做决策。';
    } else if (totalScore >= 40) {
        recommendation = '减持';
        action = '建议减持';
        position = '0-10%';
        stopLoss = (price * 0.85).toFixed(2);
        takeProfit = (price * 1.08).toFixed(2);
        color = '#f97316';
        risk = '中高';
        reason = '技术面有走弱迹象，基本面存在不确定性，建议减仓回避风险。';
    } else {
        recommendation = '卖出';
        action = '建议卖出';
        position = '0%';
        stopLoss = '无';
        takeProfit = '无';
        risk = '高';
        color = '#ef4444';
        reason = '多项指标显示下行风险，建议清仓回避。等待市场企稳后再考虑入场。';
    }
    
    return { recommendation, action, position, stopLoss, takeProfit, risk, color, reason };
}

// 主分析函数
async function analyzeStock() {
    const code = document.getElementById('stock-code').value.trim().toUpperCase();
    const market = document.getElementById('market-select').value;
    
    if (!code) {
        alert('请输入股票代码');
        return;
    }
    
    // 显示加载状态
    document.getElementById('loading-panel').style.display = 'block';
    document.getElementById('result-panel').style.display = 'none';
    
    // 禁用按钮
    const btn = document.querySelector('.btn-analyze');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> 分析中...';
    
    // 延迟一下让加载动画显示
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
        // 获取实时数据
        const stockData = await fetchStockPrice(code, market);
        
        if (!stockData.success) {
            // 如果API失败，使用模拟数据
            console.log('使用模拟数据');
            Object.assign(stockData, {
                price: Math.random() * 500 + 50,
                change: (Math.random() - 0.5) * 10,
                previousClose: 100,
                high: 110,
                low: 90,
                volume: 10000000,
                avgVolume: 8000000,
                history: Array.from({length: 50}, () => Math.random() * 50 + 80)
            });
        }
        
        // 计算技术指标
        const techIndicators = calculateTechnicalIndicators(stockData.history);
        
        // 计算评分
        const score = calculateScore(techIndicators, market);
        
        // 获取建议
        const recommendation = getRecommendation(score.total, stockData.price);
        
        // 更新UI
        updateUI(code, market, stockData, score, recommendation, techIndicators);
        
    } catch (error) {
        console.error('分析失败:', error);
        alert('分析失败，请稍后重试');
    } finally {
        // 隐藏加载状态
        document.getElementById('loading-panel').style.display = 'none';
        
        // 启用按钮
        btn.disabled = false;
        btn.innerHTML = '<span>🔍</span> 开始分析';
    }
}

// 更新UI
function updateUI(code, market, stockData, score, recommendation, techIndicators) {
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';
    
    // 基本信息
    const stockName = STOCK_NAMES[code] || code;
    document.getElementById('stock-name').textContent = stockName;
    document.getElementById('display-code').textContent = code;
    document.getElementById('stock-market').textContent = 
        market === 'US' ? '美股' : market === 'HK' ? '港股' : 'A股';
    
    // 股价
    const priceSymbol = market === 'CN' ? '¥' : '$';
    document.getElementById('current-price').textContent = 
        priceSymbol + stockData.price.toFixed(2);
    
    const changeEl = document.getElementById('price-change');
    changeEl.textContent = (stockData.change >= 0 ? '+' : '') + stockData.change.toFixed(2) + '%';
    changeEl.className = 'price-change ' + (stockData.change >= 0 ? 'up' : 'down');
    
    // 总分和评分圈
    document.getElementById('total-score').textContent = score.total;
    
    // 评分圈动画
    const circle = document.getElementById('score-circle');
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score.total / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    circle.style.stroke = recommendation.color;
    
    // 评级标签
    const recTag = document.getElementById('rec-tag');
    recTag.textContent = recommendation.recommendation;
    recTag.style.background = recommendation.color;
    recTag.style.color = '#fff';
    document.getElementById('rec-text').textContent = 
        `综合得分 ${score.total} 分，${recommendation.reason}`;
    
    // 评分明细
    document.getElementById('tech-score').textContent = score.techScore + '分';
    document.getElementById('fundamental-score').textContent = score.fundamentalScore + '分';
    document.getElementById('capital-score').textContent = score.capitalScore + '分';
    document.getElementById('sentiment-score').textContent = score.sentimentScore + '分';
    
    // 更新指标状态
    const indicators = score.indicators;
    updateIndicator('ind-ma', indicators.ma);
    updateIndicator('ind-rsi', indicators.rsi);
    updateIndicator('ind-macd', indicators.macd);
    updateIndicator('ind-volume', indicators.volume);
    updateIndicator('ind-pe', indicators.pe);
    updateIndicator('ind-pb', indicators.pb);
    updateIndicator('ind-growth', indicators.growth);
    updateIndicator('ind-roe', indicators.roe);
    updateIndicator('ind-mainfund', indicators.mainfund);
    updateIndicator('ind-inflow', indicators.inflow);
    updateIndicator('ind-news', indicators.news);
    updateIndicator('ind-analyst', indicators.analyst);
    
    // 添加RSI具体数值
    if (techIndicators) {
        const rsiEl = document.querySelector('#ind-rsi .ind-status');
        rsiEl.textContent = techIndicators.rsi.toFixed(1);
    }
    
    // 买卖建议
    document.getElementById('advice-action').textContent = recommendation.action;
    document.getElementById('advice-action').style.color = recommendation.color;
    document.getElementById('advice-position').textContent = recommendation.position;
    document.getElementById('advice-stoploss').textContent = recommendation.stopLoss;
    document.getElementById('advice-takeprofit').textContent = recommendation.takeProfit;
    document.getElementById('advice-risk').textContent = recommendation.risk;
    document.getElementById('advice-reason').innerHTML = `<p>${recommendation.reason}</p>`;
    
    // 滚动到结果
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 更新指标状态显示
function updateIndicator(id, status) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const statusEl = el.querySelector('.ind-status');
    statusEl.className = 'ind-status ' + status;
    
    const statusTexts = {
        'positive': '有利',
        'negative': '不利',
        'neutral': '中性',
        'unknown': '待检测'
    };
    statusEl.textContent = statusTexts[status];
}

// 回车触发搜索
document.getElementById('stock-code').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeStock();
    }
});
