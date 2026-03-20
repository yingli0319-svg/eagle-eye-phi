/**
 * 鹰眼看盘 - 主应用 JavaScript
 * 包含：数据加载、筛选、弹窗、图表功能
 * 版本: v2.0 - 2026-03-20
 */

// ==================== 数据源配置 ====================
// 设置为true使用真实数据，false使用模拟数据
// 注意：真实数据需要后端服务器配合避免跨域问题，当前使用模拟数据展示页面功能
const USE_REAL_DATA = false;

// ==================== 实时数据获取（使用新浪JSONP API） ====================
// 新浪财经API：A股用sh/sz前缀，港股用hk前缀，美股用n_前缀

// 转换股票代码为新浪API格式
function toSinaCode(code, market) {
    if (market === 'CN') {
        // A股：上海sh，深圳sz
        if (code.startsWith('6')) return 'sh' + code;
        if (code.startsWith('0') || code.startsWith('3')) return 'sz' + code;
    } else if (market === 'HK') {
        // 港股：hk前缀
        return 'hk' + code.replace('.HK', '');
    } else if (market === 'US') {
        // 美股：n_前缀
        return 'n_' + code.toLowerCase();
    }
    return code;
}

// 使用JSONP获取单只股票数据
function fetchStockPriceJSONP(code, market) {
    return new Promise((resolve) => {
        const sinaCode = toSinaCode(code, market);
        const callbackName = 'jsonp_callback_' + Math.random().toString(36).substr(2);
        
        // 创建script标签
        const script = document.createElement('script');
        script.src = `https://hq.sinajs.cn/list=${sinaCode}&callback=${callbackName}`;
        
        window[callbackName] = (data) => {
            try {
                const result = data.split(',');
                if (result.length >= 3) {
                    const price = parseFloat(result[1]) || 0;
                    const change = parseFloat(result[2]) || 0;
                    if (price > 0) {
                        resolve({
                            price: price,
                            change: change.toFixed(2),
                            changePercent: ((change / (price - change)) * 100).toFixed(2),
                            name: result[0]
                        });
                        return;
                    }
                }
            } catch (e) {
                console.log(`解析 ${code} 数据失败:`, e);
            }
            resolve(null);
            delete window[callbackName];
        };
        
        script.onerror = () => {
            console.log(`获取 ${code} 失败`);
            resolve(null);
            delete window[callbackName];
        };
        
        document.head.appendChild(script);
        setTimeout(() => {
            document.head.removeChild(script);
            delete window[callbackName];
        }, 3000);
    });
}

// 批量获取所有股票数据（使用CORS代理）
async function fetchAllRealTimeData(stocks) {
    // 使用代理绕过CORS
    const sinaCodes = stocks.map(s => toSinaCode(s.code, s.market)).join(',');
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://hq.sinajs.cn/list=${sinaCodes}`)}`;
    
    try {
        const response = await fetch(proxyUrl);
        const text = await response.text();
        
        // 解析返回数据: var hq_str_sh600519="贵州茅台,1800.00,...
        const results = [];
        const dataRegex = /hq_str_(\w+)="([^"]+)"/g;
        const dataMap = {};
        let match;
        
        while ((match = dataRegex.exec(text)) !== null) {
            dataMap[match[1]] = match[2];
        }
        
        stocks.forEach(stock => {
            const sinaCode = toSinaCode(stock.code, stock.market);
            const dataStr = dataMap[sinaCode];
            
            if (dataStr) {
                const parts = dataStr.split(',');
                const price = parseFloat(parts[1]) || 0;
                const change = parseFloat(parts[2]) || 0;
                
                if (price > 0) {
                    results.push({
                        stock,
                        data: {
                            price: price,
                            change: change.toFixed(2),
                            changePercent: ((change / (price - change)) * 100).toFixed(2),
                            name: parts[0]
                        }
                    });
                    return;
                }
            }
            results.push({ stock, data: null });
        });
        
        return results;
    } catch (error) {
        console.error('获取数据失败:', error);
        return stocks.map(stock => ({ stock, data: null }));
    }
}

