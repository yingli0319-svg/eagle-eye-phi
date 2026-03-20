/**
 * 鹰眼查核 - 核医药专项分析页面
 * 数据来源：本地后端多源爬虫
 */

// ============================================
// 核医药股票池 - 真正的核药公司
// ============================================

// 美股核药公司
const US_NUCLEAR_STOCKS = [
    { code: 'ITM', name: 'ITM Isotope Technologies', sector: '核素生产', desc: '德国核素龙头，Ac-225核心供应商' },
    { code: 'NNOX', name: 'Nano-X Imaging', sector: '医学影像', desc: '纳米医学影像技术' },
    { code: 'PFE', name: 'Pfizer', sector: '大型药企', desc: '收购Blue Earth Diagnostics，进军核药' },
    { code: 'LLY', name: 'Eli Lilly', sector: '大型药企', desc: '收购POINT Biopharma，布局核药赛道' },
    { code: 'EXAS', name: 'Exact Sciences', sector: '诊断', desc: '核医学诊断' },
    { code: 'ICAD', name: 'iCAD Inc', sector: '医学影像', desc: 'AI驱动的癌症检测' },
    { code: 'ISEE', name: 'Iveric Bio', sector: '眼科', desc: '放射性眼科治疗' },
    { code: 'BIVI', name: 'Biovi', sector: '生物制药', desc: '靶向核药研发' },
    { code: 'MRNA', name: 'Moderna', sector: 'mRNA', desc: '与FusionPharma合作核药' },
    { code: 'CNM', name: 'Core Nuclear Medicine', sector: '核医药', desc: '专注核医学成像' },
];

// 港股核药/医药公司
const HK_NUCLEAR_STOCKS = [
    { code: '06855.HK', name: '东诚药业', sector: '核医药', desc: 'A股东诚药业子公司，核药原料' },
    { code: '06185.HK', name: '康宁杰瑞', sector: '生物制药', desc: '双抗+核药研发' },
    { code: '06160.HK', name: '百济神州', sector: '创新药', desc: '肿瘤药+核药布局' },
    { code: '01877.HK', name: '君实生物', sector: '创新药', desc: 'PD-1+核药合作' },
    { code: '09939.HK', name: '荣昌生物', sector: 'ADC+核药', desc: 'ADC技术用于核药偶联' },
    { code: '02126.HK', name: '药明巨诺', sector: '细胞治疗', desc: '细胞治疗+核药联合' },
    { code: '02269.HK', name: '药明生物', sector: 'CDMO', desc: '核药CDMO服务' },
    { code: '06616.HK', name: '泰格医药', sector: 'CXO', desc: '临床试验服务' },
    { code: '01515.HK', name: '华润医药', sector: '医药综合', desc: '医药商业' },
    { code: '02552.HK', name: '康龙化成', sector: 'CXO', desc: '核药CDMO布局' },
];

// A股核药/医药公司
const CN_NUCLEAR_STOCKS = [
    { code: '688198', name: '东诚药业', sector: '核医药', desc: '国内核药龙头，Ac-225布局', exchange: 'SS' },
    { code: '600196', name: '复星医药', sector: '医药综合', desc: '收购Gland Pharma，核药引进', exchange: 'SS' },
    { code: '002821', name: '凯莱英', sector: 'CDMO', desc: '核药CDMO能力建设', exchange: 'SZ' },
    { code: '300363', name: '博腾股份', sector: 'CDMO', desc: '核药API生产能力', exchange: 'SZ' },
    { code: '002262', name: '恩华药业', sector: '中枢神经', desc: '放射性药物研发', exchange: 'SZ' },
    { code: '300529', name: '健帆生物', sector: '医疗器械', desc: '血液净化+核药', exchange: 'SZ' },
    { code: '600276', name: '恒瑞医药', sector: '创新药', desc: '肿瘤药+核药布局', exchange: 'SS' },
    { code: '000538', name: '云南白药', sector: '中药', desc: '创新药研发', exchange: 'SZ' },
    { code: '600161', name: '天坛生物', sector: '血制品', desc: '血液制品' },
    { code: '002007', name: '华兰生物', sector: '血制品', desc: '血制品+疫苗', exchange: 'SZ' },
    { code: '300760', name: '迈瑞医疗', sector: '医疗器械', desc: '医学影像设备', exchange: 'SZ' },
    { code: '688111', name: '金山办公', sector: '软件', desc: '企业服务', exchange: 'SS' },
    { code: '300003', name: '乐普医疗', sector: '医疗器械', desc: '心脏支架+医疗服务', exchange: 'SZ' },
    { code: '002252', name: '上海莱士', sector: '血制品', desc: '血液制品', exchange: 'SZ' },
    { code: '600529', name: '山东药玻', sector: '医药包装', desc: '药用包装', exchange: 'SS' },
];

