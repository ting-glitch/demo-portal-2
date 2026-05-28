import os

js_path = os.path.join("static", "js", "app.js")

with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

def normalize_str(s):
    return s.replace("\r\n", "\n")

content_norm = normalize_str(content)

# 1. Update variables at the top
old_vars = """// =====================================================
// 1. 全域變數與狀態管理
// =====================================================
let categoryChart = null;
let trendChart = null;
let currentBillData = null;      // 當前正在審查的帳單完整資料
let pendingItemsToReview = [];   // 當前待審核的明細子集 (Pending-Only)
let allTransactions = [];        // 資料庫內所有的歷史交易
let activePasswordFile = null;   // 目前等待密碼的加密 PDF 檔案
let selectedSlicerMonths = [];   // 當前被 Slicer 選中的月份名單"""

new_vars = """// =====================================================
// 1. 全域變數與狀態管理
// =====================================================
let trendChart = null;
let currentBillData = null;         // 當前正在審查的帳單完整資料
let pendingItemsToReview = [];      // 當前待審核的明細子集 (Pending-Only)
let allTransactions = [];           // 資料庫內所有的歷史交易
let activePasswordFile = null;      // 目前等待密碼的加密 PDF 檔案
let selectedSlicerMonths = [];      // 當前被 Slicer 選中的月份名單
let selectedSlicerCategories = [];  // 當前被 Slicer 選中的分類名單
let selectedSlicerBanks = [];       // 當前被 Slicer 選中的銀行名單
let allAvailableMonths = [];
let allAvailableBanks = [];"""

old_vars_norm = normalize_str(old_vars)
if old_vars_norm in content_norm:
    content_norm = content_norm.replace(old_vars_norm, new_vars)
    print("Variables updated!")
else:
    print("WARNING: Variables not found!")

# 2. Update loadHistoryData success callback
old_load_cb = """        // A. 初始化月份 Slicer 多選按鈕組
        initMonthSlicer(allTransactions);
        
        // B. 初始化歷史明細瀏覽器篩選器
        initExplorerFilters(allTransactions);
        
        // C. 初次進行多維同步聯動篩選更新
        triggerUnifiedUpdate();"""

new_load_cb = """        // A. 初始化所有多維度多選 Slicer
        initMonthSlicer(allTransactions);
        initCategorySlicer();
        initBankSlicer(allTransactions);
        
        // B. 初次進行多維度同步交叉篩選更新
        triggerUnifiedUpdate();"""

old_load_cb_norm = normalize_str(old_load_cb)
if old_load_cb_norm in content_norm:
    content_norm = content_norm.replace(old_load_cb_norm, new_load_cb)
    print("loadHistoryData updated!")
else:
    print("WARNING: loadHistoryData not found!")

# 3. Replace all slicers and unified update functions starting from initMonthSlicer down to renderExplorerTable
# Let's locate the entire section of Month Slicer, Category Slicer and Bank Slicer
# In app.js, initMonthSlicer starts around line 167-200. Let's find "function initMonthSlicer" and replace up to "function renderExplorerTable"
idx_start = content_norm.find("function initMonthSlicer")
idx_end = content_norm.find("function renderExplorerTable")

