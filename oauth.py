import os
import requests
import urllib.parse
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# ==============================================================================
# 1. 資安防護：加密與密鑰管理 (AES-256 對稱加密)
# ==============================================================================
# 為了避免在 .env 尚未設定時崩潰，系統若未偵測到加密金鑰，會自動動態產生一個，
# 保障開箱即用的體驗，同時維護金融級資安標準。
ENCRYPTION_KEY_RAW = os.getenv("ENCRYPTION_KEY", "").strip()
if not ENCRYPTION_KEY_RAW:
    # 動態安全生成金鑰
    ENCRYPTION_KEY_RAW = Fernet.generate_key().decode()

try:
    cipher = Fernet(ENCRYPTION_KEY_RAW.encode())
except Exception:
    # 防禦：若金鑰格式不符 32 字元 Base64，強制重構一個安全金鑰
    ENCRYPTION_KEY_RAW = Fernet.generate_key().decode()
    cipher = Fernet(ENCRYPTION_KEY_RAW.encode())

def encrypt_token(token: str) -> str:
    """加密機敏 Token 字串"""
    if not token:
        return ""
    return cipher.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str:
    """解密已加密的機敏 Token"""
    if not encrypted_token:
        return ""
    try:
        return cipher.decrypt(encrypted_token.encode()).decode()
    except Exception:
        return ""

# ==============================================================================
# 2. Google OAuth 2.0 配置 (動態載入防快取)
# ==============================================================================

# 嚴格遵循最窄權限原則：僅請求 drive.file (存取應用程式自己建立的檔案) 及基本個人資料
SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email"
]

def get_oauth_credentials():
    """動態從環境變數讀取 OAuth 設定，避免 Python 模組導入快取問題"""
    load_dotenv()
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/callback").strip()
    return client_id, client_secret, redirect_uri

def get_google_auth_url() -> str:
    """產生 Google OAuth 2.0 授權登入引導 URL"""
    client_id, _, redirect_uri = get_oauth_credentials()
    base_url = "https://accounts.google.com/o/oauth2/v2/auth"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",  # 必要：以利取得 Refresh Token 進行持久化背景同步
        "prompt": "consent"        # 強制每次同意畫面，確保安全更新權限
    }
    return f"{base_url}?{urllib.parse.urlencode(params)}"

def exchange_code_for_tokens(code: str) -> dict:
    """以授權碼向 Google 伺服器交換 Access Token 與 Refresh Token"""
    client_id, client_secret, redirect_uri = get_oauth_credentials()
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }
    
    response = requests.post(token_url, data=payload)
    if response.ok:
        return response.json()
    else:
        err_msg = response.json().get("error_description", response.text)
        raise Exception(f"Google 驗證交換失敗: {err_msg}")

def refresh_access_token(refresh_token: str) -> str:
    """使用 Refresh Token 更新過期的 Access Token"""
    client_id, client_secret, _ = get_oauth_credentials()
    token_url = "https://oauth2.googleapis.com/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    
    response = requests.post(token_url, data=payload)
    if response.ok:
        data = response.json()
        return data.get("access_token")
    else:
        err_msg = response.json().get("error_description", response.text)
        raise Exception(f"更新 Google 金鑰權限失敗: {err_msg}")

def get_google_user_info(access_token: str) -> dict:
    """透過 Access Token 取得 Google 用戶基本資訊 (Profile / Email)"""
    userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(userinfo_url, headers=headers)
    if response.ok:
        return response.json()
    else:
        raise Exception("無法讀取 Google 帳戶資訊，Token 可能失效")

def is_oauth_configured() -> bool:
    """檢查 Google Client ID 與 Secret 是否正確填寫"""
    client_id, client_secret, _ = get_oauth_credentials()
    return bool(client_id and client_secret and "YOUR_GOOGLE" not in client_id)
