import os
import shutil
import webbrowser
import sqlite3
import openpyxl
import json
import urllib.parse
import hashlib
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types

from database import (
    init_db, get_db_connection, EXCEL_PATH, KEYWORD_EXCEL_PATH,
    DB_PATH_VAR, sync_db_from_drive, sync_db_to_drive, clean_session_db,
    SESSION_TEMP_DIR, get_drive_service, get_or_create_gdrive_folder,
    cleanup_expired_sessions
)
from oauth import (
    get_google_auth_url, exchange_code_for_tokens, refresh_access_token,
    get_google_user_info, is_oauth_configured, encrypt_token, decrypt_token
)
from bill_extractor import extract_bill_data, check_pdf_encrypted
from backend.routers.reports import router as reports_router

app = FastAPI(title="AI-Powered Credit Card Billing Hub")
app.include_router(reports_router)

# ==============================================================================
# 🔴 資安與高併發架構：多租戶防衝突與 Session 動態資料庫掛載 Middleware
# ==============================================================================
@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    # 讀取 Google 登入 Session
    google_user_cookie = request.cookies.get("google_user")
    token = None
    
    if google_user_cookie:
        try:
            # 解碼 User 資訊
            user_data = json.loads(urllib.parse.unquote(google_user_cookie))
            user_id = user_data.get("id")
            access_token = user_data.get("access_token")
            
            temp_db_path = os.path.join(SESSION_TEMP_DIR, f"session_{user_id}", "billing.db")
            
            # 若伺服器重啟但 Cookie 尚在，自動重新下載備份
            if not os.path.exists(temp_db_path):
                # 嘗試以 Refresh Token 重新取得 Access Token (防禦逾期)
                encrypted_refresh = request.cookies.get("google_refresh_token")
                refresh_tok = decrypt_token(encrypted_refresh)
                if refresh_tok:
                    try:
                        access_token = refresh_access_token(refresh_tok)
                        user_data["access_token"] = access_token
                    except Exception as re_err:
                        print(f"Token refresh failed: {re_err}")
                        
                sync_db_from_drive(access_token, user_id)
                
            # 將此連線對應之 ContextVar 路換至雲端 Session SQLite 庫，確保併發安全
            token = DB_PATH_VAR.set(temp_db_path)
        except Exception as e:
            print(f"[Middleware] 還原雲端 Session 失敗，回退地端: {e}")
            token = DB_PATH_VAR.set("billing.db")
    else:
        # 預設為本地地端 SQLite 庫
        token = DB_PATH_VAR.set("billing.db")
        
    try:
        response = await call_next(request)
        
        # 如果是寫入操作，且為雲端硬碟模式，自動同步上傳更新至 Google Drive
        if google_user_cookie and request.method in ("POST", "PUT", "DELETE"):
            try:
                user_data = json.loads(urllib.parse.unquote(google_user_cookie))
                user_id = user_data.get("id")
                access_token = user_data.get("access_token")
                sync_db_to_drive(access_token, user_id)
            except Exception as sync_err:
                print(f"[Middleware] 異步上傳雲端資料庫失敗: {sync_err}")
                
        return response
    finally:
        # 必須還原路徑，防止污染 Context 資源池
        DB_PATH_VAR.reset(token)

# 在啟動時初始化本地資料庫並自動開啟瀏覽器
@app.on_event("startup")
def startup_event():
    init_db()
    # 執行過期與孤立 Session 磁碟垃圾清掃，確保 Zero Server Storage Leak
    cleanup_expired_sessions()
    try:
        webbrowser.open("http://127.0.0.1:8000")
    except Exception as e:
        print(f"Could not open browser: {e}")

class KeywordItem(BaseModel):
    keyword: str
    category: str

class APIKeyRequest(BaseModel):
    api_key: str

class PasswordItem(BaseModel):
    bank_name: str
    password: str

class BudgetUpdateItem(BaseModel):
    category: str
    amount: int
    bill_month: str = "DEFAULT"

class BudgetBatchRequest(BaseModel):
    bill_month: str = "DEFAULT"
    budgets: List[BudgetUpdateItem]