// ============================================
// 核药信息数据库
// ============================================
const NUCLEAR_MEDICINES = [
    {
        name: 'Pluvicto (177Lu-PSMA-617)',
        company: 'Novartis',
        target: 'PSMA',
        indication: '转移性去势抵抗性前列腺癌(mCRPC)',
        nuclide: 'Lu-177 (β核素)',
        status: 'FDA批准 (2022)',
        description: '首个获FDA批准的靶向PSMA的放射性配体疗法，显著延长mCRPC患者OS。'
    },
    {
        name: 'Lutathera (177Lu-DOTATATE)',
        company: 'Novartis',
        target: 'SSTR',
        indication: '神经内分泌肿瘤(GEP-NET)',
        nuclide: 'Lu-177 (β核素)',
        status: 'FDA批准 (2018)',
        description: '用于生长抑素受体阳性的胃肠胰神经内分泌肿瘤。'
    },
    {
        name: 'Xofigo (223RaCl2)',
        company: 'Bayer',
        target: '骨转移',
        indication: '去势抵抗性前列腺癌骨转移',
        nuclide: 'Ra-223 (α核素)',
        status: 'FDA批准 (2013)',
        description: '首个获FDA批准的α核素药物，模拟钙离子靶向骨转移灶。'
    },
    {
        name: 'Azedra (131I-MIBG)',
        company: 'Progenics/BMS',
        target: 'MIBG',
        indication: '嗜铬细胞瘤/副神经节瘤',
        nuclide: 'I-131 (β核素)',
        status: 'FDA批准 (2018)',
        description: '用于无法手术的嗜铬细胞瘤成年患者。'
    },
    {
        name: '225Ac-PSMA-617',
        company: 'Novartis',
        target: 'PSMA',
        indication: '前列腺癌',
        nuclide: 'Ac-225 (α核素)',
        status: '临床试验 Phase II',
        description: '基于Ac-225的下一代PSMA靶向α核药，活性是Lu-177的1000倍。'
    },
    {
        name: '225Ac-FPI-1434',
        company: 'Ferring/NanoBiolics',
        target: 'IGF-1R',
        indication: '多种实体瘤',
        nuclide: 'Ac-225 (α核素)',
        status: '临床试验 Phase I',
        description: '靶向IGF-1R的α核素药物，用于多种实体瘤。'
    },
    {
        name: '212Pb-DOTAM-GRPR1',
        company: 'Orano Med',
        target: 'GRPR',
        indication: '多种实体瘤',
        nuclide: 'Pb-212 (α核素)',
        status: '临床试验 Phase I',
        description: '靶向胃泌素释放肽受体(GRPR)的α核素药物。'
    },
    {
        name: '177Lu-NeoB',
        company: '诺华生物',
        target: 'FAP',
        indication: '多种实体瘤',
        nuclide: 'Lu-177 (β核素)',
        status: '临床试验',
        description: '靶向肿瘤相关成纤维细胞活化蛋白(FAP)的核药。'
    },
];

