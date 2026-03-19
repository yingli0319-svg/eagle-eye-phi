/**
 * 大宗商品页面 JavaScript
 */

// 商品数据
const COMMODITIES = {
    metals: [
        { name: '黄金', code: 'XAUUSD', price: 2150.30, change: 12.50, changePercent: 0.58, weekChange: 2.3, type: 'metals' },
        { name: '白银', code: 'XAGUSD', price: 24.85, change: 0.32, changePercent: 1.30, weekChange: 3.5, type: 'metals' },
        { name: '铂金', code: 'XPTUSD', price: 985.40, change: -5.20, changePercent: -0.53, weekChange: -1.2, type: 'metals' },
        { name: '钯金', code: 'XPDUSD', price: 1045.60, change: 15.80, changePercent: 1.53, weekChange: 4.1, type: 'metals' },
        { name: '铜', code: 'HG=F', price: 4.12, change: 0.08, changePercent: 1.98, weekChange: 2.8, type: 'metals' },
    ],
    energy: [
        { name: 'WTI原油', code: 'CL=F', price: 82.45, change: -1.25, changePercent: -1.49, weekChange: -3.2, type: 'energy' },
        { name: '布伦特原油', code: 'BZ=F', price: 86.20, change: -0.95, changePercent: -1.09, weekChange: -2.8, type: 'energy' },
        { name: '天然气', code: 'NG=F', price: 2.85, change: 0.12, changePercent: 4.39, weekChange: 5.6, type: 'energy' },
        { name: '汽油', code: 'RB=F', price: 2.65, change: 0.05, changePercent: 1.92, weekChange: 1.8, type: 'energy' },
        { name: '取暖油', code: 'HO=F', price: 2.92, change: -0.03, changePercent: -1.02, weekChange: -2.1, type: 'energy' },
    ],
    agriculture: [
        { name: '小麦', code: 'ZW=F', price: 612.50, change: 8.25, changePercent: 1.37, weekChange: 2.5, type: 'agriculture' },
        { name: '玉米', code: 'ZC=F', price: 458.75, change: -3.50, changePercent: -0.76, weekChange: -1.8, type: 'agriculture' },
        { name: '大豆', code: 'ZS=F', price: 1218.25, change: 15.50, changePercent: 1.29, weekChange: 3.2, type: 'agriculture' },
        { name: '咖啡', code: 'KC=F', price: 185.40, change: 2.80, changePercent: 1.53, weekChange: 4.5, type: 'agriculture' },
        { name: '糖', code: 'SB=F', price: 21.85, change: -0.15, changePercent: -0.68, weekChange: -0.5, type: 'agriculture' },
    ],
    crypto: [
        { name: '比特币', code: 'BTC', price: 68245.30, change: 1250.50, changePercent: 1.87, weekChange: 8.5, type: 'crypto' },
        { name: '以太坊', code: 'ETH', price: 3456.80, change: -45.20, changePercent: -1.29, weekChange: 5.2, type: 'crypto' },
        { name: 'BNB', code: 'BNB', price: 585.20, change: 12.50, changePercent: 2.18, weekChange: 6.8, type: 'crypto' },
        { name: 'XRP', code: 'XRP', price: 0.62, change: 0.02, changePercent: 3.33, weekChange: 12.5, type: 'crypto' },
        { name: 'SOL', code: 'SOL', price: 145.60, change: 5.80, changePercent: 4.15, weekChange: 15.2, type: 'crypto' },
    ]
};

// 合并所有商品
const ALL_COMMODITIES = [
    ...COMMODITIES.metals,
    ...COMMODITIES.energy,
    ...COMMODITIES.agriculture,
    ...COMMODITIES.crypto
];

let currentType = 'metals';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTabs();
    loadOverview();
    loadCommodities(currentType);
    setupFilter();
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

// 标签页初始化
function initTabs() {
    document.querySelectorAll('.commodity-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.commodity-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;
            loadCommodities(currentType);
        });
    });
}