if idx_start != -1 and idx_end != -1:
    old_slicer_section = content_norm[idx_start:idx_end]
    
    new_slicer_section = """function initMonthSlicer(transactions) {
    allAvailableMonths = Array.from(new Set(transactions.map(t => t.bill_month))).sort().reverse();
    selectedSlicerMonths = [...allAvailableMonths];
    renderTwoTierSlicer();
}

let selectedSlicerYear = "ALL"; 

function renderTwoTierSlicer() {
    const slicerContainer = document.getElementById("month-slicer-container");
    if (!slicerContainer) return;
    
    const years = Array.from(new Set(allAvailableMonths.map(m => m.substring(0, 4)))).sort().reverse();
    slicerContainer.innerHTML = "";
    
    if (allAvailableMonths.length === 0) {
        slicerContainer.innerHTML = `<span style="font-size:0.75rem; color:var(--text-secondary);">暫無月份可篩選</span>`;
        return;
    }
    
    const yearRow = document.createElement("div");
    yearRow.className = "year-tabs-row";
    yearRow.style.cssText = "display: flex; gap: 0.3rem; margin-bottom: 0.5rem; flex-wrap: wrap; width: 100%; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem; align-items: center;";
    
    const yearLabel = document.createElement("span");
    yearLabel.style.cssText = "font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); margin-right: 0.4rem;";
    yearLabel.textContent = "年度篩選:";
    yearRow.appendChild(yearLabel);
    
    const allTab = document.createElement("button");
    allTab.className = `slicer-btn ${selectedSlicerYear === "ALL" ? "active" : ""}`;
    allTab.style.cssText = selectedSlicerYear === "ALL" 
        ? "background-color: var(--primary-color); color: #FFFFFF; border-color: var(--primary-color); padding: 0.25rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: var(--border-radius-sm); cursor: pointer;"
        : "background-color: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.25rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: var(--border-radius-sm); cursor: pointer;";
    allTab.textContent = "全部年度";
    allTab.onclick = () => {
        selectedSlicerYear = "ALL";
        renderTwoTierSlicer();
    };
    yearRow.appendChild(allTab);
    
    years.forEach(yr => {
        const yrTab = document.createElement("button");
        yrTab.className = `slicer-btn ${selectedSlicerYear === yr ? "active" : ""}`;
        yrTab.style.cssText = selectedSlicerYear === yr
            ? "background-color: var(--primary-color); color: #FFFFFF; border-color: var(--primary-color); padding: 0.25rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: var(--border-radius-sm); cursor: pointer;"
            : "background-color: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 0.25rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: var(--border-radius-sm); cursor: pointer;";
        yrTab.textContent = `${yr} 年`;
        yrTab.onclick = () => {
            selectedSlicerYear = yr;
            renderTwoTierSlicer();
        };
        yearRow.appendChild(yrTab);
    });
    
    const quickActions = document.createElement("div");
    quickActions.style.cssText = "margin-left: auto; display: flex; gap: 0.5rem; font-size: 0.65rem;";
    
    const selectAllLink = document.createElement("a");
    selectAllLink.href = "javascript:void(0)";
    selectAllLink.style.cssText = "color: var(--primary-color); text-decoration: none; font-weight: 600;";
    selectAllLink.textContent = "年度全選";
    selectAllLink.onclick = () => {
        const monthsToSelect = selectedSlicerYear === "ALL" ? allAvailableMonths : allAvailableMonths.filter(m => m.startsWith(selectedSlicerYear));
        monthsToSelect.forEach(m => {
            if (!selectedSlicerMonths.includes(m)) selectedSlicerMonths.push(m);
        });
        renderTwoTierSlicer();
        triggerUnifiedUpdate();
    };
    
    const clearAllLink = document.createElement("a");
    clearAllLink.href = "javascript:void(0)";
    clearAllLink.style.cssText = "color: var(--text-secondary); text-decoration: none; font-weight: 600;";
    clearAllLink.textContent = "年度清除";
    clearAllLink.onclick = () => {
        const monthsToClear = selectedSlicerYear === "ALL" ? allAvailableMonths : allAvailableMonths.filter(m => m.startsWith(selectedSlicerYear));
        selectedSlicerMonths = selectedSlicerMonths.filter(m => !monthsToClear.includes(m));
        renderTwoTierSlicer();
        triggerUnifiedUpdate();
    };
    
    quickActions.appendChild(selectAllLink);
    quickActions.appendChild(clearAllLink);
    yearRow.appendChild(quickActions);
    slicerContainer.appendChild(yearRow);
    
    const monthsRow = document.createElement("div");
    monthsRow.className = "months-row";
    monthsRow.style.cssText = "display: flex; gap: 0.35rem; flex-wrap: wrap; width: 100%;";
    
    const visibleMonths = selectedSlicerYear === "ALL" ? allAvailableMonths : allAvailableMonths.filter(m => m.startsWith(selectedSlicerYear));
    
    visibleMonths.forEach(m => {
        const isChecked = selectedSlicerMonths.includes(m);
        const label = document.createElement("label");
        label.className = "slicer-item";
        label.innerHTML = `
            <input type="checkbox" value="${m}" ${isChecked ? "checked" : ""} onchange="onSlicerChange(this)">
            <span class="slicer-btn">${m}</span>
        `;
        monthsRow.appendChild(label);
    });
    
    slicerContainer.appendChild(monthsRow);
}

function onSlicerChange(checkbox) {
    const val = checkbox.value;
    if (checkbox.checked) {
        if (!selectedSlicerMonths.includes(val)) {
            selectedSlicerMonths.push(val);
        }
    } else {
        selectedSlicerMonths = selectedSlicerMonths.filter(m => m !== val);
    }
    
    renderTwoTierSlicer();
    triggerUnifiedUpdate();
}

// 初始化與渲染分類多選 Slicer
const ALL_CATEGORIES = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"];
function initCategorySlicer() {
    selectedSlicerCategories = [...ALL_CATEGORIES];
    renderCategorySlicer();
}

function renderCategorySlicer() {
    const container = document.getElementById("category-slicer-container");
    if (!container) return;
    container.innerHTML = "";
    
    ALL_CATEGORIES.forEach(cat => {
        const isChecked = selectedSlicerCategories.includes(cat);
        const label = document.createElement("label");
        label.className = "slicer-item";
        label.innerHTML = `
            <input type="checkbox" value="${cat}" ${isChecked ? "checked" : ""} onchange="onCategorySlicerChange(this)">
            <span class="slicer-btn">${cat}</span>
        `;
        container.appendChild(label);
    });
}

function onCategorySlicerChange(checkbox) {
    const val = checkbox.value;
    if (checkbox.checked) {
        if (!selectedSlicerCategories.includes(val)) selectedSlicerCategories.push(val);
    } else {
        selectedSlicerCategories = selectedSlicerCategories.filter(c => c !== val);
    }
    renderCategorySlicer();
    triggerUnifiedUpdate();
}

// 初始化與渲染銀行多選 Slicer
function initBankSlicer(transactions) {
    allAvailableBanks = Array.from(new Set(transactions.map(t => t.bank_name))).sort();
    selectedSlicerBanks = [...allAvailableBanks];
    renderBankSlicer();
}

function renderBankSlicer() {
    const container = document.getElementById("bank-slicer-container");
    if (!container) return;
    container.innerHTML = "";
    
    if (allAvailableBanks.length === 0) {
        container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-secondary);">暫無銀行可篩選</span>`;
        return;
    }
    
    allAvailableBanks.forEach(bank => {
        const isChecked = selectedSlicerBanks.includes(bank);
        const label = document.createElement("label");
        label.className = "slicer-item";
        label.innerHTML = `
            <input type="checkbox" value="${bank}" ${isChecked ? "checked" : ""} onchange="onBankSlicerChange(this)">
            <span class="slicer-btn">${bank}</span>
        `;
        container.appendChild(label);
    });
}

function onBankSlicerChange(checkbox) {
    const val = checkbox.value;
    if (checkbox.checked) {
        if (!selectedSlicerBanks.includes(val)) selectedSlicerBanks.push(val);
    } else {
        selectedSlicerBanks = selectedSlicerBanks.filter(b => b !== val);
    }
    renderBankSlicer();
    triggerUnifiedUpdate();
}

// 🔴 核心多維度同步聯動樞紐：當任何篩選器（年月、分類、銀行）改變時，同步刷新長條圖、KPI 與金額降序表格
function triggerUnifiedUpdate() {
    if (!Array.isArray(allTransactions)) return;
    
    // 對 Master 交易數據進行多維度多選交叉篩選
    let filtered = allTransactions;
    
    // 1. 篩選年月 Slicer 區間
    filtered = filtered.filter(t => selectedSlicerMonths.includes(t.bill_month));
    
    // 2. 篩選消費分類 Slicer 區間
    filtered = filtered.filter(t => selectedSlicerCategories.includes(t.category));
    
    // 3. 篩選來源銀行 Slicer 區間
    filtered = filtered.filter(t => selectedSlicerBanks.includes(t.bank_name));
    
    // C. 聯動更新長條圖與 KPI 統計 (極速流暢)
    updateDashboard(filtered);
    
    // D. 聯動更新歷史探索表格，並依金額降序排列 (高額交易置頂)
    const sorted = [...filtered].sort((a, b) => b.amount - a.amount);
    renderExplorerTable(sorted);
}

"""
    content_norm = content_norm.replace(old_slicer_section, new_slicer_section)
    print("Slicer section and triggerUnifiedUpdate fully rewritten successfully!")