// 兼容旧的单股票接口
async function fetchStockPrice(code, market) {
    const results = await fetchAllRealTimeData([{ code, market, name: '' }]);
    return results[0]?.data;
}

// ==================== 股票池配置 ====================
const STOCK_POOL = {
    // 趋势行业30只
    trend: [
        // 科技
        { code: 'AAPL', name: '苹果', market: 'US' },
        { code: 'MSFT', name: '微软', market: 'US' },
        { code: 'GOOGL', name: '谷歌', market: 'US' },
        { code: 'AMZN', name: '亚马逊', market: 'US' },
        { code: 'NVDA', name: '英伟达', market: 'US' },
        { code: 'META', name: 'Meta', market: 'US' },
        { code: 'TSLA', name: '特斯拉', market: 'US' },
        { code: 'BABA', name: '阿里巴巴', market: 'US' },
        // 医药
        { code: 'JNJ', name: '强生', market: 'US' },
        { code: 'UNH', name: '联合健康', market: 'US' },
        { code: 'PFE', name: '辉瑞', market: 'US' },
        // 金融
        { code: 'JPM', name: '摩根大通', market: 'US' },
        { code: 'BAC', name: '美国银行', market: 'US' },
        // 消费
        { code: 'PG', name: '宝洁', market: 'US' },
        { code: 'KO', name: '可口可乐', market: 'US' },
        { code: 'COST', name: '好市多', market: 'US' },
        // 新能源
        { code: 'TSLA', name: '特斯拉', market: 'US' },
        // 港股
        { code: '0700.HK', name: '腾讯', market: 'HK' },
        { code: '9988.HK', name: '阿里巴巴', market: 'HK' },
        { code: '3690.HK', name: '美团', market: 'HK' },
        // A股
        { code: '600519', name: '贵州茅台', market: 'CN' },
        { code: '000858', name: '五粮液', market: 'CN' },
        { code: '601318', name: '中国平安', market: 'CN' },
        { code: '600036', name: '招商银行', market: 'CN' },
        { code: '300750', name: '宁德时代', market: 'CN' },
    ],
    // 核医药 - 美股
    nuclearUS: [
        { code: 'CNM', name: 'Core Nuclear Medicine', market: 'US' },
        { code: 'IMNN', name: 'Imagin Rad', market: 'US' },
        { code: 'MRTX', name: 'Mirati Therapeutics', market: 'US' },
        { code: 'NNVC', name: 'Nanoviricides', market: 'US' },
        { code: 'PTLA', name: 'Protalix', market: 'US' },
    ],
    // 核医药 - 港股
    nuclearHK: [
        { code: '06185.HK', name: '康宁杰瑞', market: 'HK' },
        { code: '01515.HK', name: '华润医药', market: 'HK' },
        { code: '02552.HK', name: '康龙化成', market: 'HK' },
    ],
    // 核医药 - A股
    nuclearCN: [
        { code: '688198', name: '东诚药业', market: 'CN' },
        { code: '600196', name: '复星医药', market: 'CN' },
        { code: '002462', name: '嘉事堂', market: 'CN' },
        { code: '600713', name: '南京医药', market: 'CN' },
        { code: '300015', name: '爱尔眼科', market: 'CN' },
    ]
};

// 合并所有股票
const ALL_STOCKS = [
    ...STOCK_POOL.trend,
    ...STOCK_POOL.nuclearUS,
    ...STOCK_POOL.nuclearHK,
    ...STOCK_POOL.nuclearCN
];

