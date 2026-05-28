// =====================================================
// 0. GitHub Pages / Offline Static Sandbox Mode 智慧相容層
// =====================================================
const MOCK_DB_KEY = "card_manager_mock_transactions";
const MOCK_KEYWORDS_KEY = "card_manager_mock_keywords";
const MOCK_PASSWORDS_KEY = "card_manager_mock_passwords";
const MOCK_BUDGETS_KEY = "card_manager_mock_budgets";

// 自動偵測是否在 GitHub Pages、獨立 Demo、或無後端伺服器環境下運行
const isStaticDemo = window.location.hostname.endsWith('github.io') || 
                     window.location.hostname.includes('ting-glitch') || 
                     window.location.protocol === 'file:' || 
                     localStorage.getItem('force_mock_backend') === 'true';

if (isStaticDemo) {
    initMockDatabase();
    
    // 注入沙盒提示橫幅之 Vanilla CSS 樣式
    const style = document.createElement("style");
    style.innerHTML = `
        .sandbox-mode-banner {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            border-left: 4px solid #0284c7;
            color: #0369a1;
            padding: 0.75rem 1.25rem;
            margin-bottom: 1.25rem;
            border-radius: var(--border-radius);
            font-size: 0.76rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.6rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            animation: slideDown 0.4s ease-out;
            line-height: 1.5;
        }
        .dark-mode .sandbox-mode-banner {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-left: 4px solid #38bdf8;
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.1);
        }
    `;
    document.head.appendChild(style);

    // 動態向 DOM 注入 Sandbox 狀態標籤與溫和提示橫幅
    document.addEventListener("DOMContentLoaded", () => {
        const headerLogo = document.querySelector(".header-logo");
        if (headerLogo) {
            const badge = document.createElement("span");
            badge.style.cssText = "margin-left: 0.8rem; padding: 0.2rem 0.5rem; font-size: 0.68rem; font-weight: 600; color: #0369a1; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.25rem; vertical-align: middle; line-height: 1;";
            badge.className = "he-year-tab active";
            badge.innerHTML = `<i data-lucide="sparkles" style="width:12px; height:12px; display:inline-block; vertical-align:middle;"></i> Demo`;
            headerLogo.appendChild(badge);
            lucide.createIcons();
        }
        
        const mainContent = document.querySelector(".main-content");
        const dashboardKpi = document.querySelector(".dashboard-kpi");
        if (mainContent && dashboardKpi) {
            const banner = document.createElement("div");
            banner.className = "sandbox-mode-banner";
            banner.innerHTML = `
                <i data-lucide="sparkles" style="width:16px; height:16px; flex-shrink: 0; color: #0284c7;"></i>
                <div>
                    <strong>✨ 展示模式已啟動：</strong> 
                    系統目前免後端伺服器運行。您已可以體驗完整的信用卡帳單匯入、AI 消費分類審核核准、圖表多維度聯動 Slicer 篩選、關鍵字自動學習、預算配置設定、以及 AI 智匯消費診斷報告。所有操作皆安全存儲於您瀏覽器的本地資料庫 (localStorage)！
                </div>
            `;
            mainContent.insertBefore(banner, dashboardKpi);
            lucide.createIcons();
        }
    });

    // 攔截並複寫全域 window.fetch，完美模擬 FastAPI 後端的所有 Restful API
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        if (typeof resource === 'string' && resource.startsWith('/api')) {
            return handleMockRequest(resource, init);
        }
        return originalFetch(resource, init);
    };
}

// 初始化本地沙盒資料庫的預設值 (提供 2026 年初起至五月的多張信用卡與交易資料)
function initMockDatabase() {
    if (!localStorage.getItem(MOCK_DB_KEY)) {
        const defaultTxs = [];
        
        // 2026-01
        defaultTxs.push(
            { bill_month: "2026-01", bank_name: "A銀行", card_date: "2026-01-02", post_date: "2026-01-03", detail: "Uber Eats 台北", amount: 280, location: "台北", category: "餐飲" },
            { bill_month: "2026-01", bank_name: "A銀行", card_date: "2026-01-05", post_date: "2026-01-06", detail: "台灣中油忠孝站", amount: 800, location: "台北", category: "交通運輸" },
            { bill_month: "2026-01", bank_name: "B銀行", card_date: "2026-01-10", post_date: "2026-01-11", detail: "蝦皮購物", amount: 1200, location: "台北", category: "購物" },
            { bill_month: "2026-01", bank_name: "C銀行", card_date: "2026-01-15", post_date: "2026-01-16", detail: "Netflix 訂閱", amount: 390, location: "海外", category: "休閒旅遊" },
            { bill_month: "2026-01", bank_name: "A銀行", card_date: "2026-01-20", post_date: "2026-01-21", detail: "鼎泰豐信義店", amount: 1850, location: "台北", category: "餐飲" },
            { bill_month: "2026-01", bank_name: "B銀行", card_date: "2026-01-25", post_date: "2026-01-26", detail: "屈臣氏藥妝", amount: 650, location: "台北", category: "醫療/健康" }
        );
        
        // 2026-02
        defaultTxs.push(
            { bill_month: "2026-02", bank_name: "A銀行", card_date: "2026-02-02", post_date: "2026-02-03", detail: "Uber Eats 台北", amount: 350, location: "台北", category: "餐飲" },
            { bill_month: "2026-02", bank_name: "B銀行", card_date: "2026-02-08", post_date: "2026-02-09", detail: "全聯福利中心", amount: 1450, location: "台北", category: "餐飲" },
            { bill_month: "2026-02", bank_name: "C銀行", card_date: "2026-02-12", post_date: "2026-02-13", detail: "Agoda 訂房", amount: 4800, location: "海外", category: "休閒旅遊" },
            { bill_month: "2026-02", bank_name: "A銀行", card_date: "2026-02-15", post_date: "2026-02-16", detail: "台灣高鐵", amount: 1490, location: "台北", category: "交通運輸" },
            { bill_month: "2026-02", bank_name: "B銀行", card_date: "2026-02-22", post_date: "2026-02-23", detail: "誠品書店", amount: 560, location: "台北", category: "辦公用品" }
        );
        
        // 2026-03
        defaultTxs.push(
            { bill_month: "2026-03", bank_name: "A銀行", card_date: "2026-03-02", post_date: "2026-03-03", detail: "Uber Eats 台北", amount: 420, location: "台北", category: "餐飲" },
            { bill_month: "2026-03", bank_name: "C銀行", card_date: "2026-03-06", post_date: "2026-03-07", detail: "星巴克台北店", amount: 180, location: "台北", category: "餐飲" },
            { bill_month: "2026-03", bank_name: "B銀行", card_date: "2026-03-12", post_date: "2026-03-13", detail: "SOGO百貨", amount: 6200, location: "台北", category: "購物" },
            { bill_month: "2026-03", bank_name: "A銀行", card_date: "2026-03-18", post_date: "2026-03-19", detail: "台大醫院掛號費", amount: 520, location: "台北", category: "醫療/健康" },
            { bill_month: "2026-03", bank_name: "C銀行", card_date: "2026-03-24", post_date: "2026-03-25", detail: "Apple Online Store", amount: 12900, location: "台北", category: "購物" }
        );
        
        // 2026-04
        defaultTxs.push(
            { bill_month: "2026-04", bank_name: "A銀行", card_date: "2026-04-03", post_date: "2026-04-04", detail: "Uber Eats 台北", amount: 310, location: "台北", category: "餐飲" },
            { bill_month: "2026-04", bank_name: "B銀行", card_date: "2026-04-08", post_date: "2026-04-09", detail: "家樂福量販", amount: 2280, location: "台北", category: "餐飲" },
            { bill_month: "2026-04", bank_name: "C銀行", card_date: "2026-04-15", post_date: "2026-04-16", detail: "台灣中油", amount: 950, location: "台北", category: "交通運輸" },
            { bill_month: "2026-04", bank_name: "A銀行", card_date: "2026-04-20", post_date: "2026-04-21", detail: "威秀影城", amount: 720, location: "台北", category: "休閒旅遊" },
            { bill_month: "2026-04", bank_name: "B銀行", card_date: "2026-04-25", post_date: "2026-04-26", detail: "無印良品", amount: 1250, location: "台北", category: "辦公用品" }
        );
        
        // 2026-05
        defaultTxs.push(
            { bill_month: "2026-05", bank_name: "A銀行", card_date: "2026-05-02", post_date: "2026-05-03", detail: "Uber Eats 台北", amount: 380, location: "台北", category: "餐飲" },
            { bill_month: "2026-05", bank_name: "A銀行", card_date: "2026-05-02", post_date: "2026-05-03", detail: "Uber Eats 台北", amount: 380, location: "台北", category: "餐飲" },
            { bill_month: "2026-05", bank_name: "B銀行", card_date: "2026-05-08", post_date: "2026-05-09", detail: "微風廣場購物", amount: 18500, location: "台北", category: "購物" },
            { bill_month: "2026-05", bank_name: "C銀行", card_date: "2026-05-12", post_date: "2026-05-13", detail: "Netflix 訂閱", amount: 390, location: "海外", category: "休閒旅遊" },
            { bill_month: "2026-05", bank_name: "A銀行", card_date: "2026-05-18", post_date: "2026-05-19", detail: "高鐵來回票", amount: 2980, location: "台北", category: "交通運輸" },
            { bill_month: "2026-05", bank_name: "B銀行", card_date: "2026-05-24", post_date: "2026-05-25", detail: "屈臣氏保養品", amount: 1850, location: "台北", category: "醫療/健康" }
        );
        
        localStorage.setItem(MOCK_DB_KEY, JSON.stringify(defaultTxs));
    }
    
    if (!localStorage.getItem(MOCK_KEYWORDS_KEY)) {
        const defaultKeywords = [
            { keyword: "Uber", category: "餐飲" },
            { keyword: "蝦皮", category: "購物" },
            { keyword: "中油", category: "交通運輸" },
            { keyword: "Netflix", category: "休閒旅遊" },
            { keyword: "星巴克", category: "餐飲" },
            { keyword: "高鐵", category: "交通運輸" },
            { keyword: "全聯", category: "餐飲" },
            { keyword: "家樂福", category: "餐飲" }
        ];
        localStorage.setItem(MOCK_KEYWORDS_KEY, JSON.stringify(defaultKeywords));
    }
    
    if (!localStorage.getItem(MOCK_BUDGETS_KEY)) {
        const defaultBudgets = {
            "DEFAULT": [
                { category: "購物", amount: 15000 },
                { category: "餐飲", amount: 12000 },
                { category: "休閒旅遊", amount: 8000 },
                { category: "交通運輸", amount: 5000 },
                { category: "辦公用品", amount: 3000 },
                { category: "醫療/健康", amount: 4000 },
                { category: "其他", amount: 5000 }
            ]
        };
        localStorage.setItem(MOCK_BUDGETS_KEY, JSON.stringify(defaultBudgets));
    }
    
    if (!localStorage.getItem(MOCK_PASSWORDS_KEY)) {
        localStorage.setItem(MOCK_PASSWORDS_KEY, JSON.stringify([]));
    }
}

