import sqlite3
import os
import openpyxl
import contextvars
import io
import shutil
from datetime import datetime

# ==============================================================================
# 1. 執行期動態資料庫路徑管理 (Thread-safe & Coroutine-safe Context Variable)
# ==============================================================================
# 這是確保多個使用者同時登入時，每個連線都指向其專屬 Session 資料庫，避免併發衝突的核心設計。
DB_PATH_VAR = contextvars.ContextVar("db_path", default="billing.db")

EXCEL_PATH = "vba/信用卡明細彙整表_解答.xlsm"
KEYWORD_EXCEL_PATH = "data/消費分類關鍵字對照表.xlsx"
SESSION_TEMP_DIR = "temp/sessions"

# Google API 模組引入與相容性檢查
try:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload, MediaFileUpload
    HAS_GOOGLE_DRIVE = True
except ImportError:
    HAS_GOOGLE_DRIVE = False

def get_db_connection():
    """動態取得當前 Context 下對應的資料庫連線"""
    path = DB_PATH_VAR.get()
    
    # 確保父資料夾存在
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
        
    # timeout=30.0: 多協程併發寫入時，若遇 SQLite 寫入鎖，等待鎖釋放最長 30 秒，避免拋出 'database is locked' 錯誤
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化當前資料庫的資料表"""
    print(f"Initializing Database at: {DB_PATH_VAR.get()}...")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. 建立 PDF 密碼表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pdf_passwords (
        bank_name TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. 建立系統設定表 (用於安全儲存 API Key)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 3. 建立關鍵字對照快取表 (防止 Excel 鎖定卡死)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS keyword_rules (
        keyword TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 4. 建立消費明細表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_month TEXT NOT NULL,  -- YYYY-MM
        bank_name TEXT NOT NULL,
        card_date TEXT NOT NULL,   -- YYYY-MM-DD
        post_date TEXT NOT NULL,   -- YYYY-MM-DD
        detail TEXT NOT NULL,
        amount INTEGER NOT NULL,
        location TEXT NOT NULL,
        category TEXT NOT NULL
    )
    """)
    
    # 5. 建立預算管理表
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        amount INTEGER NOT NULL,
        bill_month TEXT NOT NULL,  -- YYYY-MM 或 'DEFAULT'
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, bill_month)
    )
    """)
    
    # 6. [NEW] 建立已掃描帳單雜湊對照表 (防禦重複匯入)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scanned_bills (
        filename TEXT PRIMARY KEY,
        file_hash TEXT NOT NULL,
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    
    # 初始化預設預算
    cursor.execute("SELECT COUNT(*) FROM budgets WHERE bill_month = 'DEFAULT'")
    if cursor.fetchone()[0] == 0:
        default_categories = ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"]
        for cat in default_categories:
            cursor.execute("INSERT INTO budgets (category, amount, bill_month) VALUES (?, ?, 'DEFAULT')", (cat, 5000))
        conn.commit()
    
    # --- 關鍵字對照表初始地端 Excel 導入 ---
    cursor.execute("SELECT COUNT(*) FROM keyword_rules")
    keyword_count = cursor.fetchone()[0]
    
    if keyword_count == 0 and os.path.exists(KEYWORD_EXCEL_PATH):
        print("Importing initial keywords from Excel to SQLite...")
        try:
            wb = openpyxl.load_workbook(KEYWORD_EXCEL_PATH, data_only=True)
            sheet = wb.active
            keyword_rows = []
            for i, row in enumerate(sheet.iter_rows(values_only=True)):
                if i == 0 or all(v is None for v in row):
                    continue
                keyword = row[0]
                category = row[1]
                if keyword and category:
                    keyword_rows.append((str(keyword).strip(), str(category).strip()))
            
            if keyword_rows:
                cursor.executemany("""
                INSERT OR REPLACE INTO keyword_rules (keyword, category)
                VALUES (?, ?)
                """, keyword_rows)
                conn.commit()
                print(f"Successfully cached {len(keyword_rows)} keywords in SQLite!")
        except Exception as e:
            print(f"Error caching keywords: {e}")
            
    # --- 刷卡明細歷史資料地端 Excel 導入 ---
    cursor.execute("SELECT COUNT(*) FROM transactions")
    count = cursor.fetchone()[0]
    
    if count == 0 and os.path.exists(EXCEL_PATH):
        print("Importing historical transactions from Excel...")
        try:
            wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
            if "總表" in wb.sheetnames:
                sheet = wb["總表"]
                history_rows = []
                for i, row in enumerate(sheet.iter_rows(values_only=True)):
                    if i == 0 or all(v is None for v in row):
                        continue
                    
                    bill_month_val = row[0]
                    bank_name = row[1]
                    card_date_val = row[2]
                    post_date_val = row[3]
                    detail = row[4]
                    amount = row[5]
                    location = row[6]
                    category = row[7]
                    
                    if bill_month_val is None or bank_name is None:
                        continue
                    
                    if isinstance(bill_month_val, datetime):
                        bill_month = bill_month_val.strftime("%Y-%m")
                    elif isinstance(bill_month_val, str) and len(bill_month_val) >= 7:
                        bill_month = bill_month_val[:7]
                    else:
                        bill_month = str(bill_month_val)
                        
                    if isinstance(card_date_val, datetime):
                        card_date = card_date_val.strftime("%Y-%m-%d")
                    else:
                        card_date = str(card_date_val)[:10] if card_date_val else ""
                        
                    if isinstance(post_date_val, datetime):
                        post_date = post_date_val.strftime("%Y-%m-%d")
                    else:
                        post_date = str(post_date_val)[:10] if post_date_val else ""
                    
                    try:
                        amount = int(float(amount))
                    except:
                        amount = 0
                        
                    history_rows.append((
                        bill_month, bank_name, card_date, post_date,
                        str(detail), amount, str(location), str(category)
                    ))
                
                if history_rows:
                    cursor.executemany("""
                    INSERT INTO transactions (
                        bill_month, bank_name, card_date, post_date, detail, amount, location, category
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, history_rows)
                    conn.commit()
                    print(f"Successfully imported {len(history_rows)} historical rows from Excel!")
        except Exception as e:
            print(f"Error importing historical data: {e}")
            
    conn.close()