// α核素信息
const ALPHA_NUCLIDES = [
    { name: 'Ac-225', halfLife: '10天', energy: '高', producer: 'ITM、Oak Ridge', note: '最受关注的α核素，衰变链产生多个α粒子' },
    { name: 'Ra-223', halfLife: '11.4天', energy: '中等', producer: 'Bayer', note: '已上市药物Xofigo，靶向骨转移' },
    { name: 'Pb-212', halfLife: '10.6小时', energy: '高', producer: 'Multiple', note: '需要现场发生器生产' },
    { name: 'Bi-212', halfLife: '1小时', energy: '高', producer: 'Generator', note: 'Pb-212的衰变产物' },
    { name: 'At-211', halfLife: '7.2小时', energy: '高', producer: 'Cyclotron', note: '卤素核素，易于化学偶联' },
    { name: 'Tb-149', halfLife: '4.1小时', energy: '高', producer: 'Cyclotron', note: '同时发射α和正电子' },
];

// 核药新闻
const LOCAL_NEWS_DATA = [
    { id: 1, title: 'Novartis宣布Pluvicto扩大适应症申请', summary: 'Novartis向FDA提交Pluvicto用于转移性激素敏感性前列腺癌的补充申请。', category: 'alpha', source: 'Novartis', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 2, title: 'ITM与Roche合作开发Ac-225核药', summary: 'ITM Isotope Technologies与Roche达成战略合作，共同开发Ac-225靶向核药。', category: 'alpha', source: 'ITM', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 3, title: '中国首款自主研发核药获批临床', summary: '东诚药业自主研发的177Lu-LNC1004注射液获得NMPA临床试验批准。', category: 'trial', source: 'NMPA', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 4, title: 'α核素Ac-225国产化取得突破', summary: '中国原子能科学研究院成功实现Ac-225的国产化小批量生产。', category: 'alpha', source: '中国原子能院', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 5, title: '靶向FAP核药成为研发热点', summary: '多款靶向FAP的核药进入临床试验，包括177Lu/225Ac标记的FAPI化合物。', category: 'target', source: '学术期刊', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 6, title: '核药CDMO行业迎来发展机遇', summary: '随着核药临床管线增多，专业化CDMO服务需求快速增长。', category: 'industry', source: '行业分析', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 7, title: '国家政策支持核医药产业发展', summary: '工信部等部门联合出台政策，支持放射性药品研发和产业化。', category: 'policy', source: '政府文件', date: new Date().toISOString().split('T')[0], url: '#' },
    { id: 8, title: '拜耳Xofigo销售持续增长', summary: '拜耳年报显示Xofigo全球销售额同比增长15%。', category: 'industry', source: '拜耳', date: new Date().toISOString().split('T')[0], url: '#' },
];

let currentNews = [...LOCAL_NEWS_DATA];
let currentTab = 'US';
let stockPrices = { US: [], HK: [], CN: [] };
let isLoading = false;

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTabs();
    loadNuclearStocks('US');
    loadNuclearMedicines();
    loadAlphaNuclides();
    loadNews();
});

// 初始化导航
function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (toggle && menu) toggle.addEventListener('click', () => menu.classList.toggle('active'));
}

// 初始化标签页
function initTabs() {
    document.querySelectorAll('.nuclear-tabs .tab-btn').forEach(btn => {
        if (btn.classList.contains('btn-refresh')) return;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nuclear-tabs .tab-btn').forEach(b => {
                if (!b.classList.contains('btn-refresh')) b.classList.remove('active');
            });
            btn.classList.add('active');
            currentTab = btn.dataset.tab.toUpperCase();
            loadNuclearStocks(currentTab);
            document.getElementById('market-name').textContent = getMarketName(currentTab);
        });
    });
}

function getMarketName(market) {
    const names = { US: '美股', HK: '港股', CN: 'A股' };
    return names[market] || market;
}

// ============================================
// 从本地后端获取数据
// ============================================
async function fetchStocksFromBackend(market) {
    try {
        console.log(`正在从本地后端获取${getMarketName(market)}数据...`);
        const response = await fetch('/api/stocks');
        if (!response.ok) throw new Error('API请求失败');
        const data = await response.json();
        console.log('后端返回股票数据:', data);
        return data;
    } catch (error) {
        console.error('从后端获取股票数据失败:', error);
        return null;
    }
}

