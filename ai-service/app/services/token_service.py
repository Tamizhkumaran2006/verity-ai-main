"""
JWT token service — replaces token.service.js
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt, JWTError
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET = os.getenv("JWT_SECRET", "change_me_in_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", 7))

bearer_scheme = HTTPBearer(auto_error=False)


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def build_token_response(user) -> dict:
    token = create_token(str(user.id), user.role)
    return {
        "token": token,
        "token_type": "Bearer",
        "expires_in": JWT_EXPIRES_DAYS * 86400,
        "user": user.to_public(),
    }


# ── FastAPI dependency ──────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
):
    from app.models.user import User

    if not credentials:
        raise HTTPException(status_code=401, detail="No token provided.")

    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated.")

    return user


async def require_manager(user=Depends(get_current_user)):
    if user.role not in ("manager", "admin"):
        raise HTTPException(status_code=403, detail="Manager role required.")
    return user