class TransactionItem(BaseModel):
    bill_month: str
    bank_name: str
    card_date: str
    post_date: str
    detail: str
    amount: int
    location: str
    category: str
    classify_status: Optional[str] = "keyword_matched"

class TransactionSaveRequest(BaseModel):
    items: List[TransactionItem]

# =====================================================
# 輔助背景任務
# =====================================================
def sync_keywords_to_excel_background(keyword: str, category: str):
    try:
        if not os.path.exists(KEYWORD_EXCEL_PATH):
            wb = openpyxl.Workbook()
            sheet = wb.active
            sheet.append(["關鍵字", "消費分類"])
        else:
            wb = openpyxl.load_workbook(KEYWORD_EXCEL_PATH)
            sheet = wb.active
        found = False
        for row in range(2, sheet.max_row + 1):
            if sheet.cell(row=row, column=1).value == keyword:
                sheet.cell(row=row, column=2).value = category
                found = True
                break
        if not found:
            sheet.append([keyword, category])
        wb.save(KEYWORD_EXCEL_PATH)
    except:
        pass

def sync_all_keywords_to_excel_background(rules: List[dict]):
    try:
        wb = openpyxl.Workbook()
        sheet = wb.active
        sheet.append(["關鍵字", "消費分類"])
        for r in rules:
            sheet.append([r["keyword"], r["category"]])
        wb.save(KEYWORD_EXCEL_PATH)
    except:
        pass

# ==============================================================================
# 🔴 後端 API 路由
# ==============================================================================

# --- 1. Google OAuth 2.0 登入、回呼與狀態路由 ---

@app.get("/api/auth/login")
def google_login():
    """引導跳轉至 Google 驗證授權頁面"""
    if not is_oauth_configured():
        raise HTTPException(status_code=400, detail="系統目前尚未配置 Google OAuth 憑證。請先參考 .env.example 於本機 .env 檔案中填寫 Client ID 與 Secret。")
    auth_url = get_google_auth_url()
    return RedirectResponse(url=auth_url)

@app.get("/api/auth/callback")
async def google_callback(code: str, response: Response, request: Request):
    """Google 驗證完成後的回呼解析端點"""
    try:
        tokens = exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        
        user_info = get_google_user_info(access_token)
        user_id = user_info.get("id")
        
        sync_db_from_drive(access_token, user_id)
        
        user_cookie_data = {
            "id": user_id,
            "name": user_info.get("name"),
            "email": user_info.get("email"),
            "picture": user_info.get("picture"),
            "access_token": access_token
        }
        encoded_user = urllib.parse.quote(json.dumps(user_cookie_data))
        
        # 動態偵測 SSL 加密狀態 (相容於以 HTTPS 運行，或是在反向代理 Nginx/Render/AWS 後端轉發的場景)
        is_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto", "http") == "https"
        
        response.set_cookie(
            key="google_user", 
            value=encoded_user,
            max_age=86400,
            samesite="lax",
            secure=is_secure
        )
        
        if refresh_token:
            encrypted_refresh = encrypt_token(refresh_token)
            response.set_cookie(
                key="google_refresh_token",
                value=encrypted_refresh,
                httponly=True,
                max_age=30 * 86400,
                samesite="lax",
                secure=is_secure
            )
            
        return RedirectResponse(url="/")
    except Exception as e:
        return RedirectResponse(url=f"/?auth_error={urllib.parse.quote(str(e))}")

@app.get("/api/auth/logout")
async def google_logout(request: Request, response: Response):
    """登出雲端硬碟模式，徹底抹除伺服器硬碟暫存資料，安全銷毀"""
    google_user_cookie = request.cookies.get("google_user")
    if google_user_cookie:
        try:
            user_data = json.loads(urllib.parse.unquote(google_user_cookie))
            user_id = user_data.get("id")
            clean_session_db(user_id)
        except Exception as e:
            print(f"[Logout] 抹除 Session 暫存失敗: {e}")
            
    is_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto", "http") == "https"
    response.delete_cookie("google_user", samesite="lax", secure=is_secure)
    response.delete_cookie("google_refresh_token", httponly=True, samesite="lax", secure=is_secure)
    return RedirectResponse(url="/")