# ==============================================================================
# 2. 雲端 Google Drive 引擎智慧同步機制
# ==============================================================================

def get_drive_service(access_token: str):
    """取得授權的 Google Drive API 服務實體"""
    if not HAS_GOOGLE_DRIVE:
        raise ImportError("缺少 Google API Python 套件，請執行 pip install -r requirements.txt")
    creds = Credentials(token=access_token)
    return build('drive', 'v3', credentials=creds)

def find_file_in_drive(service, filename: str):
    """在 Google Drive 搜尋指定檔名的檔案資訊"""
    query = f"name = '{filename}' and trashed = false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    files = results.get('files', [])
    return files[0] if files else None

def get_or_create_gdrive_folder(service, folder_name: str) -> str:
    """在雲端尋找或建立專屬的資料夾，傳回其 Folder ID"""
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
    files = results.get('files', [])
    if files:
        return files[0]['id']
    
    # 建立專屬資料夾
    file_metadata = {
        'name': folder_name,
        'mimeType': 'application/vnd.google-apps.folder'
    }
    file = service.files().create(body=file_metadata, fields='id').execute()
    print(f"[Cloud Engine] 成功於 Google Drive 建立資料夾「{folder_name}」")
    return file.get('id')

def sync_db_from_drive(access_token: str, user_id: str) -> str:
    """
    將使用者的 SQLite 資料庫自 Google Drive 同步下載至本地 Session 獨立目錄。
    若檔案不存在，則建立全新資料表並自動備份上傳至 Google Drive。
    """
    service = get_drive_service(access_token)
    db_filename = "card_statement_manager.db"
    
    # 建立該 Session 專屬的安全暫存目錄
    user_temp_dir = os.path.join(SESSION_TEMP_DIR, f"session_{user_id}")
    os.makedirs(user_temp_dir, exist_ok=True)
    temp_db_path = os.path.join(user_temp_dir, "billing.db")
    
    file_info = find_file_in_drive(service, db_filename)
    
    if file_info:
        # 下載雲端現有資料庫檔案
        file_id = file_info['id']
        request = service.files().get_media(fileId=file_id)
        fh = io.FileIO(temp_db_path, 'wb')
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()
        print(f"[Cloud Engine] 成功下載 Google Drive 資料庫 (File ID: {file_id})")
    else:
        # 雲端無檔案，建立並初始化全新暫存 SQLite 庫
        print("[Cloud Engine] 雲端尚無資料庫，正在初始化全新本地暫存庫...")
        if os.path.exists(temp_db_path):
            os.remove(temp_db_path)
            
        token = DB_PATH_VAR.set(temp_db_path)
        try:
            init_db()
        finally:
            DB_PATH_VAR.reset(token)
            
        # 立即將此初始化資料庫備份上傳至 Google Drive
        file_metadata = {'name': db_filename}
        media = MediaFileUpload(temp_db_path, mimetype='application/octet-stream')
        file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        print(f"[Cloud Engine] 成功上傳新初始化資料庫至 Google Drive (File ID: {file.get('id')})")
        
    return temp_db_path

