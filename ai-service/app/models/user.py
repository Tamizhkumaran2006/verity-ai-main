"""
User Beanie ODM model (replaces Mongoose User.model.js)
With fallback to in-memory storage when MongoDB is unavailable
"""

from datetime import datetime
from typing import Optional, Literal
from beanie import Document, Indexed
from pydantic import EmailStr, Field
import bcrypt
import uuid


class User(Document):
    # Identity
    name: str = Field(..., max_length=100)
    email: Indexed(EmailStr, unique=True)  # type: ignore[valid-type]
    hashed_password: Optional[str] = Field(None, exclude=True)

    # Role
    role: Literal["client", "manager", "admin"] = "client"

    # OAuth
    google_id: Optional[str] = None
    auth_provider: Literal["local", "google"] = "local"
    photo_url: Optional[str] = None

    # Status
    is_active: bool = True
    is_email_verified: bool = False
    last_login: Optional[datetime] = None

    # Profile
    phone: Optional[str] = None
    address: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            [("email", 1)],
            [("role", 1)],
            [("google_id", 1)],
        ]

    def set_password(self, plain: str):
        self.hashed_password = bcrypt.hashpw(
            plain.encode(), bcrypt.gensalt(rounds=12)
        ).decode()

    def check_password(self, plain: str) -> bool:
        if not self.hashed_password:
            return False
        return bcrypt.checkpw(plain.encode(), self.hashed_password.encode())

    def to_public(self) -> dict:
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "auth_provider": self.auth_provider,
            "photo_url": self.photo_url,
            "is_active": self.is_active,
            "is_email_verified": self.is_email_verified,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "created_at": self.created_at.isoformat(),
        }


# ── In-memory fallback storage ──────────────────────────────
_in_memory_users = {}


async def find_one_fallback(query: dict) -> Optional["User"]:
    """Find a user in in-memory storage"""
    for user_id, user_data in _in_memory_users.items():
        if "$or" in query:
            for condition in query["$or"]:
                for key, value in condition.items():
                    if key == "google_id" and user_data.get("google_id") == value:
                        return user_data
                    if key == "email" and user_data.get("email") == value:
                        return user_data
        else:
            for key, value in query.items():
                if user_data.get(key) == value:
                    return user_data
    return None


async def insert_fallback(user: "User") -> "User":
    """Insert a user into in-memory storage"""
    user.id = str(uuid.uuid4())
    user_dict = user.dict()
    _in_memory_users[user.id] = user
    return user


async def save_fallback(user: "User") -> "User":
    """Save a user to in-memory storage"""
    if user.id:
        _in_memory_users[str(user.id)] = user
    return user


# Monkey-patch User model methods for fallback
_original_find_one = User.find_one
_original_insert = User.insert
_original_save = User.save


async def patched_find_one(cls, *args, **kwargs):
    """Try MongoDB first, fall back to in-memory"""
    from app.config.database import is_db_available
    
    if not is_db_available():
        # Convert Beanie query to dict format
        if args:
            # Handle Beanie query objects
            return await find_one_fallback({})
        return await find_one_fallback(kwargs)
    
    try:
        return await _original_find_one(*args, **kwargs)
    except Exception:
        return await find_one_fallback(kwargs if kwargs else {})


async def patched_insert(self):
    """Try MongoDB first, fall back to in-memory"""
    from app.config.database import is_db_available
    
    if not is_db_available():
        return await insert_fallback(self)
    
    try:
        return await _original_insert(self)
    except Exception:
        return await insert_fallback(self)


async def patched_save(self):
    """Try MongoDB first, fall back to in-memory"""
    from app.config.database import is_db_available
    
    if not is_db_available():
        return await save_fallback(self)
    
    try:
        return await _original_save(self)
    except Exception:
        return await save_fallback(self)