// ==================== 模拟数据生成 ====================
// 实际项目中应从 Supabase 获取
function generateMockStockData() {
    return ALL_STOCKS.map(stock => {
        const basePrice = stock.market === 'US' ? (Math.random() * 300 + 20) : 
                         stock.market === 'HK' ? (Math.random() * 200 + 30) : 
                         (Math.random() * 100 + 10);
        
        // 评分计算
        const financialScore = Math.floor(Math.random() * 15 + 15); // 15-30
        const valuationScore = Math.floor(Math.random() * 15 + 15);  // 15-30
        const sentimentScore = Math.floor(Math.random() * 13 + 12);  // 12-25
        const catalystScore = Math.floor(Math.random() * 8 + 7);    // 7-15
        const totalScore = financialScore + valuationScore + sentimentScore + catalystScore;
        
        const targetPrice = basePrice * (1 + (Math.random() * 0.4 - 0.1));
        const upside = ((targetPrice - basePrice) / basePrice * 100);
        
        // 评级
        let rating = 'hold';
        if (totalScore >= 75 && upside > 15) rating = 'strong_buy';
        else if (totalScore >= 60 && upside > 5) rating = 'buy';
        else if (totalScore <= 35 || upside < -10) rating = 'sell';
        
        // 价格变动
        const change = (Math.random() * 10 - 4);
        
        return {
            ...stock,
            price: basePrice.toFixed(2),
            change: change.toFixed(2),
            changePercent: change.toFixed(2),
            targetPrice: targetPrice.toFixed(2),
            upside: upside.toFixed(1),
            score: totalScore,
            rating: rating,
            // 详细评分
            financialScore,
            valuationScore,
            sentimentScore,
            catalystScore,
            // 财务数据
            roe: (Math.random() * 30 + 5).toFixed(1),
            netMargin: (Math.random() * 25 + 5).toFixed(1),
            currentRatio: (Math.random() * 2 + 1).toFixed(2),
            debtRatio: (Math.random() * 40 + 20).toFixed(1),
            pe: (Math.random() * 40 + 5).toFixed(1),
        };
    });
}

// ==================== 应用状态 ====================
let stockData = [];
let filteredData = [];
let chartInstance = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    loadStockData();
    setupFilters();
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
    
    // 页面链接 - 现在让浏览器正常跳转
}

// 页面切换（模拟多页面）
function switchPage(pageId) {
    // 更新导航状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === pageId + '.html') {
            link.classList.add('active');
        }
    });
    
    // 这里可以添加页面切换逻辑
    // 当前演示版只做一个页面
}

// ==================== 数据加载 ====================
async function loadStockData() {
    // 显示加载状态
    const tbody = document.getElementById('stock-table-body');
    tbody.innerHTML = `
        <tr>
            <td colspan="10">
                <div class="loading">
                    <div class="spinner"></div>
                    ${USE_REAL_DATA ? '正在获取实时数据...' : '加载数据中...'}
                </div>
            </td>
        </tr>
    `;
    
    if (USE_REAL_DATA) {
        // 使用真实数据
        try {
            const stocks = ALL_STOCKS;
            const realData = await fetchAllRealTimeData(stocks);
            
            stockData = stocks.map((stock, idx) => {
                const realInfo = realData[idx]?.data;
                
                // 如果获取到真实数据，使用真实价格；否则生成模拟数据
                if (realInfo && realInfo.price > 0) {
                    const targetPrice = realInfo.price * (1 + (Math.random() * 0.4 - 0.1));
                    const upside = ((targetPrice - realInfo.price) / realInfo.price * 100);
                    
                    // 评分计算
                    const financialScore = Math.floor(Math.random() * 15 + 15);
                    const valuationScore = Math.floor(Math.random() * 15 + 15);
                    const sentimentScore = Math.floor(Math.random() * 13 + 12);
                    const catalystScore = Math.floor(Math.random() * 8 + 7);
                    const totalScore = financialScore + valuationScore + sentimentScore + catalystScore;
                    
                    let rating = 'hold';
                    if (totalScore >= 75 && upside > 15) rating = 'strong_buy';
                    else if (totalScore >= 60 && upside > 5) rating = 'buy';
                    else if (totalScore <= 35 || upside < -10) rating = 'sell';
                    
                    return {
                        ...stock,
                        price: realInfo.price.toFixed(2),
                        change: realInfo.change,
                        changePercent: realInfo.changePercent,
                        targetPrice: targetPrice.toFixed(2),
                        upside: upside.toFixed(1),
                        score: totalScore,
                        rating: rating,
                        financialScore,
                        valuationScore,
                        sentimentScore,
                        catalystScore,
                        roe: (Math.random() * 30 + 5).toFixed(1),
                        netMargin: (Math.random() * 25 + 5).toFixed(1),
                        currentRatio: (Math.random() * 2 + 1).toFixed(2),
                        debtRatio: (Math.random() * 40 + 20).toFixed(1),
                        pe: (Math.random() * 40 + 5).toFixed(1),
                    };
                } else {
                    // 获取失败，使用模拟数据
                    return generateStockData(stock);
                }
            });
            
            filteredData = [...stockData];
            renderStockTable();
            updateStats();
            
        } catch (error) {
            console.error('获取实时数据失败:', error);
            // 回退到模拟数据
            stockData = generateMockStockData();
            filteredData = [...stockData];
            renderStockTable();
            updateStats();
        }
    } else {
        // 模拟API延迟
        setTimeout(() => {
            stockData = generateMockStockData();
            filteredData = [...stockData];
            renderStockTable();
            updateStats();
        }, 800);
    }
}