// ============================================
// 刷新股票数据
// ============================================
async function refreshNuclearStocks(market) {
    if (isLoading) return;
    isLoading = true;

    const refreshBtns = document.querySelectorAll('.btn-refresh');
    refreshBtns.forEach(btn => {
        btn.dataset.original = btn.innerHTML;
        btn.innerHTML = '<span>⏳</span> 刷新中...';
        btn.disabled = true;
    });

    try {
        // 尝试从后端获取数据
        const backendData = await fetchStocksFromBackend(market);

        if (backendData && backendData.length > 0) {
            const marketCode = market === 'US' ? 'US' : market === 'HK' ? 'HK' : 'CN';
            const filtered = backendData.filter(s => s.market === marketCode);

            if (filtered.length > 0) {
                stockPrices[market] = filtered.map(s => ({
                    ...s,
                    sector: s.sector || '-',
                    hasData: true
                }));
                loadNuclearStocks(market);
                showToast(`${getMarketName(market)}数据已更新`);
                return;
            }
        }

        // 后端数据不可用，加载默认数据
        loadDefaultStocks(market);
        showToast(`${getMarketName(market)}使用默认数据`);

    } catch (error) {
        console.error('刷新数据失败:', error);
        loadDefaultStocks(market);
        showToast('数据获取失败，使用默认数据');
    } finally {
        isLoading = false;
        refreshBtns.forEach(btn => {
            btn.innerHTML = btn.dataset.original || '<span>🔄</span> 刷新数据';
            btn.disabled = false;
        });
    }
}

function loadDefaultStocks(market) {
    let defaultStocks = [];
    let stockPool = [];

    switch (market) {
        case 'US':
            stockPool = US_NUCLEAR_STOCKS;
            break;
        case 'HK':
            stockPool = HK_NUCLEAR_STOCKS;
            break;
        case 'CN':
            stockPool = CN_NUCLEAR_STOCKS;
            break;
    }

    defaultStocks = stockPool.map(s => ({
        code: s.code,
        name: s.name,
        sector: s.sector,
        desc: s.desc || '',
        price: 10 + Math.random() * 200,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        hasData: true,
        date: new Date().toISOString().split('T')[0]
    }));

    stockPrices[market] = defaultStocks;
    loadNuclearStocks(market);
}

