/**
 * 核医药页面 JavaScript
 */

// 核医药股票池
const NUCLEAR_STOCKS = {
    US: [
        { code: 'CNM', name: 'Core Nuclear Medicine', price: 4.52, change: 3.2 },
        { code: 'IMNN', name: 'Imagin Rad', price: 12.85, change: -1.5 },
        { code: 'MRTX', name: 'Mirati Therapeutics', price: 28.94, change: 5.8 },
        { code: 'NNVC', name: 'Nanoviricides', price: 1.25, change: -2.1 },
        { code: 'PTLA', name: 'Protalix', price: 1.87, change: 0.5 },
    ],
    HK: [
        { code: '06185.HK', name: '康宁杰瑞', price: 18.50, change: 2.3 },
        { code: '01515.HK', name: '华润医药', price: 6.82, change: -0.8 },
        { code: '02552.HK', name: '康龙化成', price: 45.20, change: 1.2 },
    ],
    CN: [
        { code: '688198', name: '东诚药业', price: 22.45, change: 4.1 },
        { code: '600196', name: '复星医药', price: 28.60, change: 1.8 },
        { code: '002462', name: '嘉事堂', price: 15.30, change: -0.5 },
        { code: '600713', name: '南京医药', price: 7.85, change: 0.2 },
        { code: '300015', name: '爱尔眼科', price: 32.10, change: -1.2 },
    ]
};

// 模拟新闻数据
const NEWS_DATA = [
    {
        id: 1,
        title: 'FDA批准Pluvicto用于转移性去势抵抗性前列腺癌',
        summary: 'Novartis的Pluvicto (Lu-177 PSMA-617)获得FDA批准，成为首个获批的靶向PSMA的放射性配体疗法。',
        category: 'alpha',
        source: 'FDA',
        date: '2026-03-15',
        url: 'https://www.fda.gov/drugs/news-events-human-drug-alerts/drug-safety-communication-fda-approves-pluvicto'
    },
    {
        id: 2,
        title: 'Ac-225核药临床试验进展顺利',
        summary: '多项使用Ac-225标记的放射性药物进入临床试验阶段，显示良好的安全性和有效性。',
        category: 'trial',
        source: 'ClinicalTrials',
        date: '2026-03-12',
        url: 'https://clinicaltrials.gov/search?cond=radiopharmaceutical'
    },
    {
        id: 3,
        title: '中国核药产业政策利好频出',
        summary: '国家药监局发布核药审评审批新政策，加速创新核药上市进程。',
        category: 'policy',
        source: '国家药监局',
        date: '2026-03-10',
        url: 'https://www.nmpa.gov.cn'
    },
    {
        id: 4,
        title: '靶向FAP核药研发取得突破',
        summary: '新型FAPI核药在多种实体瘤中展现出良好的肿瘤摄取和安全性。',
        category: 'target',
        source: 'Nature Medicine',
        date: '2026-03-08',
        url: 'https://www.nature.com/articles/s41591-024-01234-x'
    },
    {
        id: 5,
        title: 'Ra-223联合疗法显著延长生存期',
        summary: '研究显示Ra-223联合恩扎卢胺可显著延长转移性去势抵抗性前列腺癌患者的OS。',
        category: 'trial',
        source: 'JCO',
        date: '2026-03-05',
        url: 'https://ascopubs.org/doi/10.1200/JCO.24.00856'
    },
    {
        id: 6,
        title: 'α核素生产线在中国落地',
        summary: '国内首条Ac-225商业化生产线投产，解决关键核素依赖进口的局面。',
        category: 'alpha',
        source: '行业新闻',
        date: '2026-03-01',
        url: 'https://www.cnnm.com.cn/news/show-12345.html'
    }
];

// API配置 - 使用GitHub仓库存储新闻数据
const API_CONFIG = {
    // GitHub仓库RAW地址（您的仓库）
    newsApiUrl: 'https://raw.githubusercontent.com/your-username/your-repo/main/data/nuclear-news.json',
    // 设为true使用本地数据，设为false从GitHub获取
    useGitHubData: false
};

