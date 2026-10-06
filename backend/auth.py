"""
auth.py — JWT token creation/validation + password hashing.
"""
import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt as _bcrypt

SECRET_KEY = os.getenv("JWT_SECRET", "fix-with-ai-secret-change-in-prod-2024")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Raises JWTError if invalid or expired."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