else:
    print("WARNING: Slicer indices not found!")

# 4. Remove renderCategoryChart function and its call in updateDashboard
# Let's locate "renderCategoryChart(categoryData);" in updateDashboard
old_call = "    renderCategoryChart(categoryData);"
if old_call in content_norm:
    content_norm = content_norm.replace(old_call, "")
    print("renderCategoryChart call removed from updateDashboard!")
else:
    print("WARNING: renderCategoryChart call not found in updateDashboard!")

# Let's locate the definition of renderCategoryChart and remove it
idx_chart_start = content_norm.find("function renderCategoryChart")
if idx_chart_start != -1:
    # Find the end of renderCategoryChart (which is before function renderTrendChart)
    idx_chart_end = content_norm.find("function renderTrendChart")
    if idx_chart_end != -1:
        old_chart_func = content_norm[idx_chart_start:idx_chart_end]
        content_norm = content_norm.replace(old_chart_func, "")
        print("renderCategoryChart function removed successfully!")

# 5. Insert onClick handler into trendChart options
old_trend_options = """    trendChart = new Chart(ctx, {
        type: "bar",
        data: { labels: months, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,"""

new_trend_options = """    trendChart = new Chart(ctx, {
        type: "bar",
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
                    
                    // 重新更新年月與銀行篩選器 UI
                    renderTwoTierSlicer();
                    renderBankSlicer();
                    triggerUnifiedUpdate();
                    
                    // 平滑滾動到歷史消費探索區
                    const explorerSec = document.querySelector(".history-explorer");
                    if (explorerSec) {
                        explorerSec.scrollIntoView({ behavior: "smooth" });
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,"""