@app.get("/api/auth/status")
def get_auth_status(request: Request):
    """取得當前使用者登入狀態，對前端遮蔽 access_token，維護資安"""
    google_user_cookie = request.cookies.get("google_user")
    is_configured = is_oauth_configured()
    
    if google_user_cookie:
        try:
            user_data = json.loads(urllib.parse.unquote(google_user_cookie))
            public_user = {
                "id": user_data.get("id"),
                "name": user_data.get("name"),
                "email": user_data.get("email"),
                "picture": user_data.get("picture")
            }
            return {"logged_in": True, "user": public_user, "oauth_available": is_configured}
        except Exception:
            pass
            
    return {"logged_in": False, "oauth_available": is_configured}

# --- 2. 地端資料夾掃描與雲端資料夾掃描端點 ---

class ScanFolderRequest(BaseModel):
    folder_path: str

def calculate_file_hash(filepath: str) -> str:
    """計算檔案的 SHA-256 雜湊，阻斷檔名不同但內容相同的重複帳單"""
    hash_sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

@app.post("/api/local/scan-folder")
async def scan_local_folder(req: ScanFolderRequest):
    """掃描本機指定資料夾下的全新 PDF 帳單並自動執行 AI 辨識"""
    folder = req.folder_path.strip().replace("\\", "/")
    if not os.path.exists(folder) or not os.path.isdir(folder):
        raise HTTPException(status_code=400, detail="指定的路徑非有效資料夾，請檢查路徑。")
        
    lower_path = folder.lower()
    systemic_dirs = ["c:/windows", "c:/program files", "c:/program data", "c:/users/public"]
    if any(lower_path == d or lower_path.startswith(d + "/") for d in systemic_dirs):
        raise HTTPException(status_code=400, detail="資安限制：系統禁止掃描作業系統或敏感目錄，請指定使用者專屬的帳單資料夾。")
        
    pdf_files = []
    try:
        for entry in os.scandir(folder):
            if entry.is_file() and entry.name.lower().endswith(".pdf"):
                pdf_files.append(entry.path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"讀取資料夾失敗: {str(e)}")
        
    if not pdf_files:
        return {"status": "no_new_bills", "message": "資料夾內無任何 PDF 帳單檔案。"}
        
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT filename, file_hash FROM scanned_bills")
    scanned_map = {row["filename"]: row["file_hash"] for row in c.fetchall()}
    conn.close()
    
    target_file = None
    target_hash = None
    
    for filepath in pdf_files:
        filename = os.path.basename(filepath)
        file_hash = calculate_file_hash(filepath)
        
        if filename not in scanned_map and file_hash not in scanned_map.values():
            target_file = filepath
            target_hash = file_hash
            break
            
    if not target_file:
        return {"status": "no_new_bills", "message": "✨ 掃描完成：所選本機資料夾中所有帳單均已匯入，無新帳單。"}
        
    filename = os.path.basename(target_file)
    
    try:
        is_encrypted = check_pdf_encrypted(target_file)
        password = None
        
        if is_encrypted:
            conn = get_db_connection()
            cursor = conn.cursor()
            bank_guess = "A銀行"
            if "B銀行" in filename: bank_guess = "B銀行"
            elif "C銀行" in filename: bank_guess = "C銀行"
            cursor.execute("SELECT password FROM pdf_passwords WHERE bank_name = ?", (bank_guess,))
            row = cursor.fetchone()
            conn.close()
            
            saved_pwd = row["password"] if row else None
            if not saved_pwd:
                return {
                    "status": "need_password", 
                    "message": f"本機帳單 {filename} 已加密，且尚未在設定中儲存密碼，請先至設定輸入該銀行密碼。",
                    "filename": filename
                }
            password = saved_pwd
            
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'")
        row = c.fetchone()
        conn.close()
        api_key = row[0] if row else None
        
        extracted = extract_bill_data(file_path=target_file, filename=filename, password=password, api_key=api_key)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT keyword, category FROM keyword_rules")
        kw_dict = {r[0]: r[1] for r in cursor.fetchall()}
        conn.close()
        
        for item in extracted["items"]:
            item["category"] = "其他"
            item["classify_status"] = "other"
            for kw, cat in kw_dict.items():
                if kw in item["detail"]:
                    item["category"] = cat
                    item["classify_status"] = "keyword_matched"
                    break
                    
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO scanned_bills (filename, file_hash) VALUES (?, ?)", (filename, target_hash))
        conn.commit()
        conn.close()
        
        return {"status": "success", **extracted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析本機檔案失敗: {str(e)}")

class CloudScanRequest(BaseModel):
    folder_name: str

@app.post("/api/cloud/scan-folder")
async def scan_cloud_folder(req: CloudScanRequest, request: Request):
    """雲端模式：掃描 Google Drive 指定資料夾下的新帳單並直接在記憶體中解析"""
    import io
    from googleapiclient.http import MediaIoBaseDownload
    google_user_cookie = request.cookies.get("google_user")
    if not google_user_cookie:
        raise HTTPException(status_code=401, detail="請先登入 Google 帳號以啟用雲端功能。")
        
    try:
        user = json.loads(urllib.parse.unquote(google_user_cookie))
        user_id = user.get("id")
        access_token = user.get("access_token")
        
        service = get_drive_service(access_token)
        folder_name = req.folder_name.strip()
        if not folder_name:
            raise HTTPException(status_code=400, detail="請指定有效的 Google Drive 資料夾名稱。")
        folder_id = get_or_create_gdrive_folder(service, folder_name)
        
        query = f"'{folder_id}' in parents and name contains '.pdf' and mimeType = 'application/pdf' and trashed = false"
        results = service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        files = results.get('files', [])
        
        if not files:
            return {"status": "no_new_bills", "message": f"雲端「{folder_name}」資料夾內無任何 PDF。請先手動上傳 PDF 至雲端該資料夾後重試！"}
            
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT filename, file_hash FROM scanned_bills")
        scanned_map = {row["filename"]: row["file_hash"] for row in c.fetchall()}
        conn.close()
        
        target_file = None
        target_hash = None
        
        user_temp_dir = os.path.join(SESSION_TEMP_DIR, f"session_{user_id}", "downloaded_bills")
        os.makedirs(user_temp_dir, exist_ok=True)
        
        for file in files:
            filename = file['name']
            file_id = file['id']
            local_path = os.path.join(user_temp_dir, filename)
            
            request_download = service.files().get_media(fileId=file_id)
            fh = io.FileIO(local_path, 'wb')
            downloader = MediaIoBaseDownload(fh, request_download)
            done = False
            while not done:
                downloader.next_chunk()
                
            file_hash = calculate_file_hash(local_path)
            
            if filename not in scanned_map and file_hash not in scanned_map.values():
                target_file = local_path
                target_hash = file_hash
                break
            else:
                if os.path.exists(local_path):
                    os.remove(local_path)
                    
        if not target_file:
            return {"status": "no_new_bills", "message": f"✨ 雲端掃描完成：雲端「{folder_name}」中的所有帳單均已匯入！"}
            
        filename = os.path.basename(target_file)
        
        is_encrypted = check_pdf_encrypted(target_file)
        password = None
        if is_encrypted:
            conn = get_db_connection()
            cursor = conn.cursor()
            bank_guess = "A銀行"
            if "B銀行" in filename: bank_guess = "B銀行"
            elif "C銀行" in filename: bank_guess = "C銀行"
            cursor.execute("SELECT password FROM pdf_passwords WHERE bank_name = ?", (bank_guess,))
            row = cursor.fetchone()
            conn.close()
            saved_pwd = row["password"] if row else None
            if not saved_pwd:
                if os.path.exists(target_file): os.remove(target_file)
                return {
                    "status": "need_password",
                    "message": f"雲端帳單 {filename} 已加密，且尚未在設定中儲存密碼，請先至設定輸入該銀行密碼。",
                    "filename": filename
                }
            password = saved_pwd
            
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'")
        row = c.fetchone()
        conn.close()
        api_key = row[0] if row else None
        
        extracted = extract_bill_data(file_path=target_file, filename=filename, password=password, api_key=api_key)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT keyword, category FROM keyword_rules")
        kw_dict = {r[0]: r[1] for r in cursor.fetchall()}
        conn.close()
        
        for item in extracted["items"]:
            item["category"] = "其他"
            item["classify_status"] = "other"
            for kw, cat in kw_dict.items():
                if kw in item["detail"]:
                    item["category"] = cat
                    item["classify_status"] = "keyword_matched"
                    break
                    
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO scanned_bills (filename, file_hash) VALUES (?, ?)", (filename, target_hash))
        conn.commit()
        conn.close()
        
        if os.path.exists(target_file):
            os.remove(target_file)
            
        return {"status": "success", **extracted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"雲端帳單掃描失敗: {str(e)}")

# --- 3. 原有業務 API 路由 ---

@app.get("/api/keywords")
def get_keywords():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT keyword, category FROM keyword_rules")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/keywords")
def add_keyword(item: KeywordItem, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO keyword_rules (keyword, category, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (item.keyword, item.category))
    conn.commit()
    conn.close()
    background_tasks.add_task(sync_keywords_to_excel_background, item.keyword, item.category)
    return {"status": "success", "message": "已更新關鍵字規則"}

@app.delete("/api/keywords/{keyword}")
def delete_keyword(keyword: str, background_tasks: BackgroundTasks):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM keyword_rules WHERE keyword = ?", (keyword,))
    conn.commit()
    cursor.execute("SELECT keyword, category FROM keyword_rules")
    all_rules = [{"keyword": r["keyword"], "category": r["category"]} for r in cursor.fetchall()]
    conn.close()
    background_tasks.add_task(sync_all_keywords_to_excel_background, all_rules)
    return {"status": "success", "message": "已刪除規則"}

# 批次上傳與修正關鍵字對照表 Excel
@app.post("/api/keywords/batch")
async def batch_upload_keywords(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    temp_dir = "temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # 1. 解析上傳的對照表 Excel
        wb = openpyxl.load_workbook(temp_file_path, data_only=True)
        sheet = wb.active
        
        imported_rules = []
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0 or all(v is None for v in row):
                continue
            keyword = row[0]
            category = row[1]
            if keyword and category:
                # 寫入 SQLite
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("INSERT OR REPLACE INTO keyword_rules (keyword, category, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", (str(keyword).strip(), str(category).strip()))
                conn.commit()
                conn.close()
                imported_rules.append({"keyword": str(keyword).strip(), "category": str(category).strip()})
        
        # 2. 將所有最新對照表同步回 Excel
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT keyword, category FROM keyword_rules")
        all_rules = [{"keyword": r["keyword"], "category": r["category"]} for r in cursor.fetchall()]
        conn.close()
        
        background_tasks.add_task(sync_all_keywords_to_excel_background, all_rules)
        
        return {"status": "success", "message": f"成功批次匯入 {len(imported_rules)} 筆關鍵字分類規則！", "imported_count": len(imported_rules)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析 Excel 失敗: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except:
                pass

@app.post("/api/settings/apikey")
def save_apikey(req: APIKeyRequest):
    return {"status": "success", "message": "目前以免金鑰模式運行，設定已停用。"}

@app.get("/api/summary")
def get_summary():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions ORDER BY bill_month DESC, card_date DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/pdf-passwords")
def get_passwords():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT bank_name, password, updated_at FROM pdf_passwords")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/pdf-passwords")
def save_password(item: PasswordItem):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO pdf_passwords (bank_name, password, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(bank_name) DO UPDATE SET password=excluded.password, updated_at=CURRENT_TIMESTAMP", (item.bank_name, item.password))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.delete("/api/pdf-passwords/{bank_name}")
def delete_password(bank_name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM pdf_passwords WHERE bank_name = ?", (bank_name,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/budgets")
def get_budgets(bill_month: str = "DEFAULT"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, amount FROM budgets WHERE bill_month = 'DEFAULT'")
    defaults = {r["category"]: r["amount"] for r in cursor.fetchall()}
    if bill_month != "DEFAULT":
        cursor.execute("SELECT category, amount FROM budgets WHERE bill_month = ?", (bill_month,))
        for r in cursor.fetchall():
            defaults[r["category"]] = r["amount"]
    conn.close()
    return [{"category": k, "amount": v} for k, v in defaults.items()]

@app.post("/api/budgets/batch")
def save_budgets_batch(req: BudgetBatchRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    for b in req.budgets:
        cursor.execute("INSERT INTO budgets (category, amount, bill_month, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(category, bill_month) DO UPDATE SET amount=excluded.amount, updated_at=CURRENT_TIMESTAMP", (b.category, b.amount, req.bill_month))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"已更新 {req.bill_month} 的預算配置"}

@app.post("/api/analyze-bill")
async def analyze_bill(file: UploadFile = File(...), password: Optional[str] = Form(None)):
    temp_file = os.path.join("temp", file.filename)
    os.makedirs("temp", exist_ok=True)
    with open(temp_file, "wb") as f:
        shutil.copyfileobj(file.file, f)
    try:
        is_encrypted = check_pdf_encrypted(temp_file)
        if is_encrypted and not password:
            return JSONResponse(content={"status": "need_password", "message": "PDF 已加密"})
        # 檢索 API Key (如果有的話)
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'")
        row = c.fetchone()
        conn.close()
        api_key = row[0] if row else None

        extracted = extract_bill_data(file_path=temp_file, filename=file.filename, password=password, api_key=api_key)
        # 本地分類邏輯
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT keyword, category FROM keyword_rules")
        kw_dict = {r[0]: r[1] for r in cursor.fetchall()}
        conn.close()
        for item in extracted["items"]:
            item["category"] = "其他"
            item["classify_status"] = "other"
            for kw, cat in kw_dict.items():
                if kw in item["detail"]:
                    item["category"] = cat
                    item["classify_status"] = "keyword_matched"
                    break
        return {"status": "success", **extracted}
    finally:
        if os.path.exists(temp_file): os.remove(temp_file)

@app.post("/api/save-transactions")
def save_transactions(req: TransactionSaveRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    for item in req.items:
        cursor.execute("INSERT INTO transactions (bill_month, bank_name, card_date, post_date, detail, amount, location, category) VALUES (?,?,?,?,?,?,?,?)", (item.bill_month, item.bank_name, item.card_date, item.post_date, item.detail, item.amount, item.location, item.category))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "儲存成功"}

@app.delete("/api/transactions/month/{year_month}")
def delete_month(year_month: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE bill_month = ?", (year_month,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": f"已刪除 {year_month} 資料"}

# =====================================================
# AI 財務顧問 API (Final Optimized)
# =====================================================
class AIChatRequest(BaseModel):
    items: List[TransactionItem]
    budgets: List[BudgetUpdateItem] = []
    query: Optional[str] = None
    history: Optional[List[dict]] = []

@app.post("/api/ai-advisor/chat")
async def chat_with_advisor(req: AIChatRequest):
    # 1. 基礎統計與多維度交叉掃描
    cat_spent = {}
    total_spent = 0
    banks = set()
    large_txs = []
    uber_count = 0
    uber_amount = 0
    grocery_count = 0
    grocery_amount = 0
    
    for item in req.items:
        cat_spent[item.category] = cat_spent.get(item.category, 0) + item.amount
        total_spent += item.amount
        if item.bank_name:
            banks.add(item.bank_name)
        if item.amount >= 3000:
            large_txs.append(item)
            
        # 掃描特定商家消費特徵
        detail_upper = item.detail.upper()
        if any(x in detail_upper for x in ["UBER", "FOODPANDA", "外送", "EATS", "CAMA", "STARBUCKS", "星巴克"]):
            uber_count += 1
            uber_amount += item.amount
        if any(x in detail_upper for x in ["全聯", "家樂福", "好市多", "COSTCO", "RT-MART", "大潤發", "愛買"]):
            grocery_count += 1
            grocery_amount += item.amount
 
    # 2. 預算對照與盈缺計算
    budget_map = {b.category: b.amount for b in req.budgets}
    total_budget = sum(budget_map.values())
    
    over_budget = []
    under_budget = []
    analysis_lines = []
    total_overspent = 0
    
    for cat in ["購物", "餐飲", "休閒旅遊", "交通運輸", "辦公用品", "醫療/健康", "其他"]:
        spent = cat_spent.get(cat, 0)
        limit = budget_map.get(cat, 0)
        
        # 決定分類超額/正常狀態
        if limit > 0:
            if spent > limit:
                diff = spent - limit
                status = f"⚠️ 超支 NT$ {diff:,}"
                over_budget.append((cat, spent, limit, diff))
                total_overspent += diff
            elif spent < limit * 0.5:
                status = "🟢 盈餘偏高 (使用率 < 50%)"
                under_budget.append((cat, spent, limit, limit - spent))
            else:
                status = "✅ 預算正常"
        else:
            status = "ℹ️ 未設預算"
            
        analysis_lines.append(f"- **{cat}**：實際 **NT$ {spent:,}** / 預算 **NT$ {limit:,}** ({status})")

    # 3. 智慧型一秒簡化摘要與狀態
    if over_budget:
        over_cats_str = "、".join([x[0] for x in over_budget])
        brief_summary = f"🚨 財務警報：整體預算使用率達 {(total_spent / total_budget * 100) if total_budget > 0 else 100:.1f}%，其中「{over_cats_str}」項目已累計超支 NT$ {total_overspent:,}！"
        brief_status = "alert"
    elif large_txs:
        brief_summary = f"⚠️ 消費提醒：本月支出皆在預算內，但偵測到 {len(large_txs)} 筆單筆大於 NT$ 3,000 的高額消費，建議適度檢視其必要性。"
        brief_status = "warning"
    else:
        usage = (total_spent / total_budget * 100) if total_budget > 0 else 0
        brief_summary = f"🟢 財務優異：本期預算管理完美！各項分類支出均在規劃內，整體預算使用率僅 {usage:.1f}%，理財紀律十分卓越。"
        brief_status = "success"

    # 4. 生成極為美觀、排版極致清晰、富有建設性的 Markdown 報告
    report_lines = []
    report_lines.append("### 🧠 AI 智慧財務與消費結構分析報告 (本地智慧核心)")
    report_lines.append(f"> **當前診斷結論**：{brief_summary}")
    report_lines.append("---")
    
    report_lines.append("### 📊 消費與預算執行概況")
    report_lines.append(f"* **交易總額度**：本期消費共計 **{len(req.items)}** 筆交易，累計刷卡金額為 **NT$ {total_spent:,}**。")
    if total_budget > 0:
        usage_rate = (total_spent / total_budget * 100)
        report_lines.append(f"* **預算覆蓋率**：已規劃預算總額 **NT$ {total_budget:,}**，整體預算使用率達 **{usage_rate:.1f}%**。")
    report_lines.append("\n#### 🔍 各分類預算使用明細：")
    report_lines.extend(analysis_lines)
    report_lines.append("---")
    
    # 消費異常與大額提示
    report_lines.append("### 🚨 消費預警與結構審查")
    if over_budget:
        report_lines.append("#### 🔴 預算超支項目警告：")
        for cat, spent, limit, diff in over_budget:
            report_lines.append(f"* **「{cat}」超額支用**：實際支出已達 **NT$ {spent:,}**，超出原定預算限額 **NT$ {limit:,}**（超額達 **{spent/limit*100-100:.1f}%**）。建議立即啟動支出管制。")
    else:
        report_lines.append("* **🟢 預算管控極佳**：本期無任何消費分類超出預算紅線，表現優異！")
        
    if large_txs:
        report_lines.append(f"\n#### 🔍 偵測到 {len(large_txs)} 筆大額交易（單筆 NT$ 3,000 以上）：")
        for idx, tx in enumerate(large_txs, 1):
            report_lines.append(f"  * **{tx.card_date}** | **{tx.bank_name}** | **{tx.detail}** | **NT$ {tx.amount:,}**（分類：{tx.category}）")
        report_lines.append("> 💡 *建議：請針對上述大額交易進行必要性回溯，確認是否為衝動消費，或考慮使用信用卡分期以緩和單月現金流壓力。*")
    else:
        report_lines.append("* **🟢 交易平穩度高**：本期無任何高於 NT$ 3,000 的大額非預期交易。")
    report_lines.append("---")
    
    # 建設性省錢建議
    report_lines.append("### 💡 專屬智慧省錢與資產優化建議")
    advice_idx = 1
    
    if uber_amount > 0:
        uber_saving = int(uber_amount * 0.15)
        report_lines.append(f"#### {advice_idx}. 🛵 外送平台與便利生活調控：")
        report_lines.append(f"* 本期外送及生活便利類消費共 **{uber_count}** 筆，累計金額達 **NT$ {uber_amount:,}**。")
        report_lines.append(f"* **優化建議**：外送平台溢價與服務費通常高達 15%~20%。建議下月限定外送次數，或考慮親自取餐。若能減少 30% 外送，每月可直接節省約 **NT$ {uber_saving:,}** 的非必要開銷！")
        advice_idx += 1
        
    if grocery_amount > 0:
        report_lines.append(f"#### {advice_idx}. 🛒 量販超市採購回饋最大化：")
        report_lines.append(f"* 本期在全聯、好市多等超市量販累計消費 **{grocery_count}** 筆，金額達 **NT$ {grocery_amount:,}**。")
        report_lines.append(f"* **優化建議**：日常用品採買屬於剛性需求，建議固定在週末列出採購清單進行批次購買以防衝動消費，並搭配對應的超市聯名卡或行動支付（如 PX Pay / COSTCO 聯名卡）賺取 5% 以上的高額點數回饋。")
        advice_idx += 1
        
    if len(banks) > 1:
        report_lines.append(f"#### {advice_idx}. 💳 跨行多卡繳費管理優化：")
        report_lines.append(f"* 本期消費涉及 **{len(banks)} 家不同的發卡銀行**（{', '.join(banks)}）。")
        report_lines.append(f"* **優化建議**：多張卡片容易導致帳單繳款日分散、資金調度繁瑣。建議將消費集中在 1-2 張主力回饋卡（如現金回饋神卡），並設定數位銀行帳戶自動轉帳代繳帳單，既能累積單一銀行的刷卡哩程/信用，又能防範忘記繳款導致滯納金。")
        advice_idx += 1
        
    if under_budget:
        report_lines.append(f"#### {advice_idx}. 🔄 預算資金動態再調配 (Reallocation)：")
        cats_to_realloc = "、".join([x[0] for x in under_budget[:2]])
        report_lines.append(f"* 偵測到您的「{cats_to_realloc}」項目預算使用率極低，目前尚有大額盈餘。")
        report_lines.append(f"* **優化建議**：建議在下月調整預算分配，將這部分閒置預算額度挪移至經常超支的熱門項目（如餐飲或購物），使整體的預算規劃更符合實際消費慣性。")
        advice_idx += 1

    if advice_idx == 1:
        report_lines.append("#### 1. 🌱 持續保持優異理財紀律：")
        report_lines.append("* 目前您的消費結構非常完美，建議繼續維持目前的記帳與預算執行習慣。")
        report_lines.append("#### 2. 📈 啟動儲蓄再配置：")
        report_lines.append("* 因本期有大額盈餘，建議將未支用的盈餘資金自動轉入高利活存或定存帳戶，以利複利累積您的第一桶金。")

    report = "\n".join(report_lines)

    # 檢索 API Key (如果有的話)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT setting_value FROM system_settings WHERE setting_key = 'gemini_api_key'")
    row = c.fetchone()
    conn.close()
    api_key = row[0] if row else None

    # 不論有無金鑰，均可回傳包含一秒簡化摘要的精緻 JSON 格式，完全保證 No-API-KEY 狀態的高階運作！
    if not api_key:
        return {
            "status": "success", 
            "response": report, 
            "brief_summary": brief_summary,
            "brief_status": brief_status,
            "is_mock": True
        }

    # 真實 API 模式 (雖然也以本地高解析建議為主，但呼叫 Gemini 進行語言修飾，且同時附帶 brief_summary)
    client = genai.Client(api_key=api_key)
    prompt = f"請將以下針對消費明細與預算的分析報告進行美化、修飾，使其文字版面更為大氣、精巧、具備極高可讀性，並請直接維持原有的 Markdown 標題結構。\n\n分析數據報告：\n{report}"
    try:
        response = client.models.generate_content(model='gemini-1.5-flash', contents=[prompt])
        return {
            "status": "success", 
            "response": response.text, 
            "brief_summary": brief_summary,
            "brief_status": brief_status,
            "is_mock": False
        }
    except:
        return {
            "status": "success", 
            "response": report, 
            "brief_summary": brief_summary,
            "brief_status": brief_status,
            "is_mock": True
        }

# 靜態文件
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")
@app.get("/")
def read_root(): return FileResponse("index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