// 生成单只股票数据
function generateStockData(stock) {
    const basePrice = stock.market === 'US' ? (Math.random() * 300 + 20) : 
                     stock.market === 'HK' ? (Math.random() * 200 + 30) : 
                     (Math.random() * 100 + 10);
    
    const financialScore = Math.floor(Math.random() * 15 + 15);
    const valuationScore = Math.floor(Math.random() * 15 + 15);
    const sentimentScore = Math.floor(Math.random() * 13 + 12);
    const catalystScore = Math.floor(Math.random() * 8 + 7);
    const totalScore = financialScore + valuationScore + sentimentScore + catalystScore;
    
    const targetPrice = basePrice * (1 + (Math.random() * 0.4 - 0.1));
    const upside = ((targetPrice - basePrice) / basePrice * 100);
    
    let rating = 'hold';
    if (totalScore >= 75 && upside > 15) rating = 'strong_buy';
    else if (totalScore >= 60 && upside > 5) rating = 'buy';
    else if (totalScore <= 35 || upside < -10) rating = 'sell';
    
    const change = (Math.random() * 10 - 4);
    
    return {
        ...stock,
        price: basePrice.toFixed(2),
        change: change.toFixed(2),
        changePercent: change.toFixed(2),
        targetPrice: targetPrice.toFixed(2),
        upside: upside.toFixed(1),
        score: totalScore,
        rating: rating,
        financialScore,
        valuationScore,
        sentimentScore,
        catalystScore,
        roe: (Math.random() * 30 + 5).toFixed(1),
        netMargin: (Math.random() * 25 + 5).toFixed(1),
        currentRatio: (Math.random() * 2 + 1).toFixed(2),
        debtRatio: (Math.random() * 40 + 20).toFixed(1),
        pe: (Math.random() * 40 + 5).toFixed(1),
    };
}

