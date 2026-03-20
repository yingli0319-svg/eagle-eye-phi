/**
 * 大宗商品页面 JavaScript
 * 数据来源：本地后端多源爬虫
 * - 新浪财经
 * - 东方财富
 * - 凤凰金融
 * - Yahoo Finance (备用)
 */

let commodityData = {
    metals: [],       // 贵金属
    baseMetals: [],   // 基本金属
    energy: [],       // 能源
    agriculture: [],  // 农产品
    crypto: [],       // 加密货币
    forex: []         // 货币汇率
};

let currentType = 'metals';
let isLoading = false;
let lastUpdate = null;

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTabs();
    setupFilter();
    loadData();
});

// 初始化导航
function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (toggle && menu) {
        toggle.addEventListener('click', () => menu.classList.toggle('active'));
    }
}

// 初始化标签页
function initTabs() {
    document.querySelectorAll('.commodity-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.commodity-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type;

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

// ============================================
// 从本地后端多源爬虫获取数据
// ============================================
async function fetchFromBackend() {
    try {
        console.log('正在从本地后端获取多源数据...');
        const response = await fetch('/api/commodity');

        if (!response.ok) {
            throw new Error('后端API请求失败');
        }

        const data = await response.json();
        console.log('后端返回数据:', data);
        return data;
    } catch (error) {
        console.error('从后端获取数据失败:', error);
        return null;
    }
}

// 处理后端返回的数据
function processBackendData(data) {
    if (!data) return false;

    // 贵金属
    commodityData.metals = [
        { key: 'gold', name: '黄金', code: 'NYMEX_GC', price: data.gold?.price || 0, change: data.gold?.change || 0, hasData: data.gold?.price > 0 },
        { key: 'silver', name: '白银', code: 'NYMEX_SI', price: data.silver?.price || 0, change: data.silver?.change || 0, hasData: data.silver?.price > 0 },
        { key: 'platinum', name: '铂金', code: 'NYMEX_PL', price: data.platinum?.price || 0, change: data.platinum?.change || 0, hasData: data.platinum?.price > 0 },
        { key: 'palladium', name: '钯金', code: 'NYMEX_PA', price: data.palladium?.price || 0, change: data.palladium?.change || 0, hasData: data.palladium?.price > 0 }
    ];

    // 基本金属
    commodityData.baseMetals = [
        { key: 'copper', name: '铜', code: 'COMEX_HG', price: data.copper?.price || 0, change: data.copper?.change || 0, hasData: data.copper?.price > 0 },
        { key: 'aluminum', name: '铝', code: 'LME_AL', price: data.aluminum?.price || 0, change: data.aluminum?.change || 0, hasData: data.aluminum?.price > 0 },
        { key: 'zinc', name: '锌', code: 'LME_ZN', price: data.zinc?.price || 0, change: data.zinc?.change || 0, hasData: data.zinc?.price > 0 },
        { key: 'nickel', name: '镍', code: 'LME_NI', price: data.nickel?.price || 0, change: data.nickel?.change || 0, hasData: data.nickel?.price > 0 },
        { key: 'lead', name: '铅', code: 'LME_PB', price: data.lead?.price || 0, change: data.lead?.change || 0, hasData: data.lead?.price > 0 },
        { key: 'tin', name: '锡', code: 'LME_SN', price: data.tin?.price || 0, change: data.tin?.change || 0, hasData: data.tin?.price > 0 },
        { key: 'ironOre', name: '铁矿石', code: 'DCE_I', price: data.iron_ore?.price || 0, change: data.iron_ore?.change || 0, hasData: data.iron_ore?.price > 0 },
        { key: 'steel', name: '螺纹钢', code: 'SHFE_RB', price: data.steel?.price || 0, change: data.steel?.change || 0, hasData: data.steel?.price > 0 }
    ];

    // 能源
    commodityData.energy = [
        { key: 'wtiOil', name: 'WTI原油', code: 'NYMEX_CL', price: data.oil?.price || 0, change: data.oil?.change || 0, hasData: data.oil?.price > 0 },
        { key: 'brentOil', name: '布伦特原油', code: 'ICE_BZ', price: data.brent_oil?.price || 0, change: data.brent_oil?.change || 0, hasData: data.brent_oil?.price > 0 },
        { key: 'naturalGas', name: '天然气', code: 'NYMEX_NG', price: data.natural_gas?.price || 0, change: data.natural_gas?.change || 0, hasData: data.natural_gas?.price > 0 },
        { key: 'coal', name: '煤炭', code: 'CZCE', price: data.coal?.price || 0, change: data.coal?.change || 0, hasData: data.coal?.price > 0 },
        { key: 'gasoline', name: '汽油', code: 'NYMEX_RB', price: data.gasoline?.price || 0, change: data.gasoline?.change || 0, hasData: data.gasoline?.price > 0 }
    ];

    // 农产品
    commodityData.agriculture = [
        { key: 'corn', name: '玉米', code: 'CBOT_ZC', price: data.corn?.price || 0, change: data.corn?.change || 0, hasData: data.corn?.price > 0 },
        { key: 'soybean', name: '大豆', code: 'CBOT_ZS', price: data.soybean?.price || 0, change: data.soybean?.change || 0, hasData: data.soybean?.price > 0 },
        { key: 'wheat', name: '小麦', code: 'CBOT_ZW', price: data.wheat?.price || 0, change: data.wheat?.change || 0, hasData: data.wheat?.price > 0 },
        { key: 'cotton', name: '棉花', code: 'ICE_CT', price: data.cotton?.price || 0, change: data.cotton?.change || 0, hasData: data.cotton?.price > 0 },
        { key: 'sugar', name: '糖', code: 'ICE_SB', price: data.sugar?.price || 0, change: data.sugar?.change || 0, hasData: data.sugar?.price > 0 },
        { key: 'coffee', name: '咖啡', code: 'ICE_KC', price: data.coffee?.price || 0, change: data.coffee?.change || 0, hasData: data.coffee?.price > 0 },
        { key: 'cocoa', name: '可可', code: 'ICE_CC', price: data.cocoa?.price || 0, change: data.cocoa?.change || 0, hasData: data.cocoa?.price > 0 },
        { key: 'orangeJuice', name: '橙汁', code: 'ICE_OJ', price: data.orange_juice?.price || 0, change: data.orange_juice?.change || 0, hasData: data.orange_juice?.price > 0 },
        { key: 'rice', name: '大米', code: 'CBOT_ZR', price: data.rice?.price || 0, change: data.rice?.change || 0, hasData: data.rice?.price > 0 },
        { key: 'oat', name: '燕麦', code: 'CBOT_ZO', price: data.oats?.price || 0, change: data.oats?.change || 0, hasData: data.oats?.price > 0 },
        { key: 'leanHog', name: '瘦肉猪', code: 'CME_HE', price: data.lean_hogs?.price || 0, change: data.lean_hogs?.change || 0, hasData: data.lean_hogs?.price > 0 },
        { key: 'liveCattle', name: '活牛', code: 'CME_LE', price: data.live_cattle?.price || 0, change: data.live_cattle?.change || 0, hasData: data.live_cattle?.price > 0 }
    ];

    // 加密货币
    commodityData.crypto = [
        { key: 'btc', name: '比特币', code: 'BTC', price: data.btc_usd?.price || 0, change: data.btc_usd?.change || 0, hasData: data.btc_usd?.price > 0 },
        { key: 'eth', name: '以太坊', code: 'ETH', price: data.eth_usd?.price || 0, change: data.eth_usd?.change || 0, hasData: data.eth_usd?.price > 0 }
    ];

    // 货币汇率
    commodityData.forex = [
        { key: 'usdCny', name: '美元/人民币', code: 'USD/CNY', price: data.usd_cny?.price || 0, change: data.usd_cny?.change || 0, hasData: data.usd_cny?.price > 0 },
        { key: 'usdHkd', name: '美元/港币', code: 'USD/HKD', price: data.usd_hkd?.price || 0, change: data.usd_hkd?.change || 0, hasData: data.usd_hkd?.price > 0 },
        { key: 'usdJpy', name: '美元/日元', code: 'USD/JPY', price: data.usd_jpy?.price || 0, change: data.usd_jpy?.change || 0, hasData: data.usd_jpy?.price > 0 },
        { key: 'eurUsd', name: '欧元/美元', code: 'EUR/USD', price: data.eur_usd?.price || 0, change: data.eur_usd?.change || 0, hasData: data.eur_usd?.price > 0 },
        { key: 'gbpUsd', name: '英镑/美元', code: 'GBP/USD', price: data.gbp_usd?.price || 0, change: data.gbp_usd?.change || 0, hasData: data.gbp_usd?.price > 0 },
        { key: 'hkdCny', name: '港币/人民币', code: 'HKD/CNY', price: data.hkd_cny?.price || 0, change: data.hkd_cny?.change || 0, hasData: data.hkd_cny?.price > 0 }
    ];

    return true;
}

// ============================================
// 主数据加载
// ============================================
async function loadData() {
    if (isLoading) return;
    isLoading = true;

    showLoading(true);

    try {
        // 从本地后端获取多源数据
        const backendData = await fetchFromBackend();

        if (backendData) {
            processBackendData(backendData);
            lastUpdate = new Date().toLocaleTimeString('zh-CN');
            console.log('数据来源: 本地后端多源爬虫');
        } else {
            console.log('后端数据获取失败，使用默认数据');
            loadDefaultData();
        }

        loadOverview();
        loadCommodities(currentType);

    } catch (error) {
        console.error('加载商品数据失败:', error);
        loadDefaultData();
        loadOverview();
        loadCommodities(currentType);
        showToast('数据加载失败，显示默认数据');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// 加载默认数据（备用）
function loadDefaultData() {
    commodityData.metals = [
        { key: 'gold', name: '黄金', code: 'NYMEX', price: 4680, change: 1.5, hasData: true },
        { key: 'silver', name: '白银', code: 'NYMEX', price: 72.5, change: 2.1, hasData: true },
        { key: 'platinum', name: '铂金', code: 'NYMEX', price: 1960, change: 0.8, hasData: true },
        { key: 'palladium', name: '钯金', code: 'NYMEX', price: 980, change: -0.5, hasData: true }
    ];
    commodityData.baseMetals = [
        { key: 'copper', name: '铜', code: 'COMEX', price: 5.46, change: 0.5, hasData: true },
        { key: 'aluminum', name: '铝', code: 'LME', price: 2450, change: 0.3, hasData: true },
        { key: 'zinc', name: '锌', code: 'LME', price: 2850, change: -0.2, hasData: true },
        { key: 'nickel', name: '镍', code: 'LME', price: 18500, change: 1.2, hasData: true },
        { key: 'lead', name: '铅', code: 'LME', price: 2100, change: 0.1, hasData: true },
        { key: 'tin', name: '锡', code: 'LME', price: 33500, change: -0.3, hasData: true },
        { key: 'ironOre', name: '铁矿石', code: 'DCE', price: 850, change: 1.8, hasData: true },
        { key: 'steel', name: '螺纹钢', code: 'SHFE', price: 3650, change: 0.5, hasData: true }
    ];
    commodityData.energy = [
        { key: 'wtiOil', name: 'WTI原油', code: 'NYMEX', price: 94.3, change: -1.5, hasData: true },
        { key: 'brentOil', name: '布伦特原油', code: 'ICE', price: 98.5, change: -1.2, hasData: true },
        { key: 'naturalGas', name: '天然气', code: 'NYMEX', price: 2.85, change: 2.3, hasData: true },
        { key: 'coal', name: '煤炭', code: 'CZCE', price: 850, change: 0.8, hasData: true },
        { key: 'gasoline', name: '汽油', code: 'NYMEX', price: 2.95, change: -0.5, hasData: true }
    ];
    commodityData.agriculture = [
        { key: 'corn', name: '玉米', code: 'CBOT', price: 450, change: 0.5, hasData: true },
        { key: 'soybean', name: '大豆', code: 'CBOT', price: 1200, change: -0.3, hasData: true },
        { key: 'wheat', name: '小麦', code: 'CBOT', price: 550, change: 0.8, hasData: true },
        { key: 'cotton', name: '棉花', code: 'ICE', price: 80, change: 1.2, hasData: true },
        { key: 'sugar', name: '糖', code: 'ICE', price: 18.5, change: -0.5, hasData: true },
        { key: 'coffee', name: '咖啡', code: 'ICE', price: 185, change: 2.1, hasData: true },
        { key: 'cocoa', name: '可可', code: 'ICE', price: 4200, change: 3.5, hasData: true },
        { key: 'orangeJuice', name: '橙汁', code: 'ICE', price: 280, change: 0.2, hasData: true },
        { key: 'rice', name: '大米', code: 'CBOT', price: 15.5, change: 0.1, hasData: true },
        { key: 'oat', name: '燕麦', code: 'CBOT', price: 350, change: -0.2, hasData: true },
        { key: 'leanHog', name: '瘦肉猪', code: 'CME', price: 85, change: 1.5, hasData: true },
        { key: 'liveCattle', name: '活牛', code: 'CME', price: 180, change: 0.8, hasData: true }
    ];
    commodityData.crypto = [
        { key: 'btc', name: '比特币', code: 'BTC', price: 70600, change: 1.2, hasData: true },
        { key: 'eth', name: '以太坊', code: 'ETH', price: 3450, change: 1.8, hasData: true }
    ];
    commodityData.forex = [
        { key: 'usdCny', name: '美元/人民币', code: 'USD/CNY', price: 6.89, change: 0.2, hasData: true },
        { key: 'usdHkd', name: '美元/港币', code: 'USD/HKD', price: 7.84, change: -0.1, hasData: true },
        { key: 'usdJpy', name: '美元/日元', code: 'USD/JPY', price: 151.5, change: 0.3, hasData: true },
        { key: 'eurUsd', name: '欧元/美元', code: 'EUR/USD', price: 1.08, change: -0.2, hasData: true },
        { key: 'gbpUsd', name: '英镑/美元', code: 'GBP/USD', price: 1.26, change: 0.1, hasData: true },
        { key: 'hkdCny', name: '港币/人民币', code: 'HKD/CNY', price: 0.88, change: 0.3, hasData: true }
    ];
}

// ============================================
// UI 渲染函数
// ============================================

function showLoading(show) {
    const existing = document.querySelector('.loading-overlay');
    if (show) {
        if (existing) return;
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div><div>正在从多源获取数据...</div>';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:white;font-size:18px;';
        document.body.appendChild(overlay);
    } else {
        if (existing) existing.remove();
    }
}

function loadOverview() {
    const grid = document.getElementById('overview-grid');
    const highlights = [];

    const gold = commodityData.metals.find(m => m.key === 'gold');
    const oil = commodityData.energy.find(m => m.key === 'wtiOil');
    const btc = commodityData.crypto.find(m => m.key === 'btc');
    const copper = commodityData.baseMetals.find(m => m.key === 'copper');

    if (gold?.hasData) highlights.push({ name: '黄金', code: 'NYMEX', price: gold.price, change: gold.change, icon: '🥇' });
    if (oil?.hasData) highlights.push({ name: 'WTI原油', code: 'NYMEX', price: oil.price, change: oil.change, icon: '🛢️' });
    if (btc?.hasData) highlights.push({ name: '比特币', code: 'BTC', price: btc.price, change: btc.change, icon: '₿' });
    if (copper?.hasData) highlights.push({ name: '铜', code: 'COMEX', price: copper.price, change: copper.change, icon: '🔶' });

    if (highlights.length < 4) {
        highlights.length = 0;
        highlights.push(
            { name: '黄金', code: 'NYMEX', price: 4680, change: 1.5, icon: '🥇' },
            { name: 'WTI原油', code: 'NYMEX', price: 94.3, change: -1.5, icon: '🛢️' },
            { name: '比特币', code: 'BTC', price: 70600, change: 1.2, icon: '₿' },
            { name: '铜', code: 'COMEX', price: 5.46, change: 0.5, icon: '🔶' }
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

function loadForexRates() {
    const grid = document.getElementById('forex-grid');
    const rates = commodityData.forex || [];

    if (rates.length === 0) {
        grid.innerHTML = '<p class="no-data">暂无数据</p>';
        return;
    }

    grid.innerHTML = rates.map(item => `
        <div class="overview-card">
            <div class="overview-name">${item.name}</div>
            <div class="overview-price">${item.hasData ? formatPrice(item.price, item.code) : '--'}</div>
            <div class="overview-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.hasData ? `${item.change >= 0 ? '↑' : '↓'} ${Math.abs(item.change).toFixed(4)}%` : '--'}
            </div>
        </div>
    `).join('');
}

function loadCommodities(type) {
    const tbody = document.getElementById('commodity-tbody');
    let commodities = commodityData[type] || [];

    if (type === 'all') {
        commodities = [...commodityData.metals, ...commodityData.baseMetals, ...commodityData.energy, ...commodityData.agriculture, ...commodityData.crypto];
    }

    if (type === 'metals') {
        commodities = [...commodityData.metals, ...commodityData.baseMetals];
    }

    if (commodities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = commodities.map(item => `
        <tr>
            <td><span class="commodity-name">${item.name}</span></td>
            <td><span class="commodity-code">${item.code}</span></td>
            <td><span class="commodity-price">${item.hasData ? formatPrice(item.price, item.code) : '--'}</span></td>
            <td><span class="commodity-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.hasData ? `${item.change >= 0 ? '+' : ''}${formatPrice(item.change, item.code)}` : '--'}
            </span></td>
            <td><span class="commodity-change ${item.change >= 0 ? 'up' : 'down'}">
                ${item.hasData ? `${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%` : '--'}
            </span></td>
            <td><span class="commodity-change">--</span></td>
            <td>${item.hasData ? getRecommendation(item) : '<span class="no-data">暂无</span>'}</td>
        </tr>
    `).join('');
}

// ============================================
// 刷新数据
// ============================================
async function refreshCommodities() {
    const btn = document.querySelector('.btn-refresh');
    if (!btn || isLoading) return;

    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> 刷新中...';
    btn.disabled = true;

    try {
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
        showToast('数据更新失败');
    }

    btn.innerHTML = originalText;
    btn.disabled = false;
}

// ============================================
// 筛选设置
// ============================================
function setupFilter() {
    const filter = document.getElementById('commodity-filter');
    if (filter) {
        filter.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'all') {
                loadCommodities('all');
            } else if (type === 'metals') {
                loadCommodities('metals');
            } else {
                loadCommodities(type);
            }
        });
    }
}

// ============================================
// 辅助函数
// ============================================

function formatPrice(price, code) {
    if (!price || price === 0) return '--';

    if (code === 'BTC' || code === 'ETH') {
        return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (code.includes('/')) {
        return price.toFixed(4);
    }
    if (['NYMEX', 'COMEX', 'ICE', 'LME', 'CBOT', 'CME'].includes(code)) {
        return '$' + price.toFixed(2);
    }
    return '$' + price.toFixed(2);
}

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

function calculateScore(item) {
    let score = 50;
    if (item.change > 2) score += 15;
    else if (item.change > 0) score += 5;
    else if (item.change < -2) score -= 15;
    else score -= 5;
    return Math.max(0, Math.min(100, score));
}

function showToast(message) {
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:80px;right:20px;background:linear-gradient(135deg,#4CAF50,#45a049);color:white;padding:12px 24px;border-radius:8px;z-index:10000;font-size:14px;';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
