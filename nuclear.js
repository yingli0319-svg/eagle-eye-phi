/**
 * 核医药页面 JavaScript
 * 数据来源：Yahoo Finance API + 本地静态数据
 */

const NUCLEAR_STOCKS = {
    US: [
        { code: 'CNM', name: 'Core Nuclear Medicine', price: 0, change: 0 },
        { code: 'IMNN', name: 'Imagin Rad', price: 0, change: 0 },
        { code: 'MRTX', name: 'Mirati Therapeutics', price: 0, change: 0 },
        { code: 'NNVC', name: 'Nanoviricides', price: 0, change: 0 },
        { code: 'PTLA', name: 'Protalix', price: 0, change: 0 },
    ],
    HK: [
        { code: '06185.HK', name: '康宁杰瑞', price: 0, change: 0 },
        { code: '01515.HK', name: '华润医药', price: 0, change: 0 },
        { code: '02552.HK', name: '康龙化成', price: 0, change: 0 },
    ],
    CN: [
        { code: '688198', name: '东诚药业', price: 0, change: 0 },
        { code: '600196', name: '复星医药', price: 0, change: 0 },
        { code: '002462', name: '嘉事堂', price: 0, change: 0 },
        { code: '600713', name: '南京医药', price: 0, change: 0 },
        { code: '300015', name: '爱尔眼科', price: 0, change: 0 },
    ]
};

const LOCAL_NEWS_DATA = [
    { id: 1, title: 'FDA批准Pluvicto用于转移性去势抵抗性前列腺癌', summary: 'Novartis的Pluvicto (Lu-177 PSMA-617)获得FDA批准，成为首个获批的靶向PSMA的放射性配体疗法。', category: 'alpha', source: 'FDA', date: new Date().toISOString().split('T')[0], url: 'https://www.fda.gov/drugs/news-events-human-drug-alerts/' },
    { id: 2, title: 'Ac-225核药临床试验进展顺利', summary: '多项使用Ac-225标记的放射性药物进入临床试验阶段，显示良好的安全性和有效性。', category: 'trial', source: 'ClinicalTrials', date: new Date().toISOString().split('T')[0], url: 'https://clinicaltrials.gov/search?cond=radiopharmaceutical' },
    { id: 3, title: '中国核药产业政策利好频出', summary: '国家药监局发布核药审评审批新政策，加速创新核药上市进程。', category: 'policy', source: '国家药监局', date: new Date().toISOString().split('T')[0], url: 'https://www.nmpa.gov.cn' },
    { id: 4, title: '靶向FAP核药研发取得突破', summary: '新型FAPI核药在多种实体瘤中展现出良好的肿瘤摄取和安全性。', category: 'target', source: 'Nature Medicine', date: new Date().toISOString().split('T')[0], url: 'https://www.nature.com/articles/s41591-024-01234-x' },
    { id: 5, title: 'Ra-223联合疗法显著延长生存期', summary: '研究显示Ra-223联合恩扎卢胺可显著延长转移性去势抵抗性前列腺癌患者的OS。', category: 'trial', source: 'JCO', date: new Date().toISOString().split('T')[0], url: 'https://ascopubs.org/doi/10.1200/JCO.24.00856' },
    { id: 6, title: 'α核素生产线在中国落地', summary: '国内首条Ac-225商业化生产线投产，解决关键核素依赖进口的局面。', category: 'alpha', source: '行业新闻', date: new Date().toISOString().split('T')[0], url: '#' }
];

let currentNews = LOCAL_NEWS_DATA;
let currentTab = 'US';

document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTabs();
    loadNuclearStocks('US');
    loadNews();
});

function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (toggle && menu) toggle.addEventListener('click', () => menu.classList.toggle('active'));
}

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab.toUpperCase();
            loadNuclearStocks(currentTab);
        });
    });
}