// 刷新数据
async function refreshData() {
    const btn = document.querySelector('.btn-refresh');
    if (btn) {
        btn.innerHTML = '<span>⏳</span> 刷新中...';
    }
    
    if (USE_REAL_DATA) {
        // 使用真实API刷新数据
        try {
            const stocks = ALL_STOCKS;
            const realData = await fetchAllRealTimeData(stocks);
            
            stockData = stocks.map((stock, idx) => {
                const realInfo = realData[idx]?.data;
                
                if (realInfo && realInfo.price > 0) {
                    const targetPrice = realInfo.price * (1 + (Math.random() * 0.4 - 0.1));
                    const upside = ((targetPrice - realInfo.price) / realInfo.price * 100);
                    
                    const financialScore = Math.floor(Math.random() * 15 + 15);
                    const valuationScore = Math.floor(Math.random() * 15 + 15);
                    const sentimentScore = Math.floor(Math.random() * 13 + 12);
                    const catalystScore = Math.floor(Math.random() * 8 + 7);
                    const totalScore = financialScore + valuationScore + sentimentScore + catalystScore;
                    
                    let rating = 'hold';
                    if (totalScore >= 75 && upside > 15) rating = 'strong_buy';
                    else if (totalScore >= 60 && upside > 5) rating = 'buy';
                    else if (totalScore <= 35 || upside < -10) rating = 'sell';
                    
                    return {
                        ...stock,
                        price: realInfo.price.toFixed(2),
                        change: realInfo.change,
                        changePercent: realInfo.changePercent,
                        targetPrice: targetPrice.toFixed(2),
                        upside: upside.toFixed(1),
                        score: totalScore,
                        rating: rating,
                        financialScore,
                        valuationScore,
                        sentimentScore,
                        catalystScore,
                    };
                }
                return generateMockStockData().find(s => s.code === stock.code) || stock;
            });
        } catch (error) {
            console.error('刷新数据失败:', error);
            stockData = generateMockStockData();
        }
    } else {
        stockData = generateMockStockData();
    }
    
    applyFilters();
    updateStats();
    
    if (btn) {
        btn.innerHTML = '<span>🔄</span> 刷新数据';
    }
}

// ==================== 渲染股票表格 ====================
function renderStockTable() {
    const tbody = document.getElementById('stock-table-body');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    暂无数据
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredData.map(stock => `
        <tr>
            <td><span class="stock-code">${stock.code}</span></td>
            <td><span class="stock-name">${stock.name}</span></td>
            <td><span class="market-badge ${stock.market}">${getMarketName(stock.market)}</span></td>
            <td><span class="price ${parseFloat(stock.change) >= 0 ? 'up' : 'down'}">$${stock.price}</span></td>
            <td><span class="price ${parseFloat(stock.change) >= 0 ? 'up' : 'down'}">${stock.change >= 0 ? '+' : ''}${stock.changePercent}%</span></td>
            <td><span class="price">$${stock.targetPrice}</span></td>
            <td><span class="upside ${parseFloat(stock.upside) >= 0 ? 'positive' : 'negative'}">${stock.upside >= 0 ? '+' : ''}${stock.upside}%</span></td>
            <td><span class="score-number">${stock.score}</span></td>
            <td><span class="score-badge ${stock.rating}">${getRatingText(stock.rating)}</span></td>
            <td><button class="btn-action" onclick="openStockDetail('${stock.code}')">详情</button></td>
        </tr>
    `).join('');
}

// 更新统计卡片
function updateStats() {
    document.getElementById('total-stocks').textContent = stockData.length;
    document.getElementById('strong-buy').textContent = stockData.filter(s => s.rating === 'strong_buy').length;
    document.getElementById('buy').textContent = stockData.filter(s => s.rating === 'buy').length;
    document.getElementById('hold').textContent = stockData.filter(s => s.rating === 'hold').length;
    document.getElementById('sell').textContent = stockData.filter(s => s.rating === 'sell').length;
}