def sync_db_to_drive(access_token: str, user_id: str):
    """將本地暫存資料庫內容安全回寫上傳至使用者的 Google Drive"""
    service = get_drive_service(access_token)
    db_filename = "card_statement_manager.db"
    user_temp_dir = os.path.join(SESSION_TEMP_DIR, f"session_{user_id}")
    temp_db_path = os.path.join(user_temp_dir, "billing.db")
    
    if not os.path.exists(temp_db_path):
        return
        
    file_info = find_file_in_drive(service, db_filename)
    if file_info:
        # 更新雲端檔案
        file_id = file_info['id']
        media = MediaFileUpload(temp_db_path, mimetype='application/octet-stream')
        service.files().update(fileId=file_id, media_body=media).execute()
        print(f"[Cloud Engine] 雲端資料庫已同步更新 (File ID: {file_id})")
    else:
        # 防禦雲端檔案遭手動移除，重新建立上傳
        file_metadata = {'name': db_filename}
        media = MediaFileUpload(temp_db_path, mimetype='application/octet-stream')
        file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        print(f"[Cloud Engine] 重新上傳備份資料庫 (File ID: {file.get('id')})")

def clean_session_db(user_id: str):
    """
    極高資安防禦：Session 登出或銷毀時，徹底抹除並刪除伺服器硬碟上的暫存 SQLite 檔案與目錄，
    實現 Zero Server Data Leakage 零存留。
    """
    user_temp_dir = os.path.join(SESSION_TEMP_DIR, f"session_{user_id}")
    if os.path.exists(user_temp_dir):
        try:
            shutil.rmtree(user_temp_dir)
            print(f"[Cloud Engine] 成功安全抹除 User {user_id} 暫存資料庫")
        except Exception as e:
            print(f"[Cloud Engine] 抹除暫存資料庫失敗: {e}")

def cleanup_expired_sessions(max_age_hours: float = 24.0):
    """
    清理過期或未登出即關閉瀏覽器的 Session 暫存資料夾。
    藉由比對資料夾的最後修改時間，將超過指定時間 (預設 24 小時) 未活動的 Session 徹底抹除，
    防止伺服器磁碟被舊資料塞滿，同時實踐 Zero-Data-Leakage 的隱私防線。
    """
    if not os.path.exists(SESSION_TEMP_DIR):
        return
        
    try:
        import time
        now = time.time()
        max_age_seconds = max_age_hours * 3600
        cleaned_count = 0
        
        for name in os.listdir(SESSION_TEMP_DIR):
            dir_path = os.path.join(SESSION_TEMP_DIR, name)
            if os.path.isdir(dir_path) and name.startswith("session_"):
                mtime = os.path.getmtime(dir_path)
                if now - mtime > max_age_seconds:
                    shutil.rmtree(dir_path)
                    cleaned_count += 1
                    
        if cleaned_count > 0:
            print(f"[Security Engine] 成功自動抹除並回收 {cleaned_count} 個過期 Session 暫存")
    except Exception as e:
        print(f"[Security Engine] 自動清理過期 Session 失敗: {e}")

# 初始化本地檔案資料庫
if __name__ == "__main__":
    init_db()