// 模擬後端業務邏輯路由轉接處理器
async function handleMockRequest(url, init) {
    const parsedUrl = new URL(url, window.location.origin);
    const pathname = parsedUrl.pathname;
    
    // 增加微小隨機延迟以創造高級的「非同步加載感」
    await new Promise(r => setTimeout(r, 200 + Math.random() * 250));
    
    const getTxs = () => JSON.parse(localStorage.getItem(MOCK_DB_KEY) || "[]");
    const saveTxs = (txs) => localStorage.setItem(MOCK_DB_KEY, JSON.stringify(txs));
    
    const getKeywords = () => JSON.parse(localStorage.getItem(MOCK_KEYWORDS_KEY) || "[]");
    const saveKeywords = (kws) => localStorage.setItem(MOCK_KEYWORDS_KEY, JSON.stringify(kws));
    
    const getBudgets = () => JSON.parse(localStorage.getItem(MOCK_BUDGETS_KEY) || "{}");
    const saveBudgets = (bdgs) => localStorage.setItem(MOCK_BUDGETS_KEY, JSON.stringify(bdgs));
    
    const getPasswords = () => JSON.parse(localStorage.getItem(MOCK_PASSWORDS_KEY) || "[]");
    const savePasswords = (pwds) => localStorage.setItem(MOCK_PASSWORDS_KEY, JSON.stringify(pwds));

    // 1. GET /api/summary
    if (pathname === '/api/summary' && (!init || init.method === 'GET')) {
        const txs = getTxs();
        txs.sort((a, b) => b.bill_month.localeCompare(a.bill_month) || b.card_date.localeCompare(a.card_date));
        return new Response(JSON.stringify(txs), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 2. GET /api/keywords
    if (pathname === '/api/keywords' && (!init || init.method === 'GET')) {
        return new Response(JSON.stringify(getKeywords()), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 3. POST /api/keywords
    if (pathname === '/api/keywords' && init && init.method === 'POST') {
        const body = JSON.parse(init.body);
        const kws = getKeywords();
        const existingIndex = kws.findIndex(k => k.keyword === body.keyword);
        if (existingIndex >= 0) {
            kws[existingIndex].category = body.category;
        } else {
            kws.push({ keyword: body.keyword, category: body.category });
        }
        saveKeywords(kws);
        return new Response(JSON.stringify({ status: "success", message: `已將關鍵字「${body.keyword}」之消費分類規則登錄於對照表中！` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 4. DELETE /api/keywords/{keyword}
    if (pathname.startsWith('/api/keywords/') && init && init.method === 'DELETE') {
        const kw = decodeURIComponent(pathname.substring('/api/keywords/'.length));
        const kws = getKeywords().filter(k => k.keyword !== kw);
        saveKeywords(kws);
        return new Response(JSON.stringify({ status: "success", message: "對照規則已安全移除" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 5. POST /api/keywords/batch
    if (pathname === '/api/keywords/batch' && init && init.method === 'POST') {
        const kws = getKeywords();
        const newKws = [
            { keyword: "鼎泰豐", category: "餐飲" },
            { keyword: "Uniqlo", category: "購物" },
            { keyword: "高鐵", category: "交通運輸" },
            { keyword: "威秀", category: "休閒旅遊" },
            { keyword: "屈臣氏", category: "醫療/健康" }
        ];
        newKws.forEach(item => {
            if (!kws.some(k => k.keyword === item.keyword)) {
                kws.push(item);
            }
        });
        saveKeywords(kws);
        return new Response(JSON.stringify({ status: "success", message: "已成功批次模擬匯入 5 筆對照規則！", imported_count: 5 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 6. GET /api/pdf-passwords
    if (pathname === '/api/pdf-passwords' && (!init || init.method === 'GET')) {
        return new Response(JSON.stringify(getPasswords()), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 7. POST /api/pdf-passwords
    if (pathname === '/api/pdf-passwords' && init && init.method === 'POST') {
        const body = JSON.parse(init.body);
        const pwds = getPasswords().filter(p => p.bank_name !== body.bank_name);
        pwds.push({ bank_name: body.bank_name, password: body.password, updated_at: new Date().toISOString() });
        savePasswords(pwds);
        return new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 8. DELETE /api/pdf-passwords/{bank_name}
    if (pathname.startsWith('/api/pdf-passwords/') && init && init.method === 'DELETE') {
        const bank = decodeURIComponent(pathname.substring('/api/pdf-passwords/'.length));
        const pwds = getPasswords().filter(p => p.bank_name !== bank);
        savePasswords(pwds);
        return new Response(JSON.stringify({ status: "success" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 9. GET /api/budgets
    if (pathname === '/api/budgets' && (!init || init.method === 'GET')) {
        const billMonth = parsedUrl.searchParams.get("bill_month") || "DEFAULT";
        const bdgs = getBudgets();
        const defaults = bdgs["DEFAULT"] || [];
        const monthBudgets = bdgs[billMonth] || [];
        
        const map = {};
        defaults.forEach(b => map[b.category] = b.amount);
        monthBudgets.forEach(b => map[b.category] = b.amount);
        
        const result = Object.keys(map).map(cat => ({ category: cat, amount: map[cat] }));
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // 10. POST /api/budgets/batch
    if (pathname === '/api/budgets/batch' && init && init.method === 'POST') {
        const body = JSON.parse(init.body);
        const billMonth = body.bill_month || "DEFAULT";
        const bdgs = getBudgets();
        bdgs[billMonth] = body.budgets;
        saveBudgets(bdgs);
        return new Response(JSON.stringify({ status: "success", message: `已成功更新 ${billMonth} 的本地預算配置` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 11. DELETE /api/transactions/month/{year_month}
    if (pathname.startsWith('/api/transactions/month/') && init && init.method === 'DELETE') {
        const month = decodeURIComponent(pathname.substring('/api/transactions/month/'.length));
        const txs = getTxs().filter(t => t.bill_month !== month);
        saveTxs(txs);
        return new Response(JSON.stringify({ status: "success", message: `已成功刪除 ${month} 月份的本地刷卡明細資料` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 12. POST /api/save-transactions
    if (pathname === '/api/save-transactions' && init && init.method === 'POST') {
        const body = JSON.parse(init.body);
        const currentTxs = getTxs();
        
        body.items.forEach(item => {
            currentTxs.push({
                bill_month: item.bill_month,
                bank_name: item.bank_name,
                card_date: item.card_date,
                post_date: item.post_date,
                detail: item.detail,
                amount: item.amount,
                location: item.location || "台灣",
                category: item.category
            });
        });
        
        saveTxs(currentTxs);
        return new Response(JSON.stringify({ status: "success", message: `🎉 匯入成功！已將 ${body.items.length} 筆消費明細安全併入您的本地資料庫中。` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 13. POST /api/analyze-bill
    if (pathname === '/api/analyze-bill' && init && init.method === 'POST') {
        let filename = "A銀行_202606_帳單.pdf";
        if (init.body instanceof FormData) {
            const file = init.body.get("file");
            if (file && file.name) filename = file.name;
        }
        
        let bank_name = "A銀行";
        let bill_month = "2026-06";
        
        if (filename.includes("B銀行")) bank_name = "B銀行";
        if (filename.includes("C銀行")) bank_name = "C銀行";
        
        const monthMatch = filename.match(/(\d{4})[-_]?(\d{2})/);
        if (monthMatch) {
            bill_month = `${monthMatch[1]}-${monthMatch[2]}`;
        }
        
        // 模擬加密解密要求
        if (filename.toLowerCase().includes("encrypt") && !init.body.get("password")) {
            return new Response(JSON.stringify({ status: "need_password", message: "PDF 已加密" }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        
        // 利用本地關鍵字對照表來渲染精準的對照或 AI 審核分類
        const kwRules = getKeywords();
        const rawItems = [
            { card_date: `${bill_month}-02`, post_date: `${bill_month}-03`, detail: "Uber Eats 台北", amount: 320, location: "台北" },
            { card_date: `${bill_month}-05`, post_date: `${bill_month}-06`, detail: "蝦皮購物-Shopee", amount: 1450, location: "台北" },
            { card_date: `${bill_month}-08`, post_date: `${bill_month}-09`, detail: "台灣中油-忠孝站", amount: 950, location: "台北" },
            { card_date: `${bill_month}-12`, post_date: `${bill_month}-13`, detail: "Netflix Subscription", amount: 390, location: "海外" },
            { card_date: `${bill_month}-15`, post_date: `${bill_month}-16`, detail: "星巴克台北店", amount: 165, location: "台北" },
            { card_date: `${bill_month}-20`, post_date: `${bill_month}-21`, detail: "大葉高島屋百貨", amount: 4200, location: "台北" },
            { card_date: `${bill_month}-25`, post_date: `${bill_month}-26`, detail: "威秀影城-台北信義", amount: 760, location: "台北" }
        ];
        
        const items = rawItems.map(item => {
            let matchedCat = "其他";
            let status = "other";
            for (const r of kwRules) {
                if (item.detail.includes(r.keyword)) {
                    matchedCat = r.category;
                    status = "keyword_matched";
                    break;
                }
            }
            
            // 部分項目模擬 AI 判斷特徵
            if (status === "other") {
                if (item.detail.includes("蝦皮") || item.detail.includes("百貨") || item.detail.includes("高島屋")) {
                    matchedCat = "購物";
                    status = "ai_inferred";
                } else if (item.detail.includes("Netflix") || item.detail.includes("影城") || item.detail.includes("威秀")) {
                    matchedCat = "休閒旅遊";
                    status = "ai_inferred";
                }
            }
            
            return { ...item, category: matchedCat, classify_status: status };
        });
        
        const responseData = {
            status: "success",
            bank_name: bank_name,
            bill_month: bill_month,
            is_mock: true,
            message_notice: `🌿 已為您成功解析並載入 ${bill_month} 的 ${bank_name} 刷卡對帳明細！`,
            items: items
        };
        
        return new Response(JSON.stringify(responseData), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 14. POST /api/ai-advisor/chat
    if (pathname === '/api/ai-advisor/chat' && init && init.method === 'POST') {
        const body = JSON.parse(init.body);
        const items = body.items || [];
        const budgets = body.budgets || [];
        
        const catSpent = {};
        let totalSpent = 0;
        const banks = new Set();
        const largeTxs = [];
        let uberCount = 0;
        let uberAmount = 0;
        let groceryCount = 0;
        let groceryAmount = 0;
        
        items.forEach(t => {
            const cat = t.category || "其他";
            catSpent[cat] = (catSpent[cat] || 0) + t.amount;
            totalSpent += t.amount;
            if (t.bank_name) banks.add(t.bank_name);
            if (t.amount >= 3000) largeTxs.push(t);
            
            const detailUpper = (t.detail || "").toUpperCase();
            if (["UBER", "FOODPANDA", "外送", "EATS", "CAMA", "STARBUCKS", "星巴克"].some(x => detailUpper.includes(x))) {
                uberCount++;
                uberAmount += t.amount;
            }
            if (["全聯", "家樂福", "好市多", "COSTCO", "RT-MART", "大潤發", "愛買"].some(x => detailUpper.includes(x))) {
                groceryCount++;
                groceryAmount += t.amount;
            }
        });
        
        const budgetMap = {};
        budgets.forEach(b => budgetMap[b.category] = b.amount);
        const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
        
        const overBudget = [];
        const analysisLines = [];
        let totalOverspent = 0;
        
        const categoriesList = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"];
        categoriesList.forEach(cat => {
            const spent = catSpent[cat] || 0;
            const limit = budgetMap[cat] || 0;
            let statusStr = "未設定預算";
            if (limit > 0) {
                if (spent > limit) {
                    const diff = spent - limit;
                    statusStr = `⚠️ 超支 NT$ ${diff.toLocaleString()}`;
                    overBudget.push({ category: cat, spent, limit, diff });
                    totalOverspent += diff;
                } else if (spent < limit * 0.5) {
                    statusStr = "🟢 盈餘偏高 (使用率 < 50%)";
                } else {
                    statusStr = "✅ 預算正常";
                }
            }
            analysisLines.push(`- **${cat}**：實際 **NT$ ${spent.toLocaleString()}** / 預算 **NT$ ${limit.toLocaleString()}** (${statusStr})`);
        });
        
        let brief_summary = "";
        let brief_status = "";
        
        if (overBudget.length > 0) {
            const overCatsStr = overBudget.map(o => o.category).join("、");
            brief_summary = `🚨 財務警報：整體預算使用率達 ${(totalBudget > 0 ? (totalSpent / totalBudget * 100) : 100).toFixed(1)}%，其中「${overCatsStr}」項目已累計超支 NT$ ${totalOverspent.toLocaleString()}！`;
            brief_status = "alert";
        } else if (largeTxs.length > 0) {
            brief_summary = `⚠️ 消費提醒：本月支出均在預算內，但偵測到 ${largeTxs.length} 筆單筆大於 NT$ 3,000 的高額消費，建議適度檢視其必要性。`;
            brief_status = "warning";
        } else {
            const usage = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : 0;
            brief_summary = `🟢 財務優異：本期預算管理完美！各項分類支出均在規劃內，整體預算使用率僅 ${usage}%，理財紀律十分卓越。`;
            brief_status = "success";
        }
        
        const reportLines = [];
        reportLines.push("### 🧠 AI 智慧財務與消費結構分析報告 (本地智慧核心)");
        reportLines.push(`> **當前診斷結論**：${brief_summary}`);
        reportLines.push("---");
        reportLines.push("### 📊 消費與預算執行概況");
        reportLines.push(`* **交易總額度**：本期消費共計 **${items.length}** 筆交易，累計刷卡金額為 **NT$ ${totalSpent.toLocaleString()}**。`);
        if (totalBudget > 0) {
            reportLines.push(`* **預算覆蓋率**：已規劃預算總額 **NT$ ${totalBudget.toLocaleString()}**，整體預算使用率達 **${(totalSpent / totalBudget * 100).toFixed(1)}%**。`);
        }
        reportLines.push("\n#### 🔍 各分類預算使用明細：");
        reportLines.push(...analysisLines);
        reportLines.push("---");
        
        reportLines.push("### 🚨 消費預警與結構審查");
        if (overBudget.length > 0) {
            reportLines.push("#### 🔴 預算超支項目警告：");
            overBudget.forEach(o => {
                const pct = ((o.spent / o.limit) * 100 - 100).toFixed(1);
                reportLines.push(`* **「${o.category}」超額支用**：實際支出已達 **NT$ ${o.spent.toLocaleString()}**，超出原定預算限額 **NT$ ${o.limit.toLocaleString()}**（超額達 **${pct}%**）。建議立即啟動支出管制。`);
            });
        } else {
            reportLines.push("* **🟢 預算管控極佳**：本期無任何消費分類超出預算紅線，表現優異！");
        }
        
        if (largeTxs.length > 0) {
            reportLines.push(`\n#### 🔍 偵測到 ${largeTxs.length} 筆大額交易（單筆 NT$ 3,000 以上）：`);
            largeTxs.forEach(tx => {
                reportLines.push(`  * **${tx.card_date}** | **${tx.bank_name}** | **${tx.detail}** | **NT$ ${tx.amount.toLocaleString()}**（分類：${tx.category}）`);
            });
            reportLines.push("> 💡 *建議：請針對上述大額交易進行必要性回溯，確認是否為衝動消費，或考慮使用信用卡分期以緩和單月現金流壓力。*");
        } else {
            reportLines.push("* **🟢 交易平穩度高**：本期無任何高於 NT$ 3,000 的大額非預期交易。");
        }
        reportLines.push("---");
        
        reportLines.push("### 💡 專屬智慧省錢與資產優化建議");
        let adviceIdx = 1;
        
        if (uberAmount > 0) {
            const uberSaving = Math.floor(uberAmount * 0.15);
            reportLines.push(`#### ${adviceIdx}. 🛵 外送平台與便利生活調控：`);
            reportLines.push(`* 本期外送及生活便利類消費共 **${uberCount}** 筆，累計金額達 **NT$ ${uberAmount.toLocaleString()}**。`);
            reportLines.push(`* **優化建議**：外送平台溢價與服務費通常高達 15%~20%。建議下月限定外送次數，或考慮親自取餐。若能減少 30% 外送，每月可直接節省約 **NT$ ${uberSaving.toLocaleString()}** 的非必要開銷！`);
            adviceIdx++;
        }
        
        if (groceryAmount > 0) {
            reportLines.push(`#### ${adviceIdx}. 🛒 量販超市採購回饋最大化：`);
            reportLines.push(`* 本期在全聯、好市多等超市量販累計消費 **${groceryCount}** 筆，金額達 **NT$ ${groceryAmount.toLocaleString()}**。`);
            reportLines.push(`* **優化建議**：日常用品採買屬於剛性需求，建議固定在週末列出採購清單進行批次購買以防衝動消費，並搭配對應的超市聯名卡或行動支付賺取 5% 以上的高額點數回饋。`);
            adviceIdx++;
        }
        
        if (banks.size > 1) {
            const banksArr = Array.from(banks);
            reportLines.push(`#### ${adviceIdx}. 💳 跨行多卡繳費管理優化：`);
            reportLines.push(`* 本期消費涉及 **${banks.size} 家不同的發卡銀行**（${banksArr.join(", ")}）。`);
            reportLines.push(`* **優化建議**：多張卡片容易導致帳單繳款日分散、資金調度繁瑣。建議將消費集中在 1-2 張主力回饋卡（如現金回饋神卡），並設定數位銀行帳戶自動轉帳代繳帳單，防範忘記繳款。`);
            adviceIdx++;
        }
        
        const underBudget = [];
        categoriesList.forEach(cat => {
            const spent = catSpent[cat] || 0;
            const limit = budgetMap[cat] || 0;
            if (limit > 0 && spent < limit * 0.5) {
                underBudget.push({ category: cat, spent, limit, diff: limit - spent });
            }
        });
        
        if (underBudget.length > 0) {
            const catsToRealloc = underBudget.slice(0, 2).map(u => u.category).join("、");
            reportLines.push(`#### ${adviceIdx}. 🔄 預算資金動態再調配 (Reallocation)：`);
            reportLines.push(`* 偵測到您的「${catsToRealloc}」項目預算使用率極低，目前尚有大額盈餘。`);
            reportLines.push(`* **優化建議**：建議在下月調整預算分配，將這部分閒置預算額度挪移至經常超支的熱門項目（如餐飲或購物），使整體的預算規劃更符合實際消費慣性。`);
            adviceIdx++;
        }
        
        if (adviceIdx === 1) {
            reportLines.push("#### 1. 🌱 持續保持優異理財紀律：");
            reportLines.push("* 目前您的消費結構非常完美，建議繼續維持目前的記帳與預算執行習慣。");
            reportLines.push("#### 2. 📈 啟動儲蓄再配置：");
            reportLines.push("* 因本期有大額盈餘，建議將未支用的盈餘資金自動轉入高利活存或定存帳戶，以利複利累積您的第一桶金。");
        }
        
        const responseData = {
            status: "success",
            response: reportLines.join("\n"),
            brief_summary: brief_summary,
            brief_status: brief_status,
            is_mock: true
        };
        
        return new Response(JSON.stringify(responseData), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

        // 15. GET /api/auth/status (沙盒模擬)
    if (pathname === '/api/auth/status' && (!init || init.method === 'GET')) {
        const mockAuth = JSON.parse(localStorage.getItem("card_manager_mock_auth") || '{"logged_in": false}');
        return new Response(JSON.stringify({
            logged_in: mockAuth.logged_in || false,
            user: mockAuth.user || null,
            oauth_available: true
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 16. POST /api/local/scan-folder (沙盒模擬)
    if (pathname === '/api/local/scan-folder' && init && init.method === 'POST') {
        const body = JSON.parse(init.body);
        const path = body.folder_path || "";
        const mockRes = {
            status: "success",
            bank_name: "B銀行",
            bill_month: "2026-06",
            is_mock: true,
            message_notice: `🌿 [沙盒模擬] 已成功掃描並解析本機資料夾「${path}」下的 2026-06 帳單！`,
            items: [
                { card_date: "2026-06-02", post_date: "2026-06-03", detail: "全聯福利中心", amount: 1450, location: "台北", category: "餐飲", classify_status: "keyword_matched" },
                { card_date: "2026-06-08", post_date: "2026-06-09", detail: "蝦皮購物", amount: 1200, location: "台北", category: "購物", classify_status: "keyword_matched" },
                { card_date: "2026-06-15", post_date: "2026-06-16", detail: "鼎泰豐信義店", amount: 2850, location: "台北", category: "餐飲", classify_status: "ai_inferred" }
            ]
        };
        return new Response(JSON.stringify(mockRes), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 17. POST /api/cloud/scan-folder (沙盒模擬)
    if (pathname === '/api/cloud/scan-folder' && (!init || init.method === 'POST')) {
        const body = init.body ? JSON.parse(init.body) : {};
        const folderName = body.folder_name || "Card Statement Manager Bills";
        const mockRes = {
            status: "success",
            bank_name: "C銀行",
            bill_month: "2026-06",
            is_mock: true,
            message_notice: `☁️ [沙盒模擬] 已成功掃描並解析 Google Drive 雲端資料夾「${folderName}」內的新帳單！`,
            items: [
                { card_date: "2026-06-05", post_date: "2026-06-06", detail: "Netflix Subscription", amount: 390, location: "海外", category: "休閒旅遊", classify_status: "keyword_matched" },
                { card_date: "2026-06-12", post_date: "2026-06-13", detail: "高鐵來回票", amount: 2980, location: "台北", category: "交通運輸", classify_status: "keyword_matched" },
                { card_date: "2026-06-18", post_date: "2026-06-19", detail: "微風廣場購物", amount: 15600, location: "台北", category: "購物", classify_status: "ai_inferred" }
            ]
        };
        return new Response(JSON.stringify(mockRes), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ detail: "Mock endpoint not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
}

// =====================================================
// 1. 全域變數與狀態管理
// =====================================================
let trendChart = null;
let categoryChart = null;
let currentBillData = null;         // 當前正在審查的帳單完整資料
let pendingItemsToReview = [];      // 當前待審核的明細子集 (Pending-Only)
let allTransactions = [];           // 資料庫內所有的歷史交易
let activePasswordFile = null;      // 目前等待密碼的加密 PDF 檔案
let selectedSlicerMonths = [];      // 當前被 Slicer 選中的月份名單
let selectedSlicerCategories = [];  // 當前被 Slicer 選中的分類名單
let selectedSlicerBanks = [];       // 當前被 Slicer 選中的銀行名單
let allAvailableMonths = [];
let allAvailableBanks = [];
let currentSearchQuery = "";
let currentSortKey = "amount";      // 預設以金額降序排列 (高額交易置頂)
let currentSortDirection = "desc";

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initTheme();
    loadHistoryData();
    loadAPIKeyStatus();
    initEventListeners();
    initAuthAndScanning(); // 初始化雲端地端模式與掃描器 (NEW)
});

// =====================================================
// 2. 主題切換 (Light/Dark Mode)
// =====================================================
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    const body = document.body;
    
    if (savedTheme === "dark") {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
    } else {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
    }
}

function toggleTheme() {
    const body = document.body;
    if (body.classList.contains("light-mode")) {
        body.classList.remove("light-mode");
        body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
    } else {
        body.classList.remove("dark-mode");
        body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
    }
}

// =====================================================
// 3. 系統運行狀態 (移除 API Key 設定，僅保留查詢狀態)
// =====================================================
async function loadAPIKeyStatus() {
    // 雖然 API Key 功能移除，但保留此函式以維持系統運行，
    // 並統一顯示為「免金鑰模式」
    const statusText = document.getElementById("settings-api-status");
    if (statusText) {
        statusText.innerHTML = `<i data-lucide="info" style="width:14px; height:14px; vertical-align:middle;"></i> 系統目前運行於免 API 金鑰模式`;
        statusText.style.color = "var(--text-secondary)";
        lucide.createIcons();
    }
}

// 移除 saveServerAPIKey 與 clearServerAPIKey 的實際功能，
// 避免使用者呼叫到已移除的 UI
async function saveServerAPIKey() {
    console.log("API Key configuration has been disabled by developer.");
}

async function clearServerAPIKey() {
    console.log("API Key configuration has been disabled by developer.");
}

// =====================================================
// 4. 載入與聯動 Slicer 刷新 Dashboard 圖表
// =====================================================
async function loadHistoryData() {
    try {
        const response = await fetch("/api/summary");
        if (!response.ok) throw new Error("無法連線至後端伺服器，請確認 RUN.BAT 正在運行。");
        allTransactions = await response.json();
        
        // 🔴 防禦性安全檢查：確保回傳的是 Array
        if (!Array.isArray(allTransactions)) {
            allTransactions = [];
            throw new Error("後端交易明細資料格式錯誤，預期為陣列。");
        }
        
        // A. 初始化所有多維度多選 Slicer
        initMonthSlicer(allTransactions);
        initCategorySlicer();
        initBankSlicer(allTransactions);
        
        // B. 初次進行多維度同步交叉篩選更新
        triggerUnifiedUpdate();
        
    } catch (error) {
        console.error("載入歷史資料錯誤:", error);
        // 在 UI 呈現溫和提示，絕不讓網頁崩潰
        const explorerBody = document.getElementById("explorer-table-body");
        if (explorerBody) {
            explorerBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--danger-color); font-weight:600;"><i data-lucide="wifi-off" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> 後端伺服器連線失敗。請確認是否已點擊執行專案目錄下的 RUN.BAT 啟動服務。</td></tr>`;
            lucide.createIcons();
        }
    }
}

let selectedSlicerYear = "ALL"; // 預設顯示全部年度的月份

// 動態初始化月份 Slicer (RWD 二級層級樞紐篩選器，因應數年長週期資料)
function initMonthSlicer(transactions) {
    allAvailableMonths = Array.from(new Set(transactions.map(t => t.bill_month))).sort().reverse();
    selectedSlicerMonths = [...allAvailableMonths];
    renderTwoTierSlicer();
}

function renderTwoTierSlicer() {
    const visibleTargets = selectedSlicerYear === "ALL" ? allAvailableMonths : allAvailableMonths.filter(m => m.startsWith(selectedSlicerYear));
    const isFullySelected = visibleTargets.length > 0 && visibleTargets.every(m => selectedSlicerMonths.includes(m));
    const hasAnySelected = visibleTargets.some(m => selectedSlicerMonths.includes(m));

    const selectAllBtn = document.getElementById("month-select-all");
    const clearAllBtn = document.getElementById("month-clear-all");

    if (selectAllBtn) {
        selectAllBtn.className = "he-quick-action" + (isFullySelected ? " active" : "");
        selectAllBtn.onclick = () => {
            visibleTargets.forEach(m => { if (!selectedSlicerMonths.includes(m)) selectedSlicerMonths.push(m); });
            renderTwoTierSlicer(); triggerUnifiedUpdate();
        };
    }

    if (clearAllBtn) {
        clearAllBtn.className = "he-quick-action" + (!hasAnySelected ? " disabled" : "");
        clearAllBtn.onclick = () => {
            selectedSlicerMonths = selectedSlicerMonths.filter(m => !visibleTargets.includes(m));
            renderTwoTierSlicer(); triggerUnifiedUpdate();
        };
    }

    const host = document.getElementById("month-slicer-container");
    if (!host) return;
    host.innerHTML = "";

    if (allAvailableMonths.length === 0) {
        host.innerHTML = `<span style="font-size:0.75rem;color:var(--text-secondary);">暫無月份可篩選</span>`;
        return;
    }

    const years = Array.from(new Set(allAvailableMonths.map(m => m.substring(0, 4)))).sort().reverse();

    // ── Row 1: year segmented control ──
    const row1 = document.createElement("div");
    row1.style.cssText = "display:flex;align-items:center;margin-bottom:0.6rem;width:100%;";

    const tabs = document.createElement("div");
    tabs.className = "he-year-tabs";

    const makeTab = (label, yr) => {
        const btn = document.createElement("button");
        btn.className = "he-year-tab" + (selectedSlicerYear === yr ? " active" : "");
        btn.textContent = label;
        btn.onclick = () => { selectedSlicerYear = yr; renderTwoTierSlicer(); };
        return btn;
    };
    tabs.appendChild(makeTab("全部", "ALL"));
    years.forEach(yr => tabs.appendChild(makeTab(`${yr}`, yr)));
    row1.appendChild(tabs);
    host.appendChild(row1);

    // ── Row 2: month chips ──
    const row2 = document.createElement("div");
    row2.className = "he-slicer-host";

    const visible = selectedSlicerYear === "ALL" ? allAvailableMonths : allAvailableMonths.filter(m => m.startsWith(selectedSlicerYear));
    visible.forEach(m => {
        const chip = document.createElement("button");
        chip.className = "he-chip" + (selectedSlicerMonths.includes(m) ? " active" : "");
        chip.textContent = m;
        chip.onclick = () => {
            if (selectedSlicerMonths.includes(m)) {
                selectedSlicerMonths = selectedSlicerMonths.filter(x => x !== m);
            } else {
                selectedSlicerMonths.push(m);
            }
            renderTwoTierSlicer(); triggerUnifiedUpdate();
        };
        row2.appendChild(chip);
    });

    host.appendChild(row2);
    lucide.createIcons();
}

// =====================================================
// 4.1 Dashboard KPI 與 圖表渲染 (Restore Missing Functions)
// =====================================================
function updateDashboard(transactions) {
    let totalAmount = 0;
    let totalCount = transactions.length;
    
    const categoryData = {};
    const trendData = {}; 
    const banksSet = new Set();
    
    let hasDuplicate = false;
    let hasLargeAmount = false;
    let hasSubscription = false;
    let hasOverseas = false;
    const seenTx = new Set();
    
    const subKeywords = ["icloud", "apple", "netflix", "spotify", "youtube", "google", "電信", "保費", "etag", "健身工廠", "kkbox", "subscription"];
    
    transactions.forEach(t => {
        const amt = t.amount;
        totalAmount += amt;
        
        const cat = t.category || "其他";
        categoryData[cat] = (categoryData[cat] || 0) + amt;
        
        const month = t.bill_month;
        const bank = t.bank_name;
        banksSet.add(bank);
        
        if (!trendData[month]) {
            trendData[month] = {};
        }
        trendData[month][bank] = (trendData[month][bank] || 0) + amt;
        
        const dupKey = `${t.card_date}_${t.detail}_${amt}`;
        if (seenTx.has(dupKey)) {
            hasDuplicate = true;
        } else {
            seenTx.add(dupKey);
        }
        
        if (amt >= 10000) {
            hasLargeAmount = true;
        }
        
        const detailLower = (t.detail || "").toLowerCase();
        if (subKeywords.some(kw => detailLower.includes(kw))) {
            hasSubscription = true;
        }
    });
    
    const amtKpi = document.querySelector("#kpi-total-amount .kpi-value");
    const countKpi = document.querySelector("#kpi-total-count .kpi-value");
    if (amtKpi) amtKpi.textContent = `NT$ ${totalAmount.toLocaleString()}`;
    if (countKpi) countKpi.textContent = `${totalCount.toLocaleString()} 筆`;
    
    const alertCard = document.getElementById("kpi-anomaly-alert");
    const alertValue = alertCard ? alertCard.querySelector(".kpi-value") : null;
    const alertSubtext = document.getElementById("alert-subtext");
    
    if (alertCard && alertValue && alertSubtext) {
        if (hasDuplicate) {
            alertCard.className = "kpi-card alert-card anomaly-detected";
            alertValue.className = "kpi-value text-alert";
            alertValue.style.color = "var(--danger-color)";
            alertValue.textContent = "🚨 重複消費警示";
            alertSubtext.textContent = "偵測到疑似重複扣款項目，點此深入查看。";
        } else if (hasLargeAmount) {
            alertCard.className = "kpi-card alert-card anomaly-detected";
            alertValue.className = "kpi-value text-alert";
            alertValue.style.color = "var(--warning-color)";
            alertValue.textContent = "⚠️ 大額消費警示";
            alertSubtext.textContent = "本期含有單筆萬元以上交易，點擊即可深度分析。";
        } else {
            alertCard.className = "kpi-card alert-card interactive-kpi-card";
            alertValue.className = "kpi-value text-alert";
            alertValue.style.color = "var(--primary-color)";
            alertValue.textContent = "✨ 立即診斷";
            alertSubtext.textContent = "點擊進行本月消費診斷，找出您的省錢關鍵";
        }
    }
    
    renderCategoryChart(categoryData);
    renderTrendChart(trendData, Array.from(banksSet));
}

function renderCategoryChart(categoryData) {
    const canvas = document.getElementById("categoryChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);
    
    const isDark = document.body.classList.contains("dark-mode");
    
    if (categories.length === 0) {
        categoryChart = new Chart(ctx, {
            type: "doughnut",
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }
    
    const catColors = {
        "購物": "#3B82F6",
        "餐飲": "#EF4444",
        "休閒旅遊": "#10B981",
        "交通運輸": "#F59E0B",
        "辦公用品": "#8B5CF6",
        "醫療/健康": "#EC4899",
        "其他": "#64748B"
    };
    
    const colors = categories.map(cat => catColors[cat] || "#CBD5E1");
    
    categoryChart = new Chart(ctx, {
        type: "doughnut",
        plugins: [ChartDataLabels],
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderWidth: isDark ? 2 : 1,
                borderColor: isDark ? "#1E293B" : "#FFFFFF"
            }]
        },
        options: {
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const index = firstElement.index;
                    const clickedCat = categoryChart.data.labels[index];
                    
                    // 同步篩選：僅選取點擊的消費分類
                    selectedSlicerCategories = [clickedCat];
                    
                    // 1. 立即更新並重新渲染篩選器晶片 UI 狀態 (保證零延遲觸發)
                    renderCategorySlicer();
                    
                    // 2. 立即展開篩選面版以利使用者看清當前篩選狀態 (視覺反饋無延遲)
                    const consoleDiv = document.getElementById("explorer-bi-console");
                    const toggleBtn = document.getElementById("filter-console-toggle");
                    if (consoleDiv && toggleBtn) {
                        consoleDiv.classList.add("show");
                        toggleBtn.classList.add("active");
                    }
                    
                    // 3. 立即開始流暢平滑滾動到歷史消費探索區 (手動計算偏移量，防 72px 黏性頁首遮擋)
                    const explorerSec = document.querySelector(".history-explorer");
                    if (explorerSec) {
                        const headerOffset = 80; // 黏性頁首高 + 微小呼吸間距
                        const elementPosition = explorerSec.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                        });
                    }
                    
                    // 4. 🚀 延遲 300ms 進行重繪：將繁重的 DOM 表格 rows 繪製與 Chart 銷毀/重建，
                    // 延遲到滾動與摺疊展開動畫即將完成時進行，徹底避免 CPU 運算資源爭奪造成的畫面掉幀與卡頓，實現 60FPS 極致流暢！
                    setTimeout(() => {
                        triggerUnifiedUpdate();
                    }, 300);
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: isDark ? "#F8FAFC" : "#0F172A",
                        font: { family: "Inter", size: 10 },
                        boxWidth: 12
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 11, family: 'Outfit' },
                    formatter: (value, ctx) => {
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1) + "%";
                        return percentage;
                    },
                    display: (ctx) => {
                        // 占比太小(低於 5%)就不顯示標籤，避免重疊
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        return (ctx.dataset.data[ctx.dataIndex] / total) > 0.05;
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const perc = ((val / total) * 100).toFixed(1);
                            return ` NT$ ${val.toLocaleString()} (${perc}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTrendChart(trendData, banks) {
    const canvas = document.getElementById("trendChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (trendChart) {
        trendChart.destroy();
    }
    
    const months = Object.keys(trendData).sort();
    const isDark = document.body.classList.contains("dark-mode");
    const textCol = isDark ? "#94A3B8" : "#64748B";
    const gridCol = isDark ? "#334155" : "#E2E8F0";
    
    if (months.length === 0) {
        trendChart = new Chart(ctx, {
            type: "bar",
            options: { responsive: true, maintainAspectRatio: false }
        });
        return;
    }
    
    const bankColors = { "A銀行": "#3B82F6", "B銀行": "#EF4444", "C銀行": "#10B981" };
    const defaultColors = ["#60A5FA", "#F87171", "#34D399", "#A78BFA", "#FBBF24"];
    
    const datasets = banks.map((bank, idx) => {
        const data = months.map(month => trendData[month][bank] || 0);
        return {
            label: bank,
            data: data,
            backgroundColor: bankColors[bank] || defaultColors[idx % defaultColors.length],
            borderRadius: 0  
        };
    });
    
    // 計算每個月的總額
    const totalByMonth = months.map(month => {
        return banks.reduce((sum, bank) => sum + (trendData[month][bank] || 0), 0);
    });
    
    trendChart = new Chart(ctx, {
        type: "bar",
        plugins: [ChartDataLabels],
        data: { labels: months, datasets: datasets },
        options: {
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const datasetIndex = firstElement.datasetIndex;
                    const index = firstElement.index;
                    
                    const clickedMonth = trendChart.data.labels[index];
                    const clickedBank = trendChart.data.datasets[datasetIndex].label;
                    
                    // 同步篩選：僅選取點擊的年月與來源銀行
                    selectedSlicerMonths = [clickedMonth];
                    selectedSlicerBanks = [clickedBank];
                    
                    // 1. 立即更新並重新渲染篩選器晶片 UI 狀態 (保證零延遲觸發)
                    renderTwoTierSlicer();
                    renderBankSlicer();
                    
                    // 2. 立即展開篩選面版以利使用者看清當前篩選狀態 (視覺反饋無延遲)
                    const consoleDiv = document.getElementById("explorer-bi-console");
                    const toggleBtn = document.getElementById("filter-console-toggle");
                    if (consoleDiv && toggleBtn) {
                        consoleDiv.classList.add("show");
                        toggleBtn.classList.add("active");
                    }
                    
                    // 3. 立即開始流暢平滑滾動到歷史消費探索區 (手動計算偏移量，防 72px 黏性頁首遮擋)
                    const explorerSec = document.querySelector(".history-explorer");
                    if (explorerSec) {
                        const headerOffset = 80; // 黏性頁首高 + 微小呼吸間距
                        const elementPosition = explorerSec.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({
                            top: offsetPosition,
                            behavior: "smooth"
                        });
                    }
                    
                    // 4. 🚀 延遲 300ms 進行重繪：將繁重的 DOM 表格 rows 繪製與 Chart 銷毀/重建，
                    // 延遲到滾動與摺疊展開動畫即將完成時進行，徹底避免 CPU 運算資源爭奪造成的畫面掉幀與卡頓，實現 60FPS 極致流暢！
                    setTimeout(() => {
                        triggerUnifiedUpdate();
                    }, 300);
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20 // 🚀 增加頂部內距，確保最上方長條圖頂部的 DataLabels 數據標籤不會貼齊畫布邊緣或被裁剪
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: textCol, font: { family: "Inter" } }
                },
                y: {
                    stacked: true,
                    grid: { color: gridCol },
                    ticks: { 
                        color: textCol, 
                        font: { family: "Inter" },
                        callback: function(value) { return `NT$ ${value.toLocaleString()}`; }
                    },
                    grace: '15%' // 🚀 提供 15% 的頂部留白（Grace space），防止當數據高度逼近 Y 軸上限時，頂部數據標籤被隱藏或遮擋
                }
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: isDark ? "#F8FAFC" : "#0F172A", font: { family: "Inter", size: 10 } }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: isDark ? "#F8FAFC" : "#1E293B",
                    font: { weight: 'bold', size: 10, family: 'Outfit' },
                    formatter: (value, ctx) => {
                        // 僅在最後一個 dataset 顯示總額標籤
                        if (ctx.datasetIndex === ctx.chart.data.datasets.length - 1) {
                            const total = totalByMonth[ctx.dataIndex];
                            if (total <= 0) return '';
                            
                            // 🚀 行動端/窄螢幕時簡化字串，避免寬度不足跑版
                            const isMobile = window.innerWidth < 768;
                            if (isMobile) {
                                if (total >= 10000) {
                                    return `${(total / 10000).toFixed(1)}萬`;
                                }
                                return `${total}`;
                            }
                            return `NT$ ${total.toLocaleString()}`;
                        }
                        return null;
                    }
                }
            }
        }
    });
}

// 初始化與渲染分類多選 Slicer
const ALL_CATEGORIES = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"];
function initCategorySlicer() {
    selectedSlicerCategories = [...ALL_CATEGORIES];
    renderCategorySlicer();
}

function renderCategorySlicer() {
    const isFullySelected = selectedSlicerCategories.length === ALL_CATEGORIES.length;
    const hasAnySelected = selectedSlicerCategories.length > 0;

    const selectAllBtn = document.getElementById("category-select-all");
    const clearAllBtn = document.getElementById("category-clear-all");

    if (selectAllBtn) {
        selectAllBtn.className = "he-quick-action" + (isFullySelected ? " active" : "");
        selectAllBtn.onclick = () => {
            selectedSlicerCategories = [...ALL_CATEGORIES];
            renderCategorySlicer(); triggerUnifiedUpdate();
        };
    }

    if (clearAllBtn) {
        clearAllBtn.className = "he-quick-action" + (!hasAnySelected ? " disabled" : "");
        clearAllBtn.onclick = () => {
            selectedSlicerCategories = [];
            renderCategorySlicer(); triggerUnifiedUpdate();
        };
    }

    const container = document.getElementById("category-slicer-container");
    if (!container) return;
    container.innerHTML = "";

    ALL_CATEGORIES.forEach(cat => {
        const chip = document.createElement("button");
        chip.className = "he-chip" + (selectedSlicerCategories.includes(cat) ? " active" : "");
        chip.setAttribute("data-cat", cat);

        const text = document.createTextNode(cat);
        chip.appendChild(text);

        chip.onclick = () => {
            if (selectedSlicerCategories.includes(cat)) {
                selectedSlicerCategories = selectedSlicerCategories.filter(c => c !== cat);
            } else {
                selectedSlicerCategories.push(cat);
            }
            renderCategorySlicer(); triggerUnifiedUpdate();
        };
        container.appendChild(chip);
    });

    lucide.createIcons();
}

// 初始化與渲染銀行多選 Slicer
function initBankSlicer(transactions) {
    allAvailableBanks = Array.from(new Set(transactions.map(t => t.bank_name))).sort();
    selectedSlicerBanks = [...allAvailableBanks];
    renderBankSlicer();
}

function renderBankSlicer() {
    const isFullySelected = allAvailableBanks.length > 0 && selectedSlicerBanks.length === allAvailableBanks.length;
    const hasAnySelected = selectedSlicerBanks.length > 0;

    const selectAllBtn = document.getElementById("bank-select-all");
    const clearAllBtn = document.getElementById("bank-clear-all");

    if (selectAllBtn) {
        selectAllBtn.className = "he-quick-action" + (isFullySelected ? " active" : "");
        selectAllBtn.onclick = () => {
            selectedSlicerBanks = [...allAvailableBanks];
            renderBankSlicer(); triggerUnifiedUpdate();
        };
    }

    if (clearAllBtn) {
        clearAllBtn.className = "he-quick-action" + (!hasAnySelected ? " disabled" : "");
        clearAllBtn.onclick = () => {
            selectedSlicerBanks = [];
            renderBankSlicer(); triggerUnifiedUpdate();
        };
    }

    const container = document.getElementById("bank-slicer-container");
    if (!container) return;
    container.innerHTML = "";

    if (allAvailableBanks.length === 0) {
        container.innerHTML = `<span style="font-size:0.75rem;color:var(--text-secondary);">暫無銀行可篩選</span>`;
        return;
    }

    allAvailableBanks.forEach(bank => {
        const chip = document.createElement("button");
        chip.className = "he-chip" + (selectedSlicerBanks.includes(bank) ? " active" : "");

        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "credit-card");
        icon.style.cssText = "width:12px;height:12px;opacity:0.85;";
        chip.appendChild(icon);

        const text = document.createTextNode(bank);
        chip.appendChild(text);

        chip.onclick = () => {
            if (selectedSlicerBanks.includes(bank)) {
                selectedSlicerBanks = selectedSlicerBanks.filter(b => b !== bank);
            } else {
                selectedSlicerBanks.push(bank);
            }
            renderBankSlicer(); triggerUnifiedUpdate();
        };
        container.appendChild(chip);
    });

    lucide.createIcons();
}

// 🔴 核心多維度同步聯動樞紐：當任何篩選器（年月、分類、銀行）、搜尋框或排序方式改變時，同步刷新長條圖、KPI 與表格
function triggerUnifiedUpdate() {
    if (!Array.isArray(allTransactions)) return;
    
    // 1. 對 Master 交易數據進行多維度多選交叉篩選
    let filtered = allTransactions;
    
    // 1.1 篩選年月 Slicer 區間
    filtered = filtered.filter(t => selectedSlicerMonths.includes(t.bill_month));
    
    // 1.2 篩選消費分類 Slicer 區間
    filtered = filtered.filter(t => selectedSlicerCategories.includes(t.category));
    
    // 1.3 篩選來源銀行 Slicer 區間
    filtered = filtered.filter(t => selectedSlicerBanks.includes(t.bank_name));
    
    // C. 聯動更新長條圖與 KPI 統計 (反映 Slicer 篩選總額)
    updateDashboard(filtered);
    
    // 2. 套用文字搜尋過濾 (搜尋明細或銀行)
    let displayList = filtered;
    if (currentSearchQuery) {
        const query = currentSearchQuery.trim().toLowerCase();
        displayList = displayList.filter(t => 
            (t.detail && t.detail.toLowerCase().includes(query)) ||
            (t.bank_name && t.bank_name.toLowerCase().includes(query))
        );
    }
    
    // 3. 套用排序邏輯
    if (currentSortKey) {
        displayList.sort((a, b) => {
            let valA = a[currentSortKey] || "";
            let valB = b[currentSortKey] || "";
            
            // 處理數字或字串
            if (typeof valA === 'string') {
                return currentSortDirection === 'asc' 
                    ? valA.localeCompare(valB, 'zh-Hant') 
                    : valB.localeCompare(valA, 'zh-Hant');
            } else {
                return currentSortDirection === 'asc' 
                    ? (valA - valB) 
                    : (valB - valA);
            }
        });
    }
    
    // D. 聯動更新歷史探索表格
    renderExplorerTable(displayList);
}

function updateSortHeadersUI() {
    document.querySelectorAll(".sortable-header").forEach(th => {
        const key = th.getAttribute("data-sort-key");
        const icon = th.querySelector(".sort-icon");
        if (!icon) return;
        
        if (currentSortKey === key) {
            th.classList.add("active");
            if (currentSortDirection === "asc") {
                icon.setAttribute("data-lucide", "arrow-up-narrow-wide");
            } else {
                icon.setAttribute("data-lucide", "arrow-down-narrow-wide");
            }
        } else {
            th.classList.remove("active");
            icon.setAttribute("data-lucide", "arrow-up-down");
        }
    });
    lucide.createIcons();
}

function renderExplorerTable(transactions) {
    const tbody = document.getElementById("explorer-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">無符合篩選條件的消費紀錄</td></tr>`;
        return;
    }
    
    transactions.forEach(t => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="cell-month">${t.bill_month}</td>
            <td class="cell-bank">${t.bank_name}</td>
            <td class="cell-date">${t.card_date}</td>
            <td class="cell-detail">${t.detail}</td>
            <td class="cell-amount">NT$ ${t.amount.toLocaleString()}</td>
            <td class="cell-category"><span class="category-badge" data-cat="${t.category}">${t.category}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// =====================================================
// 6. AI 審核與 TODO 模式 (Pending-Only) UX
// =====================================================
function handleMockExample(filename) {
    // 🔴 智能防呆與安全引導：檢測用戶是否以 file:// 協議直接打開 HTML
    if (!isStaticDemo && window.location.protocol === "file:") {
        alert("⚠️ 系統偵測到您目前是直接雙擊點開 HTML 檔案瀏覽。\n\n請先雙擊執行專案目錄下的「RUN.BAT」啟動後端服務，並在瀏覽器網址列手動輸入：\n👉 http://127.0.0.1:8000\n\n以利順利進行範例測試與前後端數據連通！");
        return;
    }

    showScanningState(filename);
    
    setTimeout(async () => {
        try {
            const formData = new FormData();
            const blob = new Blob(["mock"], { type: "image/png" });
            formData.append("file", blob, filename);
            
            const response = await fetch("/api/analyze-bill", { method: "POST", body: formData });
            if (!response.ok) {
                const errDetail = await response.json().catch(() => null);
                const errMsg = (errDetail && errDetail.detail) ? errDetail.detail : "後端伺服器回應錯誤";
                throw new Error(`${errMsg}\n(請確保專案目錄下的 RUN.BAT 正在運行，且以 http://127.0.0.1:8000 開啟本頁)`);
            }
            const result = await response.json();
            
            if (result.status === "success") {
                currentBillData = result;
                
                // 🔴 TODO 模式：自動過濾並預設批准匹配項目，只留下待審核的明細 (ai_inferred 或 other)
                pendingItemsToReview = result.items.map((item, index) => ({...item, originalIndex: index}))
                                                   .filter(item => item.classify_status !== "keyword_matched");
                
                if (result.message_notice) {
                    alert(result.message_notice);
                }
                renderReviewPanel(result);
            } else {
                throw new Error(result.message || "未知解析錯誤");
            }
        } catch (error) {
            alert(`辨識出錯: ${error.message}`);
            resetReviewPanel();
        }
    }, 2200);
}

async function processFileWithAPI(file, password = "") {
    // 🔴 智能防呆與安全引導：檢測用戶是否以 file:// 協議直接打開 HTML
    if (!isStaticDemo && window.location.protocol === "file:") {
        alert("⚠️ 系統偵測到您目前是直接雙擊點開 HTML 檔案瀏覽。\n\n請先雙擊執行專案目錄下的「RUN.BAT」啟動後端服務，並在瀏覽器網址列手動輸入：\n👉 http://127.0.0.1:8000\n\n以利上傳帳單並進行 AI 智慧辨識！");
        return;
    }

    try {
        const formData = new FormData();
        formData.append("file", file);
        if (password) formData.append("password", password);
        
        const response = await fetch("/api/analyze-bill", { method: "POST", body: formData });
        
        if (!response.ok) {
            const errDetail = await response.json().catch(() => null);
            const errMsg = (errDetail && errDetail.detail) ? errDetail.detail : "後端處理失敗";
            throw new Error(`${errMsg}\n(請確認伺服器正以 RUN.BAT 正常啟動中)`);
        }
        
        const result = await response.json();
        
        if (result.status === "need_password") {
            activePasswordFile = file;
            document.getElementById("enc-pdf-name").textContent = file.name;
            document.getElementById("pdf-password-input").value = "";
            openModal("password-modal");
            resetReviewPanel();
        } else if (result.status === "success") {
            currentBillData = result;
            pendingItemsToReview = result.items.map((item, index) => ({...item, originalIndex: index}))
                                               .filter(item => item.classify_status !== "keyword_matched");
            if (result.message_notice) {
                alert(result.message_notice);
            }
            renderReviewPanel(result);
        }
    } catch (error) {
        alert(`匯入出錯: ${error.message}`);
        resetReviewPanel();
    }
}

function renderReviewPanel(data) {
    document.getElementById("review-scanning").style.display = "none";
    document.getElementById("review-placeholder").style.display = "none";
    document.getElementById("review-content").style.display = "flex";
    
    document.getElementById("res-bank-name").textContent = data.bank_name;
    document.getElementById("res-bill-month").textContent = data.bill_month;
    
    // 更新 AI 運作模式展示
    const resAiMode = document.getElementById("res-ai-mode");
    if (resAiMode) {
        if (data.is_mock) {
            resAiMode.textContent = "🌿 免 Key 模式";
            resAiMode.style.color = "var(--warning-color)";
        } else {
            resAiMode.textContent = "✨ 真實 AI 模式";
            resAiMode.style.color = "var(--success-color)";
        }
    }
    
    // 更新待審批筆數
    const pendingCount = pendingItemsToReview.length;
    document.getElementById("res-pending-count").textContent = `${pendingCount} 筆待確認`;
    
    const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
    document.getElementById("res-total-amount").textContent = `NT$ ${totalAmount.toLocaleString()}`;
    
    const tbody = document.getElementById("review-items-body");
    const tableWrapper = document.getElementById("review-table-wrapper");
    const celebration = document.getElementById("review-empty-celebration");
    
    tbody.innerHTML = "";
    
    if (pendingCount === 0) {
        // 🔴 全數核准狀態
        tableWrapper.style.display = "none";
        celebration.style.display = "flex";
        return;
    }
    
    tableWrapper.style.display = "block";
    celebration.style.display = "none";
    
    pendingItemsToReview.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.id = `review-row-${index}`;
        
        let badgeClass = "other-cat";
        let badgeText = "其他";
        let badgeIcon = "help-circle";
        
        if (item.classify_status === "ai_inferred") {
            badgeClass = "inferred";
            badgeText = `${item.category} (AI智慧)`;
            badgeIcon = "sparkles";
        }
        
        const categories = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"];
        const currentCat = item.category;
        const optionsHtml = categories.map(cat => {
            const isSelected = (cat === currentCat) ? "selected" : "";
            return `<option value="${cat}" ${isSelected}>${cat}</option>`;
        }).join("");
        
        tr.innerHTML = `
            <td class="cell-date">${item.card_date.substring(5)}</td>
            <td class="cell-detail">${item.detail}</td>
            <td class="cell-amount">NT$ ${item.amount.toLocaleString()}</td>
            <td class="cell-location">${item.location || "台灣"}</td>
            <td class="cell-action">
                <div class="cell-control">
                    <span class="category-badge ${badgeClass}" id="badge-${index}">
                        <i data-lucide="${badgeIcon}" style="width:12px; height:12px;"></i>
                        ${badgeText}
                    </span>
                    <div class="row-actions">
                        <select class="cat-select" onchange="onRowCategoryChange(${index}, this.value)">
                            ${optionsHtml}
                        </select>
                        <button class="approve-row-btn" id="approve-btn-${index}" onclick="approveSingleRow(${index})">
                            <i data-lucide="check" style="width:12px; height:12px;"></i>
                            確認
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

function onRowCategoryChange(index, newCategory) {
    const pendingItem = pendingItemsToReview[index];
    pendingItem.category = newCategory;
    
    currentBillData.items[pendingItem.originalIndex].category = newCategory;
    
    const badge = document.getElementById(`badge-${index}`);
    badge.className = "category-badge other-cat";
    badge.innerHTML = `<i data-lucide="help-circle" style="width:12px; height:12px;"></i> ${newCategory}`;
    lucide.createIcons();
}

// 單筆確認 - 滑動淡出效果
function approveSingleRow(index) {
    const row = document.getElementById(`review-row-${index}`);
    row.classList.add("fading-out");
    
    setTimeout(() => {
        const pendingItem = pendingItemsToReview[index];
        currentBillData.items[pendingItem.originalIndex].classify_status = "keyword_matched";
        
        // 🔴 用戶最新需求：人工核准完成後的消費分類，應該預設直接自動加入到關鍵字分類表中 (自動對照學習)
        syncSingleKeyword(pendingItem.detail, pendingItem.category);
        
        pendingItemsToReview = pendingItemsToReview.filter((item, idx) => idx !== index);
        renderReviewPanel(currentBillData);
    }, 400);
}

async function syncSingleKeyword(keyword, category) {
    try {
        await fetch("/api/keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword, category })
        });
    } catch (e) {
        console.error(e);
    }
}

// 全部核准並匯入 Excel
async function approveAndSaveToExcel() {
    if (!currentBillData) return;
    
    const itemsToSave = currentBillData.items.map(item => ({
        bill_month: currentBillData.bill_month,
        bank_name: currentBillData.bank_name,
        card_date: item.card_date,
        post_date: item.post_date,
        detail: item.detail,
        amount: item.amount,
        location: item.location,
        category: item.category
    }));
    
    try {
        const response = await fetch("/api/save-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: itemsToSave })
        });
        
        if (!response.ok) throw new Error("寫入 Excel 失敗");
        
        const saveRes = await response.json();
        alert(saveRes.message);
        
        resetReviewPanel();
        await loadHistoryData();
        
    } catch (error) {
        alert(`匯入保存失敗: ${error.message}`);
    }
}

function showScanningState(filename) {
    document.getElementById("review-placeholder").style.display = "none";
    document.getElementById("review-content").style.display = "none";
    document.getElementById("review-scanning").style.display = "flex";
    document.getElementById("scan-filename").textContent = `正在掃描辨識：${filename}`;
}

function resetReviewPanel() {
    document.getElementById("review-scanning").style.display = "none";
    document.getElementById("review-content").style.display = "none";
    document.getElementById("review-placeholder").style.display = "flex";
    currentBillData = null;
    pendingItemsToReview = [];
    activePasswordFile = null;
}

// =====================================================
// 7. 系統事件監聽器設定
// =====================================================
function initEventListeners() {
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            toggleTheme();
            if (allTransactions.length > 0) {
                updateDashboard(allTransactions);
            }
            if (currentBillData) {
                renderReviewPanel(currentBillData);
            }
        });
    }

    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
            openModal("settings-modal");
            loadSettingsData();
        });
    }

    // 綁定右上角多維度篩選主控台 Toggle 按鈕 (開合過渡動畫)
    const toggleBtn = document.getElementById("filter-console-toggle");
    const consoleDiv = document.getElementById("explorer-bi-console");
    if (toggleBtn && consoleDiv) {
        toggleBtn.addEventListener("click", () => {
            const isShown = consoleDiv.classList.toggle("show");
            toggleBtn.classList.toggle("active", isShown);
        });
    }

    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    if (dropZone && fileInput) {
        dropZone.addEventListener("click", () => fileInput.click());
        
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    document.querySelectorAll(".example-card").forEach(btn => {
        btn.addEventListener("click", () => {
            const filename = btn.getAttribute("data-filename");
            handleMockExample(filename);
        });
    });

    const discardBtn = document.getElementById("discard-btn");
    if (discardBtn) {
        discardBtn.addEventListener("click", () => {
            if (confirm("確定要放棄目前辨識的信用卡明細嗎？")) {
                resetReviewPanel();
            }
        });
    }

    const approveAllBtn = document.getElementById("approve-all-btn");
    if (approveAllBtn) {
        approveAllBtn.addEventListener("click", approveAndSaveToExcel);
    }

    const submitPasswordBtn = document.getElementById("submit-pdf-password-btn");
    if (submitPasswordBtn) {
        submitPasswordBtn.addEventListener("click", () => {
            const pwdInput = document.getElementById("pdf-password-input");
            const pwd = pwdInput ? pwdInput.value : "";
            if (!pwd) {
                alert("請輸入解密密碼");
                return;
            }
            closeModal("password-modal");
            if (activePasswordFile) {
                processFileWithAPI(activePasswordFile, pwd);
            }
        });
    }

    const saveApiKeyBtn = document.getElementById("save-api-key-btn-new");
    if (saveApiKeyBtn) {
        saveApiKeyBtn.addEventListener("click", saveServerAPIKey);
    }

    const clearApiKeyBtn = document.getElementById("clear-api-key-btn");
    if (clearApiKeyBtn) {
        clearApiKeyBtn.addEventListener("click", clearServerAPIKey);
    }

    const saveNewPwdBtn = document.getElementById("save-new-pwd-btn");
    if (saveNewPwdBtn) {
        saveNewPwdBtn.addEventListener("click", addNewPDFPassword);
    }

    const saveNewKwBtn = document.getElementById("save-new-kw-btn");
    if (saveNewKwBtn) {
        saveNewKwBtn.addEventListener("click", addNewKeywordRule);
    }

    // 🔴 綁定批次上傳關鍵字分類表對照表事件
    const triggerBatchBtn = document.getElementById("trigger-batch-kw-btn");
    const batchInput = document.getElementById("keyword-batch-input");
    if (triggerBatchBtn && batchInput) {
        triggerBatchBtn.addEventListener("click", () => batchInput.click());
        batchInput.addEventListener("change", handleKeywordBatchUpload);
    }

    // 🔴 綁定關鍵字即時搜尋事件
    const kwSearchInput = document.getElementById("keyword-search-input");
    if (kwSearchInput) {
        kwSearchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderKeywordRulesTable(cachedKeywordRules);
                return;
            }
            const filtered = cachedKeywordRules.filter(k => 
                k.keyword.toLowerCase().includes(query) || 
                k.category.toLowerCase().includes(query)
            );
            renderKeywordRulesTable(filtered);
        });
    }

    // 🔴 綁定 AI 智慧財務顧問卡片與雙重管道按鈕點擊事件
    const anomalyKpiCard = document.getElementById("kpi-anomaly-alert");
    if (anomalyKpiCard) {
        anomalyKpiCard.addEventListener("click", openAIAdvisorModal);
    }

    const headerAiBtn = document.getElementById("header-ai-btn");
    if (headerAiBtn) {
        headerAiBtn.addEventListener("click", openAIAdvisorModal);
    }

    // 🔴 歷史消費明細：即時搜尋消費明細/銀行
    const heSearchInput = document.getElementById("he-search-input");
    if (heSearchInput) {
        heSearchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value;
            triggerUnifiedUpdate();
        });
    }

    // 🔴 歷史消費明細：表頭排序點擊事件
    document.querySelectorAll(".sortable-header").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.getAttribute("data-sort-key");
            if (currentSortKey === key) {
                currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
            } else {
                currentSortKey = key;
                currentSortDirection = "desc"; // 預設降序
            }
            updateSortHeadersUI();
            triggerUnifiedUpdate();
        });
    });

    // 初始化列表排序 UI 圖示
    updateSortHeadersUI();
}

// =====================================================
// 8. 系統設定 (Settings) Modal 內部 Tab 載入與 API 串接
// =====================================================
function openModal(id) {
    document.getElementById(id).style.display = "flex";
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
    document.body.classList.remove("modal-open");
}

function switchTab(tabId, event) {
    const parent = event.target.closest(".modal-card");
    parent.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    event.target.closest(".tab-btn").classList.add("active");
    parent.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");
    document.getElementById(tabId).style.display = "block";
    
    if (tabId === "db-tab") {
        loadSettingsDBData();
    } else if (tabId === "pwd-tab") {
        loadSettingsPwdData();
    } else if (tabId === "keyword-tab") {
        loadSettingsKeywordData();
    } else if (tabId === "budget-tab") {
        loadSettingsBudgetData();
    } else if (tabId === "api-tab") {
        loadAPIKeyStatus();
    }
}

// 🟢 [NEW] 加載預算設定面板數據
async function loadSettingsBudgetData() {
    const monthSelect = document.getElementById("budget-month-select");
    if (!monthSelect) return;
    
    const selectedMonth = monthSelect.value;
    const tbody = document.getElementById("budget-body");
    
    try {
        const response = await fetch(`/api/budgets?bill_month=${selectedMonth}`);
        const budgets = await response.json();
        
        tbody.innerHTML = "";
        budgets.forEach(b => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight:600;">${b.category}</td>
                <td>
                    <input type="number" class="budget-input" data-cat="${b.category}" value="${b.amount}" 
                           style="width:100%; padding:0.3rem; border:1px solid var(--border-color); border-radius:var(--border-radius-sm); font-family:'Outfit';">
                </td>
                <td style="text-align:center; font-size:0.7rem; color:var(--text-secondary);">
                    ${selectedMonth === 'DEFAULT' ? '系統預設' : '特定月份'}
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error("加載預算失敗:", error);
    }
}

// 🟢 [NEW] 儲存所有預算配置
async function saveAllBudgets() {
    const monthSelect = document.getElementById("budget-month-select");
    const selectedMonth = monthSelect.value;
    const inputs = document.querySelectorAll(".budget-input");
    
    const budgets = [];
    inputs.forEach(input => {
        budgets.push({
            category: input.getAttribute("data-cat"),
            amount: parseInt(input.value) || 0,
            bill_month: selectedMonth
        });
    });
    
    try {
        const response = await fetch("/api/budgets/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bill_month: selectedMonth, budgets: budgets })
        });
        
        const result = await response.json();
        if (result.status === "success") {
            alert(result.message);
            loadSettingsBudgetData();
        }
    } catch (error) {
        alert("儲存預算失敗: " + error.message);
    }
}

// 修改原先的 loadSettingsData 函式 (搜尋並替換整個函式)
async function loadSettingsData() {
    // 初始化預算月份選擇器
    const monthSelect = document.getElementById("budget-month-select");
    if (monthSelect) {
        monthSelect.innerHTML = '<option value="DEFAULT">預設預算 (所有月份適用)</option>';
        allAvailableMonths.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            opt.textContent = `${m} 專屬預算`;
            monthSelect.appendChild(opt);
        });
    }

    loadSettingsDBData();
}

// Tab 1: 資料庫與 Excel 分月刪除
async function loadSettingsDBData() {
    const tbody = document.getElementById("db-months-body");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">資料載入中...</td></tr>`;
    
    try {
        const response = await fetch("/api/summary");
        if (!response.ok) throw new Error("後端伺服器連線失敗。請先啟動 RUN.BAT。");
        const txs = await response.json();
        
        // 🔴 防禦性安全檢查
        if (!Array.isArray(txs)) {
            throw new Error(txs.detail || "後端資料格式錯誤，預期為陣列。");
        }
        
        const monthlyStats = {};
        txs.forEach(t => {
            const m = t.bill_month;
            if (!monthlyStats[m]) {
                monthlyStats[m] = { month: m, banks: new Set(), count: 0, amount: 0 };
            }
            monthlyStats[m].banks.add(t.bank_name);
            monthlyStats[m].count += 1;
            monthlyStats[m].amount += t.amount;
        });
        
        tbody.innerHTML = "";
        const months = Object.keys(monthlyStats).sort().reverse();
        
        if (months.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">資料庫目前無刷卡明細</td></tr>`;
            return;
        }
        
        months.forEach(m => {
            const stat = monthlyStats[m];
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${stat.month}</strong></td>
                <td>${stat.banks.size} 家銀行 (${Array.from(stat.banks).join(", ")})</td>
                <td>${stat.count} 筆</td>
                <td><strong style="color:var(--primary-color);">NT$ ${stat.amount.toLocaleString()}</strong></td>
                <td style="text-align: center;">
                    <button class="btn btn-sm btn-danger" onclick="deleteTransactionsByMonth('${stat.month}')" title="刪除該月份明細">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                        刪除
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        lucide.createIcons();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--danger-color); font-weight:600;">載入失敗: ${error.message}</td></tr>`;
    }
}

async function deleteTransactionsByMonth(month) {
    if (!confirm(`警告：您確定要刪除 ${month} 月的所有信用卡明細嗎？\n這將會同步從 SQLite 資料庫與 Excel 總表檔案中安全移除！`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/transactions/month/${month}`, { method: "DELETE" });
        if (!response.ok) throw new Error("刪除失敗");
        const res = await response.json();
        alert(res.message);
        
        loadSettingsDBData();
        loadHistoryData();
    } catch (error) {
        alert(`刪除出錯: ${error.message}`);
    }
}

// Tab 2: PDF 自動解密密碼
async function loadSettingsPwdData() {
    const tbody = document.getElementById("pdf-pwd-body");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">密碼載入中...</td></tr>`;
    
    try {
        const response = await fetch("/api/pdf-passwords");
        if (!response.ok) throw new Error("後端伺服器連線失敗。請確認服務正在運行。");
        const pwds = await response.json();
        
        // 🔴 防禦性安全檢查
        if (!Array.isArray(pwds)) {
            throw new Error(pwds.detail || "後端資料格式錯誤，預期為陣列。");
        }
        
        tbody.innerHTML = "";
        if (pwds.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary);">目前無儲存的解密密碼</td></tr>`;
            return;
        }
        
        pwds.forEach(p => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${p.bank_name}</strong></td>
                <td><code>••••••••</code></td>
                <td>${p.updated_at.substring(0, 19).replace("T", " ")}</td>
                <td style="text-align: center;">
                    <button class="btn btn-sm btn-danger" onclick="deletePDFPassword('${p.bank_name}')">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                        刪除
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        lucide.createIcons();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--danger-color); font-weight:600;">載入密碼出錯: ${error.message}</td></tr>`;
    }
}

async function addNewPDFPassword() {
    const bank = document.getElementById("new-pwd-bank").value.trim();
    const pwd = document.getElementById("new-pwd-val").value;
    if (!bank || !pwd) {
        alert("請填寫銀行名稱與 PDF 密碼");
        return;
    }
    
    try {
        const response = await fetch("/api/pdf-passwords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bank_name: bank, password: pwd })
        });
        if (!response.ok) throw new Error("儲存密碼失敗");
        
        alert(`已成功儲存 ${bank} 的 PDF 解密密碼！`);
        document.getElementById("new-pwd-bank").value = "";
        document.getElementById("new-pwd-val").value = "";
        loadSettingsPwdData();
    } catch (error) {
        alert(error.message);
    }
}

async function deletePDFPassword(bank) {
    if (!confirm(`確定要刪除 ${bank} 的解密密碼紀錄嗎？`)) return;
    try {
        const response = await fetch(`/api/pdf-passwords/${bank}`, { method: "DELETE" });
        if (!response.ok) throw new Error("刪除失敗");
        loadSettingsPwdData();
    } catch (error) {
        alert(error.message);
    }
}

// 🔴 快取關鍵字對照名單，方便毫秒級前端過濾搜尋
let cachedKeywordRules = [];

// 🔴 Tab 3: 關鍵字對照表 (100% 讀寫 SQLite 快取表，防 Excel 被鎖卡死)
async function loadSettingsKeywordData() {
    const tbody = document.getElementById("keyword-body");
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;">對照規則載入中...</td></tr>`;
    
    // 清空搜尋輸入框
    const kwSearchInput = document.getElementById("keyword-search-input");
    if (kwSearchInput) kwSearchInput.value = "";

    try {
        const response = await fetch("/api/keywords");
        if (!response.ok) throw new Error("後端伺服器連線失敗。請確認服務正在運行。");
        const kws = await response.json();
        
        // 🔴 防禦性安全檢查：如果後端報錯回傳 Object，將其拋出以防 JS 執行中斷卡死網頁！
        if (!Array.isArray(kws)) {
            throw new Error(kws.detail || "後端資料格式錯誤，預期為陣列。");
        }
        
        cachedKeywordRules = kws; // 快取最新規則
        renderKeywordRulesTable(kws);
        
    } catch (error) {
        // 🔴 完美捕獲異常，在表格中顯示紅字錯誤，網頁絕對秒速反應且完全不會卡死！
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger-color); font-weight:600;"><i data-lucide="wifi-off" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> 載入失敗: ${error.message}，請確認 RUN.BAT 已啟動後端服務。</td></tr>`;
        lucide.createIcons();
    }
}

// 🔴 前端無延遲渲染關鍵字對照表函數 (支援行內編輯與搜尋過濾重繪)
function renderKeywordRulesTable(rules) {
    const tbody = document.getElementById("keyword-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    if (rules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-secondary);">資料庫內無快取或無符合搜尋條件的對照規則</td></tr>`;
        return;
    }
    
    rules.forEach((k, idx) => {
        const tr = document.createElement("tr");
        tr.id = `kw-row-${idx}`;
        tr.innerHTML = `
            <td><strong>${k.keyword}</strong></td>
            <td><span class="category-badge matched" id="kw-badge-${idx}">${k.category}</span></td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 0.35rem; justify-content: center;">
                    <button class="btn btn-sm btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; height: 24px; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="enterKeywordEditMode(${idx}, '${k.keyword.replace(/'/g, "\\'")}', '${k.category}')" title="編輯此分類對照">
                        <i data-lucide="edit-3" style="width:10px; height:10px;"></i> 編輯
                    </button>
                    <button class="btn btn-sm btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; height: 24px; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="deleteKeywordRule('${k.keyword.replace(/'/g, "\\'")}')" title="刪除此規則">
                        <i data-lucide="trash-2" style="width:10px; height:10px;"></i> 刪除
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

// 🔴 進入關鍵字行內編輯狀態 (In-line Edit Mode)
// 行內編輯關鍵字分類規則 (In-line Edit Mode)
function enterKeywordEditMode(idx, keyword, oldCategory) {
    const row = document.getElementById(`kw-row-${idx}`);
    if (!row) return;
    
    const categories = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"];
    const optionsHtml = categories.map(cat => {
        const isSelected = (cat === oldCategory) ? "selected" : "";
        return `<option value="${cat}" ${isSelected}>${cat}</option>`;
    }).join("");
    
    row.innerHTML = `
        <td><strong style="color: var(--text-secondary);">${keyword}</strong> <span style="font-size:0.65rem; color:var(--text-secondary); display:block;">(關鍵字唯讀)</span></td>
        <td>
            <select id="edit-kw-cat-${idx}" class="cat-select" style="width: 100%; height: 30px; font-size: 0.75rem; border-radius: var(--border-radius-sm); border: 1px solid var(--primary-color);">
                ${optionsHtml}
            </select>
        </td>
        <td style="text-align: center;">
            <div style="display: flex; gap: 0.35rem; justify-content: center;">
                <button class="btn btn-sm btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; height: 24px; display: inline-flex; align-items: center; gap: 0.2rem; background-color: var(--success-color); border-color: var(--success-color);" onclick="saveKeywordEdit(${idx}, '${keyword.replace(/'/g, "\\'")}')">
                    <i data-lucide="check" style="width:10px; height:10px;"></i> 儲存
                </button>
                <button class="btn btn-sm btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.7rem; height: 24px; display: inline-flex; align-items: center; gap: 0.2rem;" onclick="loadSettingsKeywordData()">
                    <i data-lucide="x" style="width:10px; height:10px;"></i> 取消
                </button>
            </div>
        </td>
    `;
    lucide.createIcons();
}

// 儲存修改的關鍵字分類對照規則
async function saveKeywordEdit(idx, keyword) {
    const select = document.getElementById(`edit-kw-cat-${idx}`);
    if (!select) return;
    
    const newCategory = select.value;
    
    if (!confirm(`確定要將關鍵字「${keyword}」的消費分類修改為「${newCategory}」嗎？`)) {
        return;
    }
    
    try {
        const response = await fetch("/api/keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: keyword, category: newCategory })
        });
        
        if (!response.ok) throw new Error("儲存關鍵字修改失敗");
        
        const result = await response.json();
        alert(result.message || "關鍵字修改儲存成功！");
        
        // 重新載入對照表數據
        await loadSettingsKeywordData();
    } catch (error) {
        alert(`儲存修改失敗: ${error.message}`);
    }
}

// 🟢 [NEW] 切換 AI 智慧財務顧問的子畫面 (Step-by-Step Wizard Screen 控制器)
function showAdvisorScreen(screenName) {
    const leftCol = document.querySelector(".ai-left-config");
    const rightCol = document.querySelector(".ai-right-report");
    const container = document.querySelector(".ai-split-container");
    
    if (!leftCol || !rightCol || !container) return;
    
    if (screenName === "config") {
        container.style.gridTemplateColumns = "1fr";
        leftCol.style.display = "flex";
        rightCol.style.display = "none";
    } else if (screenName === "report") {
        container.style.gridTemplateColumns = "1fr";
        leftCol.style.display = "none";
        rightCol.style.display = "flex";
        
        // 確保新畫面上的 Lucide 圖示正確載入
        lucide.createIcons();
    }
}

// 開啟 AI 財務顧問 Modal 彈窗，並自動初始化相關設定與元件
async function openAIAdvisorModal() {
    openModal("ai-advisor-modal");
    
    // 重設切換為 Screen 1 (設定確認畫面)
    showAdvisorScreen("config");
    
    // A. 初始化 Step 2 的選擇分析資料區間下拉選項與 checkboxes
    initAdvisorRangeOptions();
    
    // B. 初始化 Step 1 的預算月份選項
    const budgetMonthSelect = document.getElementById("adv-budget-month-select");
    if (budgetMonthSelect) {
        let optionsHtml = `<option value="DEFAULT">預設預算 (通用)</option>`;
        if (Array.isArray(allAvailableMonths)) {
            allAvailableMonths.forEach(m => {
                optionsHtml += `<option value="${m}">${m} 預算</option>`;
            });
        }
        budgetMonthSelect.innerHTML = optionsHtml;
        budgetMonthSelect.value = "DEFAULT";
    }
    
    // C. 載入 Step 1 的預算資料 (預設載入 DEFAULT)
    await loadAdvisorBudgetData();
    
    // D. 恢復 Step 3 報告預設 Placeholder
    const reportContent = document.getElementById("ai-report-content");
    if (reportContent) {
        reportContent.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); margin-top: 5.5rem;">
                <i data-lucide="sparkles" style="width: 32px; height: 32px; opacity: 0.25; margin-bottom: 0.6rem; display: block; margin-left: auto; margin-right: auto; animation: pulseSoft 2.5s infinite;"></i>
                請於左側設定每月預算並選擇分析區間，<br>點擊「啟動 AI 智慧消費診斷」獲得您的專屬財務報告。
            </div>
        `;
        lucide.createIcons();
    }
    
    // E. 重設 AI 模式 badge 為預設與隱藏一秒簡要提示欄
    const aiModeSpan = document.getElementById("advisor-ai-mode");
    if (aiModeSpan) {
        aiModeSpan.textContent = "-";
        aiModeSpan.style.backgroundColor = "";
        aiModeSpan.style.color = "";
        aiModeSpan.style.borderColor = "";
    }
    
    const summaryContainer = document.getElementById("adv-brief-summary-container");
    if (summaryContainer) {
        summaryContainer.style.display = "none";
    }
}

// 動態初始化 Step 2 區間選擇控制項選項
function initAdvisorRangeOptions() {
    const uniqueMonths = allAvailableMonths || [];
    
    // 1. 單一月份選項
    const singleSelect = document.getElementById("adv-single-month-select");
    if (singleSelect) {
        if (uniqueMonths.length === 0) {
            singleSelect.innerHTML = `<option value="">無月份資料</option>`;
        } else {
            singleSelect.innerHTML = uniqueMonths.map(m => `<option value="${m}">${m}</option>`).join('');
        }
    }
    
    // 2. 多選月份 checkboxes
    const multiContainer = document.getElementById("adv-multi-month-checkboxes");
    if (multiContainer) {
        if (uniqueMonths.length === 0) {
            multiContainer.innerHTML = `<span style="font-size:0.72rem; color:var(--text-secondary);">無月份資料</span>`;
        } else {
            multiContainer.innerHTML = uniqueMonths.map(m => `
                <label style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: var(--text-primary); cursor: pointer; padding: 0.15rem 0;">
                    <input type="checkbox" name="adv-multi-month-choice" value="${m}" checked>
                    <span style="font-family: 'Outfit'; font-weight: 600;">${m}</span>
                </label>
            `).join('');
        }
    }
    
    // 3. 按年分析年度選項
    const yearSelect = document.getElementById("adv-year-select");
    if (yearSelect) {
        const uniqueYears = Array.from(new Set(uniqueMonths.map(m => m.substring(0, 4)))).sort().reverse();
        if (uniqueYears.length === 0) {
            yearSelect.innerHTML = `<option value="">無年度資料</option>`;
        } else {
            yearSelect.innerHTML = uniqueYears.map(y => `<option value="${y}">${y} 年</option>`).join('');
        }
    }
    
    // 4. 重設預設選中的 radio 為單一月份，並切換控制項容器顯示
    const radios = document.getElementsByName("adv-range-type");
    if (radios && radios.length > 0) {
        radios[0].checked = true;
    }
    toggleAdvisorRangeControls();
}

// 切換 Step 2 區間控制項容器的顯示/隱藏狀態
function toggleAdvisorRangeControls() {
    const rangeTypes = document.getElementsByName("adv-range-type");
    let selectedType = "single";
    for (const r of rangeTypes) {
        if (r.checked) {
            selectedType = r.value;
            break;
        }
    }
    
    const singleCtrl = document.getElementById("adv-range-single-ctrl");
    const multiCtrl = document.getElementById("adv-range-multiple-ctrl");
    const yearCtrl = document.getElementById("adv-range-year-ctrl");
    
    if (singleCtrl) singleCtrl.style.display = selectedType === "single" ? "block" : "none";
    if (multiCtrl) multiCtrl.style.display = selectedType === "multiple" ? "block" : "none";
    if (yearCtrl) yearCtrl.style.display = selectedType === "year" ? "block" : "none";
}

// 自資料庫載入 Step 1 的預算規劃資料
async function loadAdvisorBudgetData() {
    const budgetMonthSelect = document.getElementById("adv-budget-month-select");
    const selectedMonth = budgetMonthSelect ? budgetMonthSelect.value : "DEFAULT";
    const inputsList = document.getElementById("adv-budget-inputs-list");
    
    if (inputsList) {
        inputsList.innerHTML = `<div style="text-align:center; padding:1.5rem; font-size:0.72rem; color:var(--primary-color); font-weight:600;"><i data-lucide="loader" class="animate-spin" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> 載入中...</div>`;
        lucide.createIcons();
    }
    
    try {
        const response = await fetch(`/api/budgets?bill_month=${selectedMonth}`);
        if (!response.ok) throw new Error("取得預算資料失敗");
        
        const budgets = await response.json();
        
        if (inputsList) {
            if (budgets.length === 0) {
                // 如果回傳為空，建立預設空預算清單
                const categories = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"];
                inputsList.innerHTML = categories.map(cat => `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--bg-secondary); padding: 0.35rem 0.55rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
                        <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-primary);">${cat}</span>
                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                            <input type="number" class="adv-budget-input" data-category="${cat}" value="0" style="width: 80px; text-align: right; padding: 0.2rem 0.4rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 0.72rem; font-family: 'Outfit'; font-weight: 600; background: var(--bg-primary); color: var(--text-primary);" min="0">
                            <span style="font-size: 0.68rem; color: var(--text-secondary); font-weight: 600;">元</span>
                        </div>
                    </div>
                `).join('');
            } else {
                inputsList.innerHTML = budgets.map(item => `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--bg-secondary); padding: 0.35rem 0.55rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
                        <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-primary);">${item.category}</span>
                        <div style="display: flex; align-items: center; gap: 0.25rem;">
                            <input type="number" class="adv-budget-input" data-category="${item.category}" value="${item.amount}" style="width: 80px; text-align: right; padding: 0.2rem 0.4rem; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); font-size: 0.72rem; font-family: 'Outfit'; font-weight: 600; background: var(--bg-primary); color: var(--text-primary);" min="0">
                            <span style="font-size: 0.68rem; color: var(--text-secondary); font-weight: 600;">元</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error("載入預算失敗:", error);
        if (inputsList) {
            inputsList.innerHTML = `<div style="color:var(--danger-color); font-size:0.72rem; text-align:center; padding:1rem;">載入失敗：${error.message}</div>`;
        }
    }
}

// 儲存 Step 1 的預算規劃配置至資料庫
async function saveAdvisorBudgets() {
    const budgetMonthSelect = document.getElementById("adv-budget-month-select");
    const selectedMonth = budgetMonthSelect ? budgetMonthSelect.value : "DEFAULT";
    const saveBtn = document.getElementById("adv-save-budgets-btn");
    
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width:11px; height:11px;"></i> 儲存中...`;
        lucide.createIcons();
    }
    
    const inputs = document.querySelectorAll(".adv-budget-input");
    const budgetsPayload = Array.from(inputs).map(input => ({
        category: input.getAttribute("data-category"),
        amount: parseInt(input.value) || 0,
        bill_month: selectedMonth
    }));
    
    try {
        const response = await fetch("/api/budgets/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                bill_month: selectedMonth,
                budgets: budgetsPayload
            })
        });
        
        if (!response.ok) throw new Error("儲存預算配置至後端失敗");
        
        const result = await response.json();
        alert(result.message || "預算配置已成功儲存！");
    } catch (error) {
        alert(`儲存預算失敗: ${error.message}`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i data-lucide="save" style="width: 11px; height: 11px;"></i> 儲存預算配置`;
            lucide.createIcons();
        }
    }
}

// 啟動 AI 消費診斷分析
async function runAdvisorAnalysis() {
    const reportContent = document.getElementById("ai-report-content");
    const aiModeSpan = document.getElementById("advisor-ai-mode");
    const runBtn = document.getElementById("adv-run-analysis-btn");
    
    if (aiModeSpan) {
        aiModeSpan.textContent = "⚙️ 模式檢測中...";
        aiModeSpan.style.backgroundColor = "var(--bg-primary)";
        aiModeSpan.style.color = "var(--text-secondary)";
        aiModeSpan.style.borderColor = "var(--border-color)";
    }
    
    // A. 判定選中的分析區間與對應交易
    const rangeTypes = document.getElementsByName("adv-range-type");
    let selectedType = "single";
    for (const r of rangeTypes) {
        if (r.checked) {
            selectedType = r.value;
            break;
        }
    }
    
    let targetMonths = [];
    if (selectedType === "single") {
        const singleSelect = document.getElementById("adv-single-month-select");
        if (singleSelect && singleSelect.value) {
            targetMonths = [singleSelect.value];
        }
    } else if (selectedType === "multiple") {
        const checkedBoxes = document.querySelectorAll('input[name="adv-multi-month-choice"]:checked');
        targetMonths = Array.from(checkedBoxes).map(cb => cb.value);
    } else if (selectedType === "year") {
        const yearSelect = document.getElementById("adv-year-select");
        if (yearSelect && yearSelect.value) {
            const yr = yearSelect.value;
            targetMonths = (allAvailableMonths || []).filter(m => m.startsWith(yr));
        }
    }
    
    if (targetMonths.length === 0) {
        alert("請確認已選取要納入分析的資料月份區間！");
        if (aiModeSpan) {
            aiModeSpan.textContent = "-";
            aiModeSpan.style.backgroundColor = "";
            aiModeSpan.style.color = "";
            aiModeSpan.style.borderColor = "";
        }
        return;
    }
    
    // B. 篩選對應月份交易
    let selectedTxs = [];
    if (Array.isArray(allTransactions) && allTransactions.length > 0) {
        selectedTxs = allTransactions.filter(t => targetMonths.includes(t.bill_month));
    }
    
    if (selectedTxs.length === 0) {
        if (reportContent) {
            reportContent.innerHTML = `
                <div style="text-align:center; color:var(--text-secondary); padding: 3rem 1rem;">
                    <i data-lucide="info" style="width:24px; height:24px; opacity:0.3; margin-bottom:0.5rem; display:block; margin-left:auto; margin-right:auto;"></i>
                    所選的分析區間內無任何消費明細資料。<br>請先匯入該月份的帳單以進行財務健康診斷報告！
                </div>`;
            lucide.createIcons();
        }
        if (aiModeSpan) {
            aiModeSpan.textContent = "-";
            aiModeSpan.style.backgroundColor = "";
            aiModeSpan.style.color = "";
            aiModeSpan.style.borderColor = "";
        }
        return;
    }
    
    // C. 收集當前預算 inputs 內容 (Step 1 畫面最新輸入值，這確保就算未存檔也能以畫面上的最新預算執行 AI 分析)
    const inputs = document.querySelectorAll(".adv-budget-input");
    const budgetsPayload = Array.from(inputs).map(input => ({
        category: input.getAttribute("data-category"),
        amount: parseInt(input.value) || 0,
        bill_month: "DEFAULT"
    }));
    
    // D. 顯示載入中 Skeletion Loader
    if (reportContent) {
        reportContent.innerHTML = `
            <div class="skeleton-loader">
                <div class="skeleton-line title" style="width: 70%;"></div>
                <div class="skeleton-line subtitle" style="width: 45%;"></div>
                <div style="height: 1px; background: var(--border-color); margin: 0.5rem 0; opacity: 0.5;"></div>
                <div class="skeleton-line" style="width: 92%;"></div>
                <div class="skeleton-line" style="width: 88%;"></div>
                <div class="skeleton-line" style="width: 95%;"></div>
                <br>
                <div class="skeleton-line title" style="width: 55%;"></div>
                <div class="skeleton-line" style="width: 85%;"></div>
                <div class="skeleton-line" style="width: 80%;"></div>
                <br>
                <div class="skeleton-line title" style="width: 45%;"></div>
                <div class="skeleton-line" style="width: 90%;"></div>
                <div class="skeleton-line" style="width: 85%;"></div>
            </div>
        `;
    }
    
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = `<i data-lucide="loader" class="animate-spin" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> AI 診斷分析中，請稍候...`;
        lucide.createIcons();
    }
    
    try {
        const response = await fetch("/api/ai-advisor/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                items: selectedTxs.map(t => ({
                    bill_month: t.bill_month,
                    bank_name: t.bank_name,
                    card_date: t.card_date,
                    post_date: t.post_date,
                    detail: t.detail,
                    amount: t.amount,
                    location: t.location || "台灣",
                    category: t.category
                })),
                budgets: budgetsPayload,
                query: null
            })
        });
        
        if (!response.ok) throw new Error("取得 AI 診斷報告失敗");
        
        const result = await response.json();
        if (reportContent) {
            reportContent.innerHTML = parseMarkdown(result.response);
        }
        
        // 渲染一秒簡要提示欄 (NEW)
        const summaryContainer = document.getElementById("adv-brief-summary-container");
        const summaryText = document.getElementById("adv-brief-summary-text");
        const summaryIconSlot = document.getElementById("adv-brief-summary-icon-slot");
        
        if (summaryContainer && summaryText && result.brief_summary) {
            const cleanText = cleanSummaryText(result.brief_summary);
            summaryText.textContent = cleanText;
            summaryText.title = cleanText; // 懸浮顯示完整提示
            summaryContainer.style.display = "flex";
            
            // 依據超支/警告/正常狀態套用精緻色彩與圖示
            if (result.brief_status === "alert") {
                summaryContainer.style.backgroundColor = "var(--danger-light)";
                summaryContainer.style.borderLeftColor = "var(--danger-color)";
                summaryContainer.style.color = "var(--danger-color)";
                if (summaryIconSlot) {
                    summaryIconSlot.innerHTML = `<i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--danger-color);"></i>`;
                }
            } else if (result.brief_status === "warning") {
                summaryContainer.style.backgroundColor = "var(--warning-light)";
                summaryContainer.style.borderLeftColor = "var(--warning-color)";
                summaryContainer.style.color = "var(--warning-color)";
                if (summaryIconSlot) {
                    summaryIconSlot.innerHTML = `<i data-lucide="bell" style="width: 14px; height: 14px; color: var(--warning-color);"></i>`;
                }
            } else {
                summaryContainer.style.backgroundColor = "var(--success-light)";
                summaryContainer.style.borderLeftColor = "var(--success-color)";
                summaryContainer.style.color = "var(--success-color)";
                if (summaryIconSlot) {
                    summaryIconSlot.innerHTML = `<i data-lucide="check-circle" style="width: 14px; height: 14px; color: var(--success-color);"></i>`;
                }
            }
            lucide.createIcons();
        }
        
        // 🟢 同步更新主網頁 Dashboard 上的 AI 智匯管家 KPI 欄位 (Dashboard KPI Sync)
        const mainKpiValue = document.querySelector("#kpi-anomaly-alert .kpi-value");
        const mainKpiSubtext = document.getElementById("alert-subtext");
        
        if (result.brief_summary) {
            if (mainKpiValue) {
                if (result.brief_status === "alert") {
                    mainKpiValue.textContent = "🚨 超支預警";
                    mainKpiValue.style.color = "var(--danger-color)";
                } else if (result.brief_status === "warning") {
                    mainKpiValue.textContent = "⚠️ 消費提醒";
                    mainKpiValue.style.color = "var(--warning-color)";
                } else {
                    mainKpiValue.textContent = "🟢 財務優異";
                    mainKpiValue.style.color = "var(--success-color)";
                }
            }
            if (mainKpiSubtext) {
                mainKpiSubtext.textContent = cleanAndTruncateSummary(result.brief_summary, 38);
                mainKpiSubtext.title = cleanSummaryText(result.brief_summary); // 懸浮完整乾淨提示
            }
        }
        
        if (aiModeSpan) {
            if (result.is_mock) {
                aiModeSpan.textContent = "🌿 免 API 金鑰模式";
                aiModeSpan.style.backgroundColor = "var(--warning-light)";
                aiModeSpan.style.color = "var(--warning-color)";
                aiModeSpan.style.borderColor = "var(--warning-border)";
            } else {
                aiModeSpan.textContent = "✨ 真實 AI 智慧模式";
                aiModeSpan.style.backgroundColor = "var(--success-light)";
                aiModeSpan.style.color = "var(--success-color)";
                aiModeSpan.style.borderColor = "var(--success-border)";
            }
        }
        
        // 🟢 自動切換至 Screen 2 (財務診斷報告畫面)
        showAdvisorScreen("report");
        
    } catch (error) {
        const summaryContainer = document.getElementById("adv-brief-summary-container");
        if (summaryContainer) {
            summaryContainer.style.display = "none";
        }
        if (reportContent) {
            reportContent.innerHTML = `<div style="color:var(--danger-color); font-weight:600; text-align:center; padding:3rem 1rem;"><i data-lucide="alert-circle" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> 報告生成出錯：${error.message}</div>`;
            lucide.createIcons();
        }
        if (aiModeSpan) {
            aiModeSpan.textContent = "🌿 免 API 金鑰模式";
            aiModeSpan.style.backgroundColor = "var(--warning-light)";
            aiModeSpan.style.color = "var(--warning-color)";
            aiModeSpan.style.borderColor = "var(--warning-border)";
        }
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = `<i data-lucide="sparkles"></i> 3. 啟動 AI 智慧消費診斷`;
            lucide.createIcons();
        }
    }
}

// 🛡️ 摘要內容淨化過濾器 (濾除 HTML/Markdown 標籤，防止破壞版面)
function cleanSummaryText(text) {
    if (!text) return "";
    let clean = text;
    // 1. 移除所有 HTML 標籤
    clean = clean.replace(/<[^>]*>/g, "");
    // 2. 移除 Markdown 圖片 ![]()
    clean = clean.replace(/!\[.*?\]\(.*?\)/g, "");
    // 3. 移除 Markdown 連結 [text](url) 但保留文字
    clean = clean.replace(/\[(.*?)\]\(.*?\)/g, "$1");
    // 4. 移除多餘空白與分行符號，使其維持在一行內
    clean = clean.replace(/\s+/g, " ").trim();
    return clean;
}

// 🛡️ 摘要字數安全截斷器 (確保 Dashboard 欄位在字數過多時絕不變形)
function cleanAndTruncateSummary(text, maxLen = 65) {
    const clean = cleanSummaryText(text);
    if (clean.length > maxLen) {
        return clean.substring(0, maxLen) + "...";
    }
    return clean;
}

// 🔴 高階輕量級 Markdown 轉 HTML 語意化編譯器 (安全、防護且視覺大氣)
function parseMarkdown(text) {
    if (!text) return "";
    
    let html = text;
    
    // 防護 XSS：轉義 HTML 標記，僅在安全控制下編譯 Markdown
    html = html.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // 1. 編譯三級標題 (### )
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:0.95rem; font-weight:700; color:var(--primary-color); margin-top:0.8rem; margin-bottom:0.4rem; border-left:3px solid var(--primary-color); padding-left:6px;">$1</h3>');
    
    // 2. 編譯四級標題 (#### )
    html = html.replace(/^#### (.*$)/gim, '<h4 style="font-size:0.85rem; font-weight:600; color:var(--text-primary); margin-top:0.6rem; margin-bottom:0.3rem;">$1</h4>');
    
    // 3. 編譯強烈粗體 (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary); font-weight:700;">$1</strong>');
    
    // 4. 編譯項目符號清單 (支援 *、- 以及前面帶有多個空白或縮排的情況)
    html = html.replace(/^[ \t]*[\*\-][ \t]+(.*$)/gim, '<div style="margin-left:0.6rem; margin-bottom:0.25rem; display:flex; gap:0.3rem; align-items:flex-start;"><span style="color:var(--primary-color); font-weight:bold;">•</span><span style="flex:1;">$1</span></div>');
    
    // 5. 編譯帶數字的清單 (支援前面帶有多個空白或縮排的情況)
    html = html.replace(/^[ \t]*\d+\.[ \t]+(.*$)/gim, '<div style="margin-left:0.6rem; margin-bottom:0.25rem; display:flex; gap:0.3rem; align-items:flex-start;"><span style="color:var(--primary-color); font-weight:bold;">1.</span><span style="flex:1;">$1</span></div>');

    // 6. 編譯底部分割細線 (---)
    html = html.replace(/^---$/gim, '<div style="border-bottom: 1px solid var(--border-color); margin: 0.8rem 0;"></div>');

    // 7. 編譯 Markdown 引用區塊 (> )
    html = html.replace(/^&gt; (.*$)/gim, '<div style="border-left: 2px solid var(--primary-color); background-color: var(--primary-light); padding: 0.4rem 0.6rem; font-size: 0.72rem; color: var(--text-secondary); border-radius: var(--border-radius-sm); margin: 0.6rem 0;">$1</div>');
    
    // 8. 🔴 智慧型換行解析防護：避免非 HTML block 的普通段落和空白行被瀏覽器摺疊在同一行
    html = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed === '') {
            return '<div style="height: 0.4rem;"></div>';
        }
        // 如果該行已經被我們轉成了 HTML 的區塊標籤 (h3, h4, hr, div, blockquote)，則直接保留
        if (trimmed.startsWith('<div') || trimmed.startsWith('</div') || 
            trimmed.startsWith('<h3') || trimmed.startsWith('<h4') || 
            trimmed.startsWith('<hr')) {
            return line;
        }
        // 否則，加上換行標籤以利完美呈現
        return line + '<br>';
    }).join('\n');
    
    return html;
}

// =====================================================
// 10. [NEW] 系統關鍵字規則管理與批次上傳/檔案上傳輔助函式
// =====================================================

// 新增單筆關鍵字規則
async function addNewKeywordRule() {
    const kwInput = document.getElementById("new-kw-text");
    const catSelect = document.getElementById("new-kw-cat");
    if (!kwInput || !catSelect) return;

    const keyword = kwInput.value.trim();
    const category = catSelect.value;

    if (!keyword) {
        alert("請輸入單筆關鍵字");
        return;
    }

    try {
        const response = await fetch("/api/keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: keyword, category: category })
        });
        if (!response.ok) throw new Error("新增規則失敗");
        
        const result = await response.json();
        alert(result.message || "關鍵字新增成功");
        kwInput.value = "";
        await loadSettingsKeywordData();
    } catch (error) {
        alert(`新增失敗: ${error.message}`);
    }
}

// 刪除關鍵字規則
async function deleteKeywordRule(keyword) {
    if (!confirm(`確定要刪除關鍵字「${keyword}」的對照規則嗎？`)) return;

    try {
        const response = await fetch(`/api/keywords/${encodeURIComponent(keyword)}`, {
            method: "DELETE"
        });
        if (!response.ok) throw new Error("刪除規則失敗");
        
        const result = await response.json();
        alert(result.message || "規則已刪除");
        await loadSettingsKeywordData();
    } catch (error) {
        alert(`刪除失敗: ${error.message}`);
    }
}

// 批次上傳 Excel 關鍵字規則
async function handleKeywordBatchUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!confirm(`確定要上傳並批次匯入對照表 Excel：「${file.name}」嗎？\n這將會寫入後端資料庫並同步至 Excel 實體檔案中。`)) {
        e.target.value = ""; // 清空選擇
        return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    // 顯示載入提示
    const tbody = document.getElementById("keyword-body");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--primary-color); font-weight:600;"><i data-lucide="loader" class="animate-spin" style="width:14px; height:14px; display:inline-block; vertical-align:middle; margin-right:4px;"></i> 批次規則解析與寫入中，請稍候...</td></tr>`;
        lucide.createIcons();
    }
    
    try {
        const response = await fetch("/api/keywords/batch", {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            const errDetail = await response.json();
            throw new Error(errDetail.detail || "批次上傳失敗，請確認檔案格式是否正確。");
        }
        
        const result = await response.json();
        alert(result.message || `成功匯入 ${result.imported_count} 筆關鍵字分類規則！`);
        
    } catch (error) {
        alert(`批次匯入失敗: ${error.message}`);
    } finally {
        e.target.value = ""; // 清空 file input
        loadSettingsKeywordData(); // 重新整理關鍵字快取清單
    }
}

// 拖曳或手動上傳帳單 PDF 轉接處理函式
function handleFileUpload(file) {
    processFileWithAPI(file);
}




// ==============================================================================
// 🔴 9. 雲端與地端雙軌模式與 Google OAuth 核心前端引擎 (NEW)
// ==============================================================================
async function initAuthAndScanning() {
    let loggedIn = false;
    let user = null;
    let oauthAvailable = false;

    if (isStaticDemo) {
        const mockAuth = JSON.parse(localStorage.getItem("card_manager_mock_auth") || '{"logged_in": false}');
        loggedIn = mockAuth.logged_in;
        user = mockAuth.user;
        oauthAvailable = true;
    } else {
        try {
            const res = await fetch("/api/auth/status");
            if (res.ok) {
                const data = await res.json();
                loggedIn = data.logged_in;
                user = data.user;
                oauthAvailable = data.oauth_available;
            }
        } catch (err) {
            console.error("無法載入 OAuth 狀態，回退地端訪客模式:", err);
        }
    }

    renderAuthStatusHeader(loggedIn, user, oauthAvailable);
    renderDualScanPanel(loggedIn);
}

function renderAuthStatusHeader(loggedIn, user, oauthAvailable) {
    const container = document.getElementById("auth-status-container");
    if (!container) return;

    container.innerHTML = "";

    if (loggedIn && user) {
        const avatarUrl = user.picture || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
        container.innerHTML = `
            <button onclick="toggleAuthDropdown(event)" class="icon-btn auth-trigger-btn cloud-active" title="帳戶與儲存模式設定：雲端硬碟模式">
                <img src="${avatarUrl}" class="auth-avatar" alt="Avatar">
            </button>
            <div id="auth-dropdown-card" class="auth-dropdown">
                <div class="auth-dropdown-header">
                    <span class="title">帳號登入</span>
                    <div class="auth-dropdown-profile">
                        <img src="${avatarUrl}" alt="Avatar">
                        <div class="info">
                            <span class="name" title="${user.name || user.email}">${user.name || user.email}</span>
                            <span class="mode" style="color: var(--primary-color); font-weight: 600;">☁️ 雲端硬碟模式</span>
                        </div>
                    </div>
                </div>
                <div class="auth-dropdown-options">
                    <button class="auth-dropdown-btn active-mode" onclick="toggleAuthDropdown()">
                        <i data-lucide="cloud"></i> 雲端硬碟 (已啟用)
                    </button>
                    <button class="auth-dropdown-btn" onclick="handleLogoutFlow()">
                        <i data-lucide="monitor"></i> 切換至訪客身分
                    </button>
                </div>
                <div class="auth-dropdown-footer">
                    <button class="auth-dropdown-btn" onclick="handleLogoutFlow()" style="color: var(--danger-color); padding: 0.4rem 0.75rem;">
                        <i data-lucide="log-out"></i> 安全登出 / 銷毀暫存
                    </button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="toggleAuthDropdown(event)" class="icon-btn auth-trigger-btn guest-active" title="帳戶與儲存模式設定：訪客身分">
                <i data-lucide="circle-user" style="width: 18px; height: 18px;"></i>
            </button>
            <div id="auth-dropdown-card" class="auth-dropdown">
                <div class="auth-dropdown-header">
                    <span class="title">帳號登入</span>
                    <div class="auth-dropdown-profile">
                        <div style="background: rgba(16, 185, 129, 0.08); color: #10B981; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0;">
                            <i data-lucide="monitor" style="width: 16px; height: 16px;"></i>
                        </div>
                        <div class="info">
                            <span class="name">訪客身分</span>
                            <span class="mode" style="color: #10B981; font-weight: 600;">🌱 訪客身分</span>
                        </div>
                    </div>
                </div>
                <div class="auth-dropdown-options">
                    <button class="auth-dropdown-btn guest-btn active-mode" onclick="toggleAuthDropdown()">
                        <i data-lucide="monitor"></i> 訪客身分 (已啟用)
                    </button>
                    <button class="auth-dropdown-btn" onclick="handleLoginFlow(${oauthAvailable})">
                        <i data-lucide="chrome"></i> Gmail登入
                    </button>
                </div>
                <div class="auth-dropdown-footer" style="margin-top: 0.1rem; padding-top: 0.5rem; display: flex; justify-content: center; font-size: 0.65rem; color: var(--text-secondary); opacity: 0.8; text-align: center; line-height: 1.4;">
                    <span>資料 100% 儲存在本機電腦</span>
                </div>
            </div>
        `;
    }
    lucide.createIcons();
}

function toggleAuthDropdown(event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById("auth-dropdown-card");
    if (dropdown) {
        dropdown.classList.toggle("show");
    }
}

document.addEventListener("click", (event) => {
    const container = document.getElementById("auth-status-container");
    const dropdown = document.getElementById("auth-dropdown-card");
    if (container && dropdown && !container.contains(event.target)) {
        dropdown.classList.remove("show");
    }
});

function handleLoginFlow(oauthAvailable = false) {
    if (isStaticDemo || !oauthAvailable) {
        if (!isStaticDemo && !oauthAvailable) {
            openModal("oauth-config-modal");
            return;
        }
        
        const name = prompt("請輸入您的模擬 Google 用戶名稱:", "金智賢");
        if (!name) return;
        const email = prompt("請輸入您的模擬 Google 信箱:", "ting.glitch@gmail.com");
        if (!email) return;
        
        localStorage.setItem("card_manager_mock_auth", JSON.stringify({
            logged_in: true,
            user: {
                name: name,
                email: email,
                picture: ""
            }
        }));
        alert("✨ 模擬 Gmail 登入成功！系統已進入「雲端 Google Drive 模式」模擬沙盒。");
        location.reload();
    } else {
        window.location.href = "/api/auth/login";
    }
}

function enableMockCloudSandbox() {
    localStorage.setItem("force_mock_backend", "true");
    localStorage.setItem("card_manager_mock_auth", JSON.stringify({
        logged_in: true,
        user: {
            name: "金智賢",
            email: "ting.glitch@gmail.com",
            picture: ""
        }
    }));
    closeModal("oauth-config-modal");
    alert("✨ 本地雲端模擬沙盒啟動成功！系統已模擬進入「雲端 Google Drive 模式」，現在您可以直接輸入自訂雲端資料夾並進行模擬掃描！");
    location.reload();
}

function handleLogoutFlow() {
    if (isStaticDemo || localStorage.getItem("force_mock_backend") === "true") {
        localStorage.removeItem("card_manager_mock_auth");
        localStorage.removeItem("force_mock_backend");
        alert("🌿 登出成功！已回歸地端訪客模式。");
        location.reload();
    } else {
        if (confirm("安全提示：登出將會徹底從伺服器硬碟安全銷毀抹除您的暫存 SQLite 連線資料，確認登出嗎？")) {
            window.location.href = "/api/auth/logout";
        }
    }
}

function renderDualScanPanel(loggedIn) {
    const panel = document.getElementById("dual-scan-panel");
    if (!panel) return;

    panel.innerHTML = "";

    if (loggedIn) {
        const savedFolder = localStorage.getItem("card_manager_cloud_scan_folder") || "Card Statement Manager Bills";
        panel.innerHTML = `
            <div class="scan-panel-header">
                <i data-lucide="cloud-lightning" style="color: var(--primary-color); width: 15px; height: 15px;"></i>
                <h3>Google Drive 雲端帳單掃描</h3>
            </div>
            <p style="font-size: 0.74rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                請指定您 Google Drive 中的帳單資料夾名稱，系統將自動掃描並以 AI 辨識且安全排重：
            </p>
            <div class="scan-input-group">
                <input type="text" id="cloud-scan-folder" class="scan-input" 
                       placeholder="例如 Card Statement Manager Bills 或 我的信用卡帳單" 
                       value="${savedFolder}" title="請輸入 Google Drive 內的資料夾名稱">
                <button id="btn-scan-cloud" class="btn-scan" title="點選掃描 Google Drive 專屬帳單夾">
                    <i data-lucide="refresh-cw" style="width:13px; height:13px;"></i> 掃描雲端資料夾
                </button>
            </div>
        `;
        
        const btn = document.getElementById("btn-scan-cloud");
        if (btn) {
            btn.addEventListener("click", () => triggerCloudScan());
        }
    } else {
        const savedPath = localStorage.getItem("card_manager_local_scan_path") || "";
        panel.innerHTML = `
            <div class="scan-panel-header">
                <i data-lucide="folder-search" style="color: var(--success-color); width: 15px; height: 15px;"></i>
                <h3>本機資料夾自動掃描</h3>
            </div>
            <p style="font-size: 0.74rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">
                請指定本機存放 PDF 帳單的資料夾路徑，系統會自動比對雜湊避免重複匯入：
            </p>
            <div class="scan-input-group">
                <input type="text" id="local-scan-path" class="scan-input" 
                       placeholder="例如 D:\\CardBills 或 C:\\Users\\Downloads" 
                       value="${savedPath}" title="請輸入要掃描的本機資料夾絕對路徑">
                <button id="btn-scan-local" class="btn-scan" title="點選掃描此本機資料夾">
                    <i data-lucide="folder-search" style="width:13px; height:13px;"></i> 掃描資料夾
                </button>
            </div>
        `;
        
        const btn = document.getElementById("btn-scan-local");
        if (btn) {
            btn.addEventListener("click", () => triggerLocalScan());
        }
    }
    lucide.createIcons();
}

async function triggerLocalScan() {
    const pathInput = document.getElementById("local-scan-path");
    const path = pathInput ? pathInput.value.trim() : "";
    
    if (!path) {
        alert("請先輸入有效的本機資料夾絕對路徑！");
        return;
    }
    
    localStorage.setItem("card_manager_local_scan_path", path);
    showScanningState("本機資料夾：" + path);
    
    try {
        if (isStaticDemo) {
            await new Promise(r => setTimeout(r, 2200));
            const mockRes = {
                status: "success",
                bank_name: "B銀行",
                bill_month: "2026-06",
                is_mock: true,
                message_notice: "🌿 [模擬] 已為您成功掃描並解析本機 2026-06 帳單！",
                items: [
                    { card_date: "2026-06-02", post_date: "2026-06-03", detail: "全聯福利中心", amount: 1450, location: "台北", category: "餐飲", classify_status: "keyword_matched" },
                    { card_date: "2026-06-08", post_date: "2026-06-09", detail: "蝦皮購物", amount: 1200, location: "台北", category: "購物", classify_status: "keyword_matched" },
                    { card_date: "2026-06-15", post_date: "2026-06-16", detail: "鼎泰豐信義店", amount: 2850, location: "台北", category: "餐飲", classify_status: "ai_inferred" }
                ]
            };
            handleScanSuccess(mockRes);
        } else {
            const response = await fetch("/api/local/scan-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folder_path: path })
            });
            
            if (!response.ok) {
                const errDetail = await response.json().catch(() => null);
                const errMsg = (errDetail && errDetail.detail) ? errDetail.detail : "掃描失敗，請確定路徑正確，且無非法路徑遍歷。";
                throw new Error(errMsg);
            }
            
            const result = await response.json();
            handleScanSuccess(result);
        }
    } catch (err) {
        alert("本機掃描失敗: " + err.message);
        resetReviewPanel();
    }
}

async function triggerCloudScan() {
    const folderInput = document.getElementById("cloud-scan-folder");
    const folderName = folderInput ? folderInput.value.trim() : "Card Statement Manager Bills";
    
    if (!folderName) {
        alert("請先輸入有效的 Google Drive 資料夾名稱！");
        return;
    }
    
    localStorage.setItem("card_manager_cloud_scan_folder", folderName);
    showScanningState("雲端資料夾：" + folderName);
    
    try {
        if (isStaticDemo) {
            await new Promise(r => setTimeout(r, 2500));
            const mockRes = {
                status: "success",
                bank_name: "C銀行",
                bill_month: "2026-06",
                is_mock: true,
                message_notice: `☁️ [模擬] 已成功掃描並解析 Google Drive 雲端資料夾「${folderName}」內的新帳單！`,
                items: [
                    { card_date: "2026-06-05", post_date: "2026-06-06", detail: "Netflix Subscription", amount: 390, location: "海外", category: "休閒旅遊", classify_status: "keyword_matched" },
                    { card_date: "2026-06-12", post_date: "2026-06-13", detail: "高鐵來回票", amount: 2980, location: "台北", category: "交通運輸", classify_status: "keyword_matched" },
                    { card_date: "2026-06-18", post_date: "2026-06-19", detail: "微風廣場購物", amount: 15600, location: "台北", category: "購物", classify_status: "ai_inferred" }
                ]
            };
            handleScanSuccess(mockRes);
        } else {
            const response = await fetch("/api/cloud/scan-folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folder_name: folderName })
            });
            
            if (!response.ok) {
                const errDetail = await response.json().catch(() => null);
                const errMsg = (errDetail && errDetail.detail) ? errDetail.detail : "雲端掃描失敗，請確定您的 Session 仍有效。";
                throw new Error(errMsg);
            }
            
            const result = await response.json();
            handleScanSuccess(result);
        }
    } catch (err) {
        alert("雲端掃描失敗: " + err.message);
        resetReviewPanel();
    }
}

function handleScanSuccess(result) {
    if (result.status === "no_new_bills") {
        alert(result.message);
        resetReviewPanel();
        return;
    }
    
    if (result.status === "need_password") {
        activePasswordFile = result.filename;
        document.getElementById("enc-pdf-name").textContent = result.filename;
        document.getElementById("pdf-password-input").value = "";
        openModal("password-modal");
        resetReviewPanel();
        
        const submitBtn = document.getElementById("submit-pdf-password-btn");
        const originalClick = submitBtn.onclick;
        
        submitBtn.onclick = async () => {
            const pwd = document.getElementById("pdf-password-input").value;
            if (!pwd) {
                alert("請輸入密碼！");
                return;
            }
            
            try {
                await fetch("/api/pdf-passwords", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ bank_name: result.filename.includes("B銀行") ? "B銀行" : (result.filename.includes("C銀行") ? "C銀行" : "A銀行"), password: pwd })
                });
            } catch (e) {
                console.error("儲存解密密碼失敗:", e);
            }
            
            closeModal("password-modal");
            submitBtn.onclick = originalClick;
            
            const mockAuth = JSON.parse(localStorage.getItem("card_manager_mock_auth") || '{"logged_in": false}');
            if (mockAuth.logged_in || document.getElementById("btn-scan-cloud")) {
                triggerCloudScan();
            } else {
                triggerLocalScan();
            }
        };
        return;
    }
    
    currentBillData = result;
    pendingItemsToReview = result.items.map((item, index) => ({...item, originalIndex: index}))
                                       .filter(item => item.classify_status !== "keyword_matched");
    
    if (result.message_notice) {
        alert(result.message_notice);
    }
    renderReviewPanel(result);
}