old_trend_options_norm = normalize_str(old_trend_options)
if old_trend_options_norm in content_norm:
    content_norm = content_norm.replace(old_trend_options_norm, new_trend_options)
    print("trendChart onClick handler inserted successfully!")
else:
    print("WARNING: trendChart options not found!")

# 6. Remove obsolete dropdown listeners from initEventListeners
old_listeners = """    document.getElementById("explorer-month-filter").addEventListener("change", () => {
        // 如果使用者在下拉選單切換了年月，同步聯動 Slicer 狀態
        const mVal = document.getElementById("explorer-month-filter").value;
        if (mVal === "ALL") {
            selectedSlicerMonths = [...allAvailableMonths];
        } else {
            selectedSlicerMonths = [mVal];
        }
        renderTwoTierSlicer();
        triggerUnifiedUpdate();
    });
    document.getElementById("explorer-bank-filter").addEventListener("change", triggerUnifiedUpdate);
    
    const catFilter = document.getElementById("explorer-category-filter");
    if (catFilter) {
        catFilter.addEventListener("change", triggerUnifiedUpdate);
    }"""

old_listeners_norm = normalize_str(old_listeners)
if old_listeners_norm in content_norm:
    content_norm = content_norm.replace(old_listeners_norm, "")
    print("Obsolete dropdown listeners removed from initEventListeners!")
else:
    print("WARNING: Obsolete dropdown listeners not found!")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(content_norm)

print("Patch JS complete!")