// ==================== 筛选功能 ====================
function setupFilters() {
    const marketFilter = document.getElementById('market-filter');
    const ratingFilter = document.getElementById('rating-filter');
    
    if (marketFilter) {
        marketFilter.addEventListener('change', applyFilters);
    }
    if (ratingFilter) {
        ratingFilter.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
    const marketFilter = document.getElementById('market-filter');
    const ratingFilter = document.getElementById('rating-filter');
    
    const market = marketFilter ? marketFilter.value : 'all';
    const rating = ratingFilter ? ratingFilter.value : 'all';
    
    filteredData = stockData.filter(stock => {
        const marketMatch = market === 'all' || stock.market === market;
        const ratingMatch = rating === 'all' || stock.rating === rating;
        return marketMatch && ratingMatch;
    });
    
    renderStockTable();
}

// ==================== 弹窗功能 ====================
function openStockDetail(code) {
    const stock = stockData.find(s => s.code === code);
    if (!stock) return;
    
    // 填充基本信息
    document.getElementById('modal-stock-name').textContent = `${stock.name} (${stock.code})`;
    
    // 填充评分
    document.getElementById('score-financial').style.width = `${(stock.financialScore / 30) * 100}%`;
    document.getElementById('score-financial-value').textContent = stock.financialScore;
    
    document.getElementById('score-valuation').style.width = `${(stock.valuationScore / 30) * 100}%`;
    document.getElementById('score-valuation-value').textContent = stock.valuationScore;
    
    document.getElementById('score-sentiment').style.width = `${(stock.sentimentScore / 25) * 100}%`;
    document.getElementById('score-sentiment-value').textContent = stock.sentimentScore;
    
    document.getElementById('score-catalyst').style.width = `${(stock.catalystScore / 15) * 100}%`;
    document.getElementById('score-catalyst-value').textContent = stock.catalystScore;
    
    // 填充财务数据
    document.getElementById('fin-roe').textContent = `${stock.roe}%`;
    document.getElementById('fin-net-margin').textContent = `${stock.netMargin}%`;
    document.getElementById('fin-current').textContent = stock.currentRatio;
    document.getElementById('fin-debt').textContent = `${stock.debtRatio}%`;
    document.getElementById('fin-pe').textContent = stock.pe;
    document.getElementById('fin-target').textContent = `$${stock.targetPrice}`;
    
    // 显示弹窗
    document.getElementById('stock-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 绘制图表
    renderStockChart(stock);
}

function closeModal() {
    document.getElementById('stock-modal').classList.remove('active');
    document.body.style.overflow = '';
    
    // 销毁图表
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// 点击背景关闭弹窗
document.getElementById('stock-modal').addEventListener('click', (e) => {
    if (e.target.id === 'stock-modal') {
        closeModal();
    }
});

// ESC键关闭弹窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ==================== 图表功能 ====================
function renderStockChart(stock) {
    const ctx = document.getElementById('stock-chart').getContext('2d');
    
    // 生成模拟历史数据
    const labels = [];
    const priceData = [];
    const indexData = [];
    let price = parseFloat(stock.price) * 0.85;
    let index = 100;
    
    for (let i = 30; i >= 0; i--) {
        labels.push(`${i}天前`);
        price = price * (1 + (Math.random() * 0.04 - 0.015));
        index = index * (1 + (Math.random() * 0.02 - 0.008));
        priceData.push(price);
        indexData.push(index);
    }
    
    // 销毁旧图表
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // 创建新图表
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `${stock.name} 股价`,
                    data: priceData,
                    borderColor: '#d4a853',
                    backgroundColor: 'rgba(212, 168, 83, 0.1)',
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '市场指数',
                    data: indexData,
                    borderColor: '#4fc3f7',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e8eaed'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#9aa0a6',
                        maxTicksLimit: 6
                    },
                    grid: {
                        color: 'rgba(45, 55, 72, 0.5)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '股价 ($)',
                        color: '#d4a853'
                    },
                    ticks: {
                        color: '#d4a853'
                    },
                    grid: {
                        color: 'rgba(45, 55, 72, 0.5)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '指数',
                        color: '#4fc3f7'
                    },
                    ticks: {
                        color: '#4fc3f7'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// ==================== 工具函数 ====================
function getMarketName(market) {
    const names = {
        'US': '美股',
        'HK': '港股',
        'CN': 'A股'
    };
    return names[market] || market;
}

function getRatingText(rating) {
    const texts = {
        'strong_buy': '强力买入',
        'buy': '买入',
        'hold': '持有',
        'sell': '卖出'
    };
    return texts[rating] || rating;
}

// ==================== 导出数据供其他页面使用 ====================
window.eagleSearch = {
    stockData,
    filteredData,
    refreshData,
    openStockDetail,
    closeModal
};