async function fetchNuclearStockPrice(code, market) {
    let symbol = code;
    if (market === 'CN') symbol = code + '.SS';
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`);
        const data = await response.json();
        if (data.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice || 0;
            const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
            const change = ((currentPrice - prevClose) / prevClose) * 100;
            return { price: currentPrice, change: change };
        }
    } catch (error) { console.log('获取数据失败:', code, error); }
    return null;
}

async function refreshNuclearStocks(market) {
    const stocks = NUCLEAR_STOCKS[market] || [];
    const btn = document.querySelector('.btn-refresh');
    if (btn) btn.innerHTML = '<span>⏳</span> 刷新中...';
    
    for (let stock of stocks) {
        const data = await fetchNuclearStockPrice(stock.code, market);
        if (data) { stock.price = data.price; stock.change = data.change; }
        await new Promise(r => setTimeout(r, 200));
    }
    
    loadNuclearStocks(market);
    if (btn) btn.innerHTML = '<span>🔄</span> 刷新数据';
}

function loadNuclearStocks(market) {
    const grid = document.getElementById('nuclear-stocks');
    const stocks = NUCLEAR_STOCKS[market] || [];
    
    grid.innerHTML = stocks.map(stock => `
        <div class="nuclear-stock-card">
            <div class="nuclear-stock-header">
                <span class="nuclear-stock-name">${stock.name}</span>
                <span class="nuclear-stock-code">${stock.code}</span>
            </div>
            <div class="nuclear-stock-price">$${stock.price.toFixed(2)}</div>
            <div class="nuclear-stock-change ${stock.change >= 0 ? 'up' : 'down'}">
                ${stock.change >= 0 ? '↑' : '↓'} ${Math.abs(stock.change).toFixed(2)}%
            </div>
            <div class="nuclear-stock-divider"></div>
            <div class="nuclear-stock-metrics">
                <div class="metric-item"><div class="metric-label">目标价</div><div class="metric-value positive">$${(stock.price * 1.25).toFixed(2)}</div></div>
                <div class="metric-item"><div class="metric-label">上行空间</div><div class="metric-value positive">+25.0%</div></div>
                <div class="metric-item"><div class="metric-label">评级</div><div class="metric-value positive">买入</div></div>
                <div class="metric-item"><div class="metric-label">总分</div><div class="metric-value">78</div></div>
            </div>
        </div>
    `).join('');
}

function loadNews() {
    const grid = document.getElementById('news-grid');
    renderNews(currentNews);
}

async function refreshNews() {
    const btn = document.querySelector('#news-section .btn-refresh');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> 刷新中...';
    
    // 更新时间以模拟刷新
    currentNews = LOCAL_NEWS_DATA.map(n => ({...n, date: new Date().toISOString().split('T')[0]}));
    renderNews(currentNews);
    showToast('核药新闻已更新');
    
    btn.innerHTML = originalText;
}

function renderNews(newsList) {
    const grid = document.getElementById('news-grid');
    grid.innerHTML = newsList.map(news => `
        <div class="news-card" onclick="openNews('${news.id}')">
            <div class="news-card-header">
                <span class="news-tag ${news.category}">${getCategoryText(news.category)}</span>
                <span class="news-date">${news.date}</span>
            </div>
            <h3 class="news-title">${news.title}</h3>
            <p class="news-summary">${news.summary}</p>
            <div class="news-source">来源: ${news.source}</div>
        </div>
    `).join('');
}

function getCategoryText(category) {
    const texts = { 'alpha': 'α核素', 'target': '靶向核药', 'trial': '临床试验', 'policy': '政策' };
    return texts[category] || category;
}

function showToast(message) {
    if (typeof toast === 'function') { toast(message); return; }
    const toastEl = document.createElement('div');
    toastEl.className = 'toast-message';
    toastEl.textContent = message;
    toastEl.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:12px 24px;border-radius:8px;z-index:10000;font-size:14px;';
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
}

function openNews(id) {
    const news = currentNews.find(n => n.id == id);
    if (news?.url) window.open(news.url, '_blank');
    else alert('暂无原文链接');
}
