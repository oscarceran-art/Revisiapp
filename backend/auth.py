"""
Simple username/password auth with per-user token tracking and admin controls.
Passwords are hashed with bcrypt. Sessions use signed JWT tokens.
"""
import os, uuid, hashlib, hmac, base64, json
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Header

# ── secrets ──────────────────────────────────────────────────────────────────
SECRET = "revisiapp-secret-key-change-in-prod-2024"   # used to sign session tokens
ADMIN_USERNAME = "oscar"                               # your admin account

# ── tiny password hashing (no bcrypt dep needed) ─────────────────────────────
def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    h = hmac.new(SECRET.encode(), (salt + password).encode(), hashlib.sha256).hexdigest()
    return f"{salt}:{h}"

_hash_password = hash_password

def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":", 1)
        expected = hmac.new(SECRET.encode(), (salt + password).encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(h, expected)
    except Exception:
        return False

# ── token (simple signed base64 payload) ─────────────────────────────────────
def _sign(payload: dict) -> str:
    data = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
    return f"{data}.{sig}"

def _verify_token(token: str) -> Optional[dict]:
    try:
        data, sig = token.rsplit(".", 1)
        expected = hmac.new(SECRET.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(data.encode()).decode())
        # Check expiry (7 days)
        if datetime.fromisoformat(payload["exp"]) < datetime.now(timezone.utc):
            return None
        return payload
    except Exception:
        return None

def create_token(user_id: str, username: str) -> str:
    return _sign({
        "user_id": user_id,
        "username": username,
        "exp": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
    })

# ── db helpers (imported lazily to avoid circular) ───────────────────────────
_db = None
def set_db(database):
    global _db
    _db = database

async def get_user_by_username(username: str) -> Optional[dict]:
    return await _db.users.find_one({"username": username}, {"_id": 0})

async def get_user_by_id(user_id: str) -> Optional[dict]:
    return await _db.users.find_one({"id": user_id}, {"_id": 0})

async def create_user(username: str, password: str, is_admin: bool = False) -> dict:
    existing = await get_user_by_username(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "password_hash": _hash_password(password),
        "is_admin": is_admin,
        "is_active": True,
        "token_limit_daily": 50000,       # tokens per day (0 = unlimited)
        "token_limit_weekly": 200000,
        "tokens_used_today": 0,
        "tokens_used_week": 0,
        "last_reset_daily": datetime.now(timezone.utc).isoformat(),
        "last_reset_weekly": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.users.insert_one(user.copy())
    return user

async def login_user(username: str, password: str) -> dict:
    user = await get_user_by_username(username)
    if not user or not _verify_password(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")
    # Update last login
    await _db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    token = create_token(user["id"], user["username"])
    return {"token": token, "user": {k: v for k, v in user.items() if k != "password_hash"}}

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = _verify_token(authorization[7:])
    if not payload:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    user = await get_user_by_id(payload["user_id"])
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account not found or disabled")
    return user

async def require_admin(authorization: Optional[str] = Header(None)) -> dict:
    user = await get_current_user(authorization)
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def reset_token_counters_if_needed(user: dict):
    """Reset daily/weekly counters if the period has elapsed."""
    now = datetime.now(timezone.utc)
    updates = {}
    last_daily = datetime.fromisoformat(user.get("last_reset_daily") or now.isoformat())
    if (now - last_daily).total_seconds() > 86400:
        updates["tokens_used_today"] = 0
        updates["last_reset_daily"] = now.isoformat()
    last_weekly = datetime.fromisoformat(user.get("last_reset_weekly") or now.isoformat())
    if (now - last_weekly).total_seconds() > 604800:
        updates["tokens_used_week"] = 0
        updates["last_reset_weekly"] = now.isoformat()
    if updates:
        await _db.users.update_one({"id": user["id"]}, {"$set": updates})
        user.update(updates)

async def check_and_charge_tokens(user: dict, estimated_tokens: int = 1000):
    """Check limits and deduct tokens. Raises 429 if over limit."""
    await reset_token_counters_if_needed(user)
    daily_limit = user.get("token_limit_daily", 0)
    weekly_limit = user.get("token_limit_weekly", 0)
    used_today = user.get("tokens_used_today", 0)
    used_week = user.get("tokens_used_week", 0)
    if daily_limit > 0 and used_today + estimated_tokens > daily_limit:
        raise HTTPException(status_code=429, detail=f"Daily token limit reached ({daily_limit:,} tokens). Resets tomorrow.")
    if weekly_limit > 0 and used_week + estimated_tokens > weekly_limit:
        raise HTTPException(status_code=429, detail=f"Weekly token limit reached ({weekly_limit:,} tokens). Resets next week.")
    await _db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"tokens_used_today": estimated_tokens, "tokens_used_week": estimated_tokens}}
    )