// 加载概览卡片
function loadOverview() {
    const grid = document.getElementById('overview-grid');
    
    // 选取代表性商品
    const highlights = [
        { name: '黄金', code: 'XAUUSD', price: 2150.30, change: 0.58, icon: '🥇' },
        { name: '原油', code: 'CL=F', price: 82.45, change: -1.49, icon: '🛢️' },
        { name: '比特币', code: 'BTC', price: 68245.30, change: 1.87, icon: '₿' },
        { name: '铜', code: 'HG=F', price: 4.12, change: 1.98, icon: '🔶' },
    ];
    
    grid.innerHTML = highlights.map(item => `
        <div class="overview-card">
            <div class="overview-icon">${item.icon}</div>
            <div class="overview-name">${item.name}</div>
            <div class="overview-price">${formatPrice(item.price, item.code)}</div>
            <div class="overview-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.change >= 0 ? '↑' : '↓'} ${Math.abs(item.change).toFixed(2)}%
            </div>
        </div>
    `).join('');
}

// 加载商品列表
function loadCommodities(type) {
    const tbody = document.getElementById('commodity-tbody');
    const commodities = COMMODITIES[type] || [];
    
    tbody.innerHTML = commodities.map(item => `
        <tr>
            <td><span class="commodity-name">${item.name}</span></td>
            <td><span class="commodity-code">${item.code}</span></td>
            <td><span class="commodity-price">${formatPrice(item.price, item.code)}</span></td>
            <td><span class="commodity-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.change >= 0 ? '+' : ''}${formatPrice(item.change, item.code)}
            </span></td>
            <td><span class="commodity-change ${item.changePercent >= 0 ? 'up' : 'down'}">
                ${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%
            </span></td>
            <td><span class="commodity-change ${item.weekChange >= 0 ? 'up' : 'down'}">
                ${item.weekChange >= 0 ? '+' : ''}${item.weekChange.toFixed(1)}%
            </span></td>
            <td>${getRecommendation(item)}</td>
        </tr>
    `).join('');
}

// 刷新数据
function refreshCommodities() {
    const btn = document.querySelector('.btn-refresh');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> 刷新中...';
    
    setTimeout(() => {
        loadCommodities(currentType);
        loadOverview();
        btn.innerHTML = originalText;
    }, 1000);
}

// 筛选设置
function setupFilter() {
    const filter = document.getElementById('commodity-filter');
    if (filter) {
        filter.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'all') {
                loadAllCommodities();
            } else {
                loadCommodities(type);
            }
        });
    }
}

// 加载全部
function loadAllCommodities() {
    const tbody = document.getElementById('commodity-tbody');
    tbody.innerHTML = ALL_COMMODITIES.map(item => `
        <tr>
            <td><span class="commodity-name">${item.name}</span></td>
            <td><span class="commodity-code">${item.code}</span></td>
            <td><span class="commodity-price">${formatPrice(item.price, item.code)}</span></td>
            <td><span class="commodity-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.change >= 0 ? '+' : ''}${formatPrice(item.change, item.code)}
            </span></td>
            <td><span class="commodity-change ${item.changePercent >= 0 ? 'up' : 'down'}">
                ${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%
            </span></td>
            <td><span class="commodity-change ${item.weekChange >= 0 ? 'up' : 'down'}">
                ${item.weekChange >= 0 ? '+' : ''}${item.weekChange.toFixed(1)}%
            </span></td>
            <td>${getRecommendation(item)}</td>
        </tr>
    `).join('');
}

// 格式化价格
function formatPrice(price, code) {
    // 判断是否为加密货币
    if (code === 'BTC' || code === 'ETH' || code === 'BNB' || code === 'XRP' || code === 'SOL') {
        return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // 判断是否为金属
    if (code.startsWith('XAU') || code.startsWith('XAG') || code.startsWith('XPT') || code.startsWith('XPD')) {
        return '$' + price.toFixed(2);
    }
    // 其他商品
    return '$' + price.toFixed(2);
}

// 获取建议
function getRecommendation(item) {
    const score = calculateScore(item);
    let recommendation, className;
    
    if (score >= 70) {
        recommendation = 'Buy';
        className = 'buy';
    } else if (score >= 45) {
        recommendation = 'Hold';
        className = 'hold';
    } else {
        recommendation = 'Sell';
        className = 'sell';
    }
    
    return `<span class="score-badge ${className}">${recommendation}</span>`;
}

// 计算评分
function calculateScore(item) {
    // 简化的评分逻辑
    let score = 50;
    
    // 短期动能
    if (item.changePercent > 2) score += 15;
    else if (item.changePercent > 0) score += 5;
    else if (item.changePercent < -2) score -= 15;
    else score -= 5;
    
    // 周趋势
    if (item.weekChange > 5) score += 15;
    else if (item.weekChange > 0) score += 5;
    else if (item.weekChange < -5) score -= 15;
    else score -= 5;
    
    return Math.max(0, Math.min(100, score));
}