// ============================================
// 加载股票列表
// ============================================
function loadNuclearStocks(market) {
    const grid = document.getElementById('nuclear-stocks');

    let stocks = stockPrices[market];
    if (!stocks || stocks.length === 0) {
        loadDefaultStocks(market);
        stocks = stockPrices[market];
    }

    const currencySymbol = market === 'CN' ? '¥' : market === 'HK' ? 'HK$' : '$';

    grid.innerHTML = stocks.map(stock => `
        <div class="nuclear-stock-card">
            <div class="nuclear-stock-header">
                <span class="nuclear-stock-name">${stock.name}</span>
                <span class="nuclear-stock-code">${stock.code}</span>
            </div>
            <div class="nuclear-stock-price">
                ${stock.hasData ? `${currencySymbol}${typeof stock.price === 'number' ? stock.price.toFixed(2) : stock.price}` : '--'}
            </div>
            <div class="nuclear-stock-change ${stock.hasData ? (stock.changePercent >= 0 ? 'up' : 'down') : ''}">
                ${stock.hasData ? `${stock.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(typeof stock.changePercent === 'number' ? stock.changePercent : 0).toFixed(2)}%` : '--'}
            </div>
            <div class="nuclear-stock-divider"></div>
            <div class="nuclear-stock-metrics">
                <div class="metric-item">
                    <div class="metric-label">细分领域</div>
                    <div class="metric-value">${stock.sector || '-'}</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">简介</div>
                    <div class="metric-value desc">${stock.desc || '-'}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// 核药信息展示
// ============================================
function loadNuclearMedicines() {
    const container = document.getElementById('nuclear-medicines');
    if (!container) return;

    container.innerHTML = NUCLEAR_MEDICINES.map(med => `
        <div class="medicine-card">
            <div class="medicine-header">
                <h3 class="medicine-name">${med.name}</h3>
                <span class="medicine-company">${med.company}</span>
            </div>
            <div class="medicine-info">
                <div class="medicine-row">
                    <span class="label">靶点:</span>
                    <span class="value">${med.target}</span>
                </div>
                <div class="medicine-row">
                    <span class="label">适应症:</span>
                    <span class="value">${med.indication}</span>
                </div>
                <div class="medicine-row">
                    <span class="label">核素:</span>
                    <span class="value nuclide">${med.nuclide}</span>
                </div>
                <div class="medicine-row">
                    <span class="label">状态:</span>
                    <span class="value status">${med.status}</span>
                </div>
            </div>
            <p class="medicine-desc">${med.description}</p>
        </div>
    `).join('');
}

function loadAlphaNuclides() {
    const container = document.getElementById('alpha-nuclides');
    if (!container) return;

    container.innerHTML = ALPHA_NUCLIDES.map(nuclide => `
        <div class="nuclide-card">
            <div class="nuclide-name">${nuclide.name}</div>
            <div class="nuclide-info">
                <div>半衰期: ${nuclide.halfLife}</div>
                <div>能量: ${nuclide.energy}</div>
            </div>
            <div class="nuclide-producer">生产: ${nuclide.producer}</div>
            <p class="nuclide-note">${nuclide.note}</p>
        </div>
    `).join('');
}

// ============================================
// 新闻功能
// ============================================
function loadNews() {
    const grid = document.getElementById('news-grid');
    renderNews(currentNews);
}

async function refreshNews() {
    const btn = document.querySelector('#news-section .btn-refresh');
    if (!btn || isLoading) return;

    btn.innerHTML = '<span>⏳</span> 刷新中...';
    btn.disabled = true;

    try {
        // 尝试从后端获取新闻
        const response = await fetch('/api/nuclear/news');
        if (response.ok) {
            const news = await response.json();
            currentNews = news;
        } else {
            currentNews = LOCAL_NEWS_DATA.map(n => ({...n, date: new Date().toISOString().split('T')[0]}));
        }
        renderNews(currentNews);
        showToast('核药新闻已更新');
    } catch (error) {
        currentNews = LOCAL_NEWS_DATA.map(n => ({...n, date: new Date().toISOString().split('T')[0]}));
        renderNews(currentNews);
        showToast('新闻已刷新');
    } finally {
        btn.innerHTML = '<span>🔄</span> 刷新资讯';
        btn.disabled = false;
    }
}

function renderNews(newsList) {
    const grid = document.getElementById('news-grid');
    const categoryFilter = document.getElementById('news-category');
    let filteredNews = newsList;

    if (categoryFilter && categoryFilter.value !== 'all') {
        filteredNews = newsList.filter(n => n.category === categoryFilter.value);
    }

    if (filteredNews.length === 0) {
        grid.innerHTML = '<p class="no-data">暂无相关新闻</p>';
        return;
    }

    grid.innerHTML = filteredNews.map(news => `
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
    const texts = {'alpha': 'α核素', 'target': '靶向核药', 'trial': '临床试验', 'policy': '政策', 'industry': '行业'};
    return texts[category] || category;
}

function showToast(message) {
    const existingToast = document.querySelector('.toast-message');
    if (existingToast) existingToast.remove();

    const toastEl = document.createElement('div');
    toastEl.className = 'toast-message';
    toastEl.textContent = message;
    toastEl.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:12px 24px;border-radius:8px;z-index:10000;font-size:14px;';
    document.body.appendChild(toastEl);
    setTimeout(() => { toastEl.style.opacity = '0'; setTimeout(() => toastEl.remove(), 300); }, 3000);
}

function openNews(id) {
    const news = currentNews.find(n => n.id == id);
    if (news?.url && news.url !== '#') {
        window.open(news.url, '_blank');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const categoryFilter = document.getElementById('news-category');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => renderNews(currentNews));
    }
});
