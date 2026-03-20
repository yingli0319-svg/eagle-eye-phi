/**
 * 大宗商品页面 JavaScript
 * 数据来源：Yahoo Finance API (直接调用)
 */

// 存储从API获取的数据
let commodityData = {
    metals: [],
    baseMetals: [],
    energy: [],
    agriculture: [],
    crypto: [],
    forex: []
};

let currentType = 'metals';

// Yahoo Finance 期货代码映射
const COMMODITY_CODES = {
    // 贵金属
    gold: 'GC=F',
    silver: 'SI=F',
    platinum: 'PL=F',
    // 基本金属
    copper: 'HG=F',
    aluminum: 'ALI=F',
    zinc: 'ZN=F',
    nickel: 'NI=F',
    lead: 'PB=F',
    tin: 'SN=F',
    // 能源
    oil: 'CL=F',
    brent_oil: 'BZ=F',
    natural_gas: 'NG=F',
    // 农产品
    corn: 'ZC=F',
    soybean: 'ZS=F',
    wheat: 'ZW=F',
    cotton: 'CT=F',
    sugar: 'SB=F',
    coffee: 'KC=F',
    cocoa: 'CC=F',
    orange_juice: 'OJ=F',
    // 加密货币
    btc: 'BTC-USD',
    eth: 'ETH-USD',
    // 汇率
    usd_cny: 'CNY=X',
    usd_hkd: 'HKD=X',
    usd_jpy: 'JPY=X',
    eur_usd: 'EUR=X',
    gbp_usd: 'GBP=X',
    hkd_cny: 'CNYHKD=X'
};

// 商品中文名称映射
const COMMODITY_NAMES = {
    gold: '黄金',
    silver: '白银',
    platinum: '铂金',
    copper: '铜',
    aluminum: '铝',
    zinc: '锌',
    nickel: '镍',
    lead: '铅',
    tin: '锡',
    oil: 'WTI原油',
    brent_oil: '布伦特原油',
    natural_gas: '天然气',
    corn: '玉米',
    soybean: '大豆',
    wheat: '小麦',
    cotton: '棉花',
    sugar: '糖',
    coffee: '咖啡',
    cocoa: '可可',
    orange_juice: '橙汁',
    btc: '比特币',
    eth: '以太坊',
    usd_cny: '美元/人民币',
    usd_hkd: '美元/港币',
    usd_jpy: '美元/日元',
    eur_usd: '欧元/美元',
    gbp_usd: '英镑/美元',
    hkd_cny: '港币/人民币'
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTabs();
    setupFilter();
    loadData();
});

function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }
}

function initTabs() {
    document.querySelectorAll('.commodity-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.commodity-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            
            // 显示/隐藏货币汇率区块
            const forexSection = document.getElementById('forex-section');
            if (currentType === 'forex') {
                forexSection.style.display = 'block';
                loadForexRates();
            } else {
                forexSection.style.display = 'none';
                loadCommodities(currentType);
            }
        });
    });
}

// 从 Yahoo Finance API 获取数据
async function fetchFromYahoo(symbol) {
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
        );
        
        if (!response.ok) throw new Error('API请求失败');
        
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice || 0;
            const previousClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
            const changePercent = previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0;
            
            return {
                price: currentPrice,
                changePercent: changePercent
            };
        }
    } catch (error) {
        console.log('获取数据失败:', symbol, error);
    }
    return null;
}

// 批量获取商品数据
async function fetchCommoditiesBatch(items) {
    const promises = items.map(async (item) => {
        const data = await fetchFromYahoo(COMMODITY_CODES[item.key]);
        return {
            key: item.key,
            data: data
        };
    });
    
    return Promise.all(promises);
}