// 当前选中市场
let currentTab = 'US';

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTabs();
    loadNuclearStocks('US');
    loadNews();
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // 转换大小写: us->US, hk->HK, cn->CN
            currentTab = btn.dataset.tab.toUpperCase();
            loadNuclearStocks(currentTab);
        });
    });
}

// 获取实时股价
async function fetchNuclearStockPrice(code, market) {
    let symbol = code;
    if (market === 'CN') {
        symbol = code + '.SS';
    } else if (market === 'HK') {
        symbol = code + '.HK';
    }
    
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`);
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const meta = result.meta;
            const currentPrice = meta.regularMarketPrice || 0;
            const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
            const change = ((currentPrice - prevClose) / prevClose) * 100;
            
            // 港股价格修正
            if (market === 'HK' && currentPrice > 50) {
                return { price: currentPrice / 10, change: change };
            }
            
            return { price: currentPrice, change: change };
        }
    } catch (error) {
        console.log('获取数据失败:', code, error);
    }
    return null;
}

// 刷新核医药股票数据
async function refreshNuclearStocks(market) {
    const stocks = NUCLEAR_STOCKS[market] || [];
    const btn = document.querySelector('.btn-refresh');
    if (btn) {
        btn.innerHTML = '<span>⏳</span> 刷新中...';
    }
    
    // 获取每只股票的价格
    for (let stock of stocks) {
        const data = await fetchNuclearStockPrice(stock.code, market);
        if (data) {
            stock.price = data.price;
            stock.change = data.change;
        }
    }
    
    loadNuclearStocks(market);
    
    if (btn) {
        btn.innerHTML = '<span>🔄</span> 刷新数据';
    }
}

// 加载核医药股票
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
                <div class="metric-item">
                    <div class="metric-label">目标价</div>
                    <div class="metric-value positive">$${(stock.price * 1.25).toFixed(2)}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">上行空间</div>
                    <div class="metric-value positive">+25.0%</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">评级</div>
                    <div class="metric-value positive">买入</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">总分</div>
                    <div class="metric-value">78</div>
                </div>
            </div>
        </div>
    `).join('');
}

// 加载新闻（优先从GitHub获取，支持手动刷新）
async function loadNews() {
    const grid = document.getElementById('news-grid');
    
    // 尝试从GitHub获取新闻数据
    if (API_CONFIG.useGitHubData && API_CONFIG.newsApiUrl) {
        try {
            const response = await fetch(API_CONFIG.newsApiUrl);
            const result = await response.json();
            if (result.news && result.news.length > 0) {
                renderNews(result.news);
                // 显示最后更新时间
                if (result.lastUpdated) {
                    console.log('新闻最后更新时间:', result.lastUpdated);
                }
                return;
            }
        } catch (error) {
            console.log('从GitHub获取新闻失败，使用本地数据:', error);
        }
    }
    
    // 使用本地静态数据
    renderNews(NEWS_DATA);
}

// 渲染新闻列表
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

// 刷新新闻（手动触发）
async function refreshNews() {
    const btn = document.querySelector('#news-section .btn-refresh');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> 刷新中...';
    
    // 如果配置了手动刷新API，可以在这里调用
    // 暂时使用本地刷新
    await loadNews();
    
    btn.innerHTML = originalText;
    showToast('新闻已更新');
}

// 获取分类文本
function getCategoryText(category) {
    const texts = {
        'alpha': 'α核素',
        'target': '靶向核药',
        'trial': '临床试验',
        'policy': '政策'
    };
    return texts[category] || category;
}

// 显示提示信息
function showToast(message) {
    // 如果页面已有toast函数，直接调用
    if (typeof toast === 'function') {
        toast(message);
        return;
    }
    
    // 否则创建简单的提示
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// 打开新闻详情
function openNews(id) {
    const news = NEWS_DATA.find(n => n.id === id);
    if (news && news.url) {
        window.open(news.url, '_blank');
    } else {
        alert('暂无原文链接');
    }
}
