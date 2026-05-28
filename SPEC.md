# 📋 智匯卡管家 | Card Statement Manager 技術規格與架構規範說明書 (SPEC)

本規格說明書旨在詳細規範 **「智匯卡管家 (Card Statement Manager)」** 的系統架構、資料庫結構 (SQLite Schema)、後端 API 規格、前端多維度 BI 交叉過濾機制，以及極致響應式 (RWD) 防爆變形適配設計。

---

## 1. 🗃️ 資料庫設計規範 (Database Schema)

系統採用 **SQLite 3** 作為本地嵌入式資料庫，配合自適應的 Excel 資料夾雙向寫入同步機制。資料庫檔案路徑位於 `billing.db`，內置以下五張核心資料表：

### 1.1 `transactions` (歷史消費明細表)
記錄所有已核准寫入的信用卡消費帳單歷史明細。
```sql
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_month TEXT NOT NULL,       -- 帳單月份 (格式：YYYY-MM，如 2026-01)
    bank_name TEXT NOT NULL,        -- 來源銀行 (如 A銀行, B銀行)
    card_date TEXT NOT NULL,        -- 刷卡日期 (格式：YYYY-MM-DD)
    post_date TEXT,                 -- 入帳起息日 (格式：YYYY-MM-DD)
    detail TEXT NOT NULL,           -- 消費明細描述 (作為關鍵字匹配錨點)
    amount INTEGER NOT NULL,        -- 消費新台幣金額 (強制整數)
    location TEXT DEFAULT '台灣',   -- 消費地區/國家 (如 台灣, 日本, 新加坡)
    category TEXT DEFAULT '其他',   -- 消費分類 (購物, 餐飲, 休閒旅遊, 交通運輸, 辦公用品, 醫療/健康, 其他)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 `keyword_rules` (關鍵字自動分類對照表)
本地優先的自動記帳歸類核心。支援單筆新增與批次 Excel 匯入。
```sql
CREATE TABLE IF NOT EXISTS keyword_rules (
    keyword TEXT PRIMARY KEY,       -- 匹配關鍵字 (不重複，如 'Uber', '爭鮮')
    category TEXT NOT NULL,         -- 歸屬消費分類
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 `pdf_passwords` (PDF 帳單解密密碼表)
儲存各發卡銀行的加密 PDF 密碼，上傳時自動嘗試匹配，避免使用者重複輸入。
```sql
CREATE TABLE IF NOT EXISTS pdf_passwords (
    bank_name TEXT PRIMARY KEY,     -- 銀行名稱 (如 'A銀行')
    password TEXT NOT NULL,         -- 解密密碼
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.4 `budgets` (分類預算限額表)
儲存各消費分類的月度預算限額，支援特定月份之預算重載。
```sql
CREATE TABLE IF NOT EXISTS budgets (
    category TEXT NOT NULL,         -- 消費分類
    amount INTEGER NOT NULL,        -- 預算限額金額 (NT$)
    bill_month TEXT DEFAULT 'DEFAULT', -- 適用月份 (預設為 'DEFAULT')
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (category, bill_month)
);
```

---

## 2. 🔌 後端 API 接口規範 (API Endpoints)

所有接口均採用 JSON 作為資料傳輸媒介。

### 2.1 帳單辨識解析接口
* **Endpoint**: `POST /api/analyze-bill`
* **Content-Type**: `multipart/form-data`
* **Request Parameters**:
  * `file`: `UploadFile` (支援 `.xlsx`, `.pdf`, `.png`, `.jpg`, `.jpeg`)
  * `password`: `Optional[str]` (PDF 解密密碼)
* **Response (密碼請求)**:
  ```json
  { "status": "need_password", "message": "PDF 已加密" }
  ```
* **Response (成功解析)**:
  ```json
  {
    "status": "success",
    "bank_name": "A銀行",
    "bill_month": "2026-01",
    "items": [
      {
        "card_date": "2026-01-04",
        "post_date": "2026-01-06",
        "detail": "高雄萬豪酒店",
        "amount": 6740,
        "location": "台灣",
        "category": "休閒旅遊",
        "classify_status": "keyword_matched"  // 分類狀態：keyword_matched, inferred, other
      }
    ],
    "is_mock": true
  }
  ```

### 2.2 AI 智匯消費診斷接口
* **Endpoint**: `POST /api/ai-advisor/chat`
* **Request Body (JSON)**:
  ```json
  {
    "items": [ { "bill_month": "2026-01", "bank_name": "A銀行", "detail": "Uber Eats", "amount": 686, "category": "餐飲" } ],
    "budgets": [ { "category": "餐飲", "amount": 5000 } ]
  }
  ```
* **Response**:
  ```json
  {
    "status": "success",
    "response": "### 🧠 AI 智慧財務消費分析報告 ... (Markdown 格式)",
    "brief_summary": "🚨 財務警報：整體預算使用率達 85.3%，其中「餐飲」已累計超支 NT$ 686！",
    "brief_status": "alert",  // alert, warning, success
    "is_mock": true
  }
  ```

---

## 3. 📱 響應式佈局與幾何收縮規範 (RWD & CSS Guidelines)

為確保在不同尺寸的設備上都能展現 Premium 高端質感且**絕不出格**，系統強制遵守以下佈局限制：

### 3.1 CSS Grid 與 Flexbox 收縮防護
* **防跑版定海神針**：所有作為網格項目的卡片容器 `.chart-container.card` 必須包含 `min-width: 0;` 與 `overflow: hidden;`，強制瀏覽器允許網格寬度小於內部的 Canvas，交由 Chart.js 自適應重繪。
* **Canvas 絕對適配**：
  ```css
  .chart-wrapper {
      position: relative;
      width: 100%;
      height: 240px;
  }
  .chart-wrapper canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100% !important;
      height: 100% !important;
  }
  ```
  這可以防止 Chart.js 在視窗重繪時延遲計算導致撐破卡片邊界。

### 3.2 響應式斷點與視區切換 (Viewport Breakpoints)
* **筆電視區斷點 (`1200px`)**：
  * 當螢幕寬度小於 `1200px` 且大於 `768px` 時，雙欄並排圖表網格 `.dashboard-charts` 的 `grid-template-columns` 必須平滑降級為 `1fr`（單欄垂直排列），賦予長條圖最大的水平呼吸空間，確保數據標籤完整。
* **行動端視區斷點 (`768px`)**：
  * KPI 卡片三欄平鋪改為垂直單欄排列。
  * 圖表外包裝 `.chart-wrapper` 的高度由 `240px` 微降至 `200px`，釋放出更多垂直像素給數據柱狀與圖例，完美防範重疊。
  * 表格包裝器 `.table-wrapper` 啟用 `-webkit-overflow-scrolling: touch;` 橫向滑動，並疊加 `white-space: nowrap !important` 防止文字因寬度不足被折成兩行變形。

---

## 4. 📈 前端多維度交叉過濾與 DataLabels 渲染機制

### 4.1 DataLabels 智能縮寫機制 (行動端)
* **問題**：在寬度小於 `768px` 的手機螢幕上，長條圖頂部的消費總額標籤（如 `NT$ 56,230`）容易發生互相重疊或超出 Canvas 左右邊界被裁剪的問題。
* **解決方案**：在 `app.js` 的 `renderTrendChart` 中，金額 formatter 自動偵測寬度：
  ```javascript
  const isMobile = window.innerWidth < 768;
  if (isMobile && total >= 10000) {
      return `${(total / 10000).toFixed(1)}萬`; // 自動縮寫為 5.6萬
  }
  ```
* **防裁剪雙重防線**：
  * **Y 軸極值寬裕量 (`grace: '15%'`)**：強制 Y 軸上限比最高長條高出 15%，長條頂端與網格上限之間留出開闊的安全空白。
  * **Layout 物理內距 (`layout.padding.top: 20`)**：在 Chart.js 配置中增加 20 像素內置頂部空間，確保標籤 100% 不超出畫布邊界。

### 4.2 多維度 BI 交叉聯動流暢動畫流程
前端以三個局部陣列記錄選中的狀態：
`selectedSlicerMonths`, `selectedSlicerCategories`, `selectedSlicerBanks`。
當使用者點選占比圓餅圖的扇區、或月度趨勢長條圖的單個發卡行柱體時：
1. **立即同步狀態**：將點擊目標更新至對應的多選 Slicer 狀態中，並重新高亮對應的 Slicer Chip 按鈕。
2. **零延遲展開面板**：篩選控制台 `.he-filter-panel` 立即展開，提供使用者即時的篩選回饋。
3. **滑順平滑滾動**：頁面流暢平滑滾動到「歷史消費明細」區域，手動計算 `-80px` 的偏移量以防止被頂部的 `sticky` 導覽列遮擋。
4. **非同步重繪機制**：延遲 300 毫秒（等待滾動與展開動畫即將結束時）才啟動後續的表格 DOM 渲染與圖表重置重建，徹底釋放 CPU 資源爭奪，保持 60 FPS 順暢體驗！