// 从 Yahoo Finance API 加载所有数据
async function loadData() {
    try {
        // 定义所有商品类别
        const allItems = [
            // 贵金属
            { key: 'gold', type: 'metals' },
            { key: 'silver', type: 'metals' },
            { key: 'platinum', type: 'metals' },
            // 基本金属
            { key: 'copper', type: 'baseMetals' },
            { key: 'aluminum', type: 'baseMetals' },
            { key: 'zinc', type: 'baseMetals' },
            { key: 'nickel', type: 'baseMetals' },
            { key: 'lead', type: 'baseMetals' },
            { key: 'tin', type: 'baseMetals' },
            // 能源
            { key: 'oil', type: 'energy' },
            { key: 'brent_oil', type: 'energy' },
            { key: 'natural_gas', type: 'energy' },
            // 农产品
            { key: 'corn', type: 'agriculture' },
            { key: 'soybean', type: 'agriculture' },
            { key: 'wheat', type: 'agriculture' },
            { key: 'cotton', type: 'agriculture' },
            { key: 'sugar', type: 'agriculture' },
            { key: 'coffee', type: 'agriculture' },
            { key: 'cocoa', type: 'agriculture' },
            { key: 'orange_juice', type: 'agriculture' },
            // 加密货币
            { key: 'btc', type: 'crypto' },
            { key: 'eth', type: 'crypto' },
            // 汇率
            { key: 'usd_cny', type: 'forex' },
            { key: 'usd_hkd', type: 'forex' },
            { key: 'usd_jpy', type: 'forex' },
            { key: 'eur_usd', type: 'forex' },
            { key: 'gbp_usd', type: 'forex' },
            { key: 'hkd_cny', type: 'forex' }
        ];
        
        // 分批获取数据（避免请求过多）
        const batchSize = 10;
        const results = {};
        
        for (let i = 0; i < allItems.length; i += batchSize) {
            const batch = allItems.slice(i, i + batchSize);
            const batchResults = await fetchCommoditiesBatch(batch);
            batchResults.forEach(item => {
                results[item.key] = item.data;
            });
            // 添加短暂延迟避免限流
            if (i + batchSize < allItems.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // 处理贵金属数据
        commodityData.metals = ['gold', 'silver', 'platinum'].map(key => ({
            name: COMMODITY_NAMES[key],
            code: COMMODITY_CODES[key],
            price: results[key]?.price || 0,
            change: 0,
            changePercent: results[key]?.changePercent || 0,
            weekChange: 0,
            type: 'metals'
        }));
        
        // 处理基本金属数据
        commodityData.baseMetals = ['copper', 'aluminum', 'zinc', 'nickel', 'lead', 'tin'].map(key => ({
            name: COMMODITY_NAMES[key],
            code: COMMODITY_CODES[key],
            price: results[key]?.price || 0,
            change: 0,
            changePercent: results[key]?.changePercent || 0,
            weekChange: 0,
            type: 'baseMetals'
        }));
        
        // 处理能源数据
        commodityData.energy = ['oil', 'brent_oil', 'natural_gas'].map(key => ({
            name: COMMODITY_NAMES[key],
            code: COMMODITY_CODES[key],
            price: results[key]?.price || 0,
            change: 0,
            changePercent: results[key]?.changePercent || 0,
            weekChange: 0,
            type: 'energy'
        }));
        
        // 处理农产品数据
        commodityData.agriculture = ['corn', 'soybean', 'wheat', 'cotton', 'sugar', 'coffee', 'cocoa', 'orange_juice'].map(key => ({
            name: COMMODITY_NAMES[key],
            code: COMMODITY_CODES[key],
            price: results[key]?.price || 0,
            change: 0,
            changePercent: results[key]?.changePercent || 0,
            weekChange: 0,
            type: 'agriculture'
        }));
        
        // 处理加密货币数据
        commodityData.crypto = ['btc', 'eth'].map(key => ({
            name: COMMODITY_NAMES[key],
            code: key.toUpperCase(),
            price: results[key]?.price || 0,
            change: 0,
            changePercent: results[key]?.changePercent || 0,
            weekChange: 0,
            type: 'crypto'
        }));
        
        // 处理汇率数据
        commodityData.forex = ['usd_cny', 'usd_hkd', 'usd_jpy', 'eur_usd', 'gbp_usd', 'hkd_cny'].map(key => ({
            name: COMMODITY_NAMES[key],
            code: key.toUpperCase(),
            price: results[key]?.price || 0,
            change: 0,
            changePercent: results[key]?.changePercent || 0,
            type: 'forex'
        }));
        
        console.log('商品数据加载成功:', commodityData);
        
        // 加载视图
        loadOverview();
        loadCommodities(currentType);
        
    } catch (error) {
        console.error('加载商品数据失败:', error);
        // 使用默认数据
        loadOverview();
        loadCommodities(currentType);
    }
}

// 加载货币汇率
function loadForexRates() {
    const grid = document.getElementById('forex-grid');
    
    const rates = commodityData.forex || [];
    
    if (rates.length === 0) {
        grid.innerHTML = '<p>暂无数据，请点击刷新</p>';
        return;
    }
    
    grid.innerHTML = rates.map(item => `
        <div class="overview-card">
            <div class="overview-name">${item.name}</div>
            <div class="overview-price">${formatPrice(item.price, item.code)}</div>
            <div class="overview-change ${item.changePercent >= 0 ? 'up' : 'down'}">
                ${item.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(item.changePercent || 0).toFixed(2)}%
            </div>
        </div>
    `).join('');
}

// 加载概览卡片
function loadOverview() {
    const grid = document.getElementById('overview-grid');
    
    // 从commodityData获取代表性商品
    const highlights = [];
    
    if (commodityData.metals.length > 0) {
        const gold = commodityData.metals.find(m => m.name === '黄金');
        if (gold) highlights.push({ name: '黄金', code: 'GC=F', price: gold.price, change: gold.changePercent, icon: '🥇' });
    }
    
    if (commodityData.energy.length > 0) {
        const oil = commodityData.energy.find(m => m.name === 'WTI原油');
        if (oil) highlights.push({ name: '原油', code: 'CL=F', price: oil.price, change: oil.changePercent, icon: '🛢️' });
    }
    
    if (commodityData.crypto.length > 0) {
        const btc = commodityData.crypto.find(m => m.name === '比特币');
        if (btc) highlights.push({ name: '比特币', code: 'BTC', price: btc.price, change: btc.changePercent, icon: '₿' });
    }
    
    if (commodityData.baseMetals.length > 0) {
        const copper = commodityData.baseMetals.find(m => m.name === '铜');
        if (copper) highlights.push({ name: '铜', code: 'HG=F', price: copper.price, change: copper.changePercent, icon: '🔶' });
    }
    
    // 如果没有数据，显示默认提示
    if (highlights.length === 0 || highlights.every(h => h.price === 0)) {
        highlights.push(
            { name: '黄金', code: 'GC=F', price: 0, change: 0, icon: '🥇' },
            { name: '原油', code: 'CL=F', price: 0, change: 0, icon: '🛢️' },
            { name: '比特币', code: 'BTC', price: 0, change: 0, icon: '₿' },
            { name: '铜', code: 'HG=F', price: 0, change: 0, icon: '🔶' }
        );
    }
    
    grid.innerHTML = highlights.map(item => `
        <div class="overview-card">
            <div class="overview-icon">${item.icon}</div>
            <div class="overview-name">${item.name}</div>
            <div class="overview-price">${formatPrice(item.price, item.code)}</div>
            <div class="overview-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.change >= 0 ? '↑' : '↓'} ${Math.abs(item.change || 0).toFixed(2)}%
            </div>
        </div>
    `).join('');
}

// 加载商品列表
function loadCommodities(type) {
    const tbody = document.getElementById('commodity-tbody');
    
    // 获取对应类型的数据
    let commodities = commodityData[type] || [];
    
    // 处理 'all' 类型
    if (type === 'all') {
        commodities = [
            ...commodityData.metals,
            ...commodityData.baseMetals,
            ...commodityData.energy,
            ...commodityData.crypto
        ];
    }
    
    // 处理 'metals' 类型时合并贵金属和基本金属
    if (type === 'metals') {
        commodities = [...commodityData.metals, ...commodityData.baseMetals];
    }
    
    if (commodities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">暂无数据，请点击刷新按钮更新数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = commodities.map(item => `
        <tr>
            <td><span class="commodity-name">${item.name}</span></td>
            <td><span class="commodity-code">${item.code}</span></td>
            <td><span class="commodity-price">${formatPrice(item.price, item.code)}</span></td>
            <td><span class="commodity-change ${(item.change || 0) >= 0 ? 'up' : 'down'}">
                ${(item.change || 0) >= 0 ? '+' : ''}${formatPrice(item.change || 0, item.code)}
            </span></td>
            <td><span class="commodity-change ${(item.changePercent || 0) >= 0 ? 'up' : 'down'}">
                ${(item.changePercent || 0) >= 0 ? '+' : ''}${(item.changePercent || 0).toFixed(2)}%
            </span></td>
            <td><span class="commodity-change ${(item.weekChange || 0) >= 0 ? 'up' : 'down'}">
                ${(item.weekChange || 0) >= 0 ? '+' : ''}${(item.weekChange || 0).toFixed(1)}%
            </span></td>
            <td>${getRecommendation(item)}</td>
        </tr>
    `).join('');
}

// 刷新数据
async function refreshCommodities() {
    const btn = document.querySelector('.btn-refresh');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> 刷新中...';
    
    try {
        // 重新从 Yahoo Finance API 获取数据
        await loadData();
        
        if (currentType === 'forex') {
            loadForexRates();
        } else {
            loadCommodities(currentType);
            loadOverview();
        }
        
        showToast('数据已更新');
    } catch (error) {
        console.error('刷新数据失败:', error);
        showToast('数据更新失败，请重试');
    }
    
    btn.innerHTML = originalText;
}

// 筛选设置
function setupFilter() {
    const filter = document.getElementById('commodity-filter');
    if (filter) {
        filter.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'all') {
                loadCommodities('all');
            } else {
                loadCommodities(type);
            }
        });
    }
}

// 格式化价格
function formatPrice(price, code) {
    if (price === 0) return '--';
    
    // 判断是否为加密货币
    if (code === 'BTC' || code === 'ETH' || code === 'BNB' || code === 'XRP' || code === 'SOL') {
        return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // 判断是否为汇率
    if (code.includes('CNY') || code.includes('HKD') || code.includes('JPY') || 
        code.includes('EUR') || code.includes('GBP') || code === 'CNYHKD=X') {
        return price.toFixed(4);
    }
    // 判断是否为金属期货
    if (code.endsWith('=F') || code.startsWith('HG') || code.startsWith('ALI') || 
        code.startsWith('ZN') || code.startsWith('NI') || code.startsWith('PB') || code.startsWith('SN')) {
        return '$' + price.toFixed(4);
    }
    // 其他商品
    return '$' + price.toFixed(2);
}

// 获取建议
function getRecommendation(item) {
    const score = calculateScore(item);
    let recommendation, className;
    
    if (score >= 70) {
        recommendation = '买入';
        className = 'buy';
    } else if (score >= 45) {
        recommendation = '持有';
        className = 'hold';
    } else {
        recommendation = '卖出';
        className = 'sell';
    }
    
    return `<span class="score-badge ${className}">${recommendation}</span>`;
}

// 计算评分
function calculateScore(item) {
    // 简化的评分逻辑
    let score = 50;
    
    const changePercent = item.changePercent || 0;
    const weekChange = item.weekChange || 0;
    
    // 短期动能
    if (changePercent > 2) score += 15;
    else if (changePercent > 0) score += 5;
    else if (changePercent < -2) score -= 15;
    else score -= 5;
    
    // 周趋势
    if (weekChange > 5) score += 15;
    else if (weekChange > 0) score += 5;
    else if (weekChange < -5) score -= 15;
    else score -= 5;
    
    return Math.max(0, Math.min(100, score));
}

// 显示提示信息
function showToast(message) {
    // 移除已有的toast
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    
    // 添加动画样式
    if (!document.getElementById('toast-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-animation';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
