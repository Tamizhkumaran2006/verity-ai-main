"""
Auth router — replaces auth.controller.js + auth.routes.js

POST /api/auth/register   — email/password signup
POST /api/auth/login      — email/password login
POST /api/auth/google     — Google One-Tap / OAuth (verifies id_token via google-auth)
GET  /api/auth/me         — get own profile
PATCH /api/auth/me        — update own profile
"""

import os
import logging
from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from app.models.user import User
from app.services.token_service import build_token_response, get_current_user
from app.config.database import is_db_available

logger = logging.getLogger("verity-ai.auth")
router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "608687632539-2o6insdcvhdb2i1bvq6k6mcqart8rfq3.apps.googleusercontent.com",
)

# In-memory user storage for when MongoDB is unavailable
_in_memory_users = {}


# ── Schemas ──────────────────────────────────────────────────

class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "client"


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginBody(BaseModel):
    id_token: str                    # Google ID token from frontend
    role: Optional[str] = "client"


class UpdateProfileBody(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None


# ── Helpers: Google token verification ───────────────────────

def _verify_google_id_token(id_token: str) -> dict:
    """
    Verify a Google ID token using google-auth.
    No Firebase or service account needed — only the Client ID.
    Returns the decoded token payload dict.
    """
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    try:
        info = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
        return info
    except ValueError as e:
        logger.warning(f"Google token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token.")


# ── In-memory user helpers ──────────────────────────────────

def _find_user_in_memory(email: Optional[str] = None, google_id: Optional[str] = None) -> Optional[dict]:
    """Find user in in-memory storage"""
    for user_id, user_data in _in_memory_users.items():
        if email and user_data.get("email") == email:
            return user_data
        if google_id and user_data.get("google_id") == google_id:
            return user_data
    return None


def _create_user_in_memory(name: str, email: str, role: str, password: Optional[str] = None, google_id: Optional[str] = None, photo_url: Optional[str] = None) -> dict:
    """Create a user in in-memory storage"""
    import bcrypt
    
    user_id = str(uuid.uuid4())
    hashed_password = None
    if password:
        hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()
    
    user = {
        "id": user_id,
        "name": name,
        "email": email,
        "hashed_password": hashed_password,
        "role": role,
        "google_id": google_id,
        "auth_provider": "google" if google_id else "local",
        "photo_url": photo_url,
        "is_active": True,
        "is_email_verified": bool(google_id),
        "last_login": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    _in_memory_users[user_id] = user
    return user


def _check_password(hashed: Optional[str], plain: str) -> bool:
    """Check password against hash"""
    import bcrypt
    if not hashed:
        return False
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ── POST /api/auth/register ──────────────────────────────────

@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    try:
        existing = await User.find_one(User.email == body.email)
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")

        role = body.role if body.role in ("client", "manager") else "client"
        user = User(
            name=body.name,
            email=body.email,
            role=role,
            auth_provider="local",
        )
        user.set_password(body.password)
        await user.insert()
        logger.info(f"New user registered: {body.email} [{role}]")

        return {
            "success": True,
            "message": "Registration successful",
            **build_token_response(user),
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to in-memory storage
        logger.warning(f"Database error during registration, using in-memory storage: {e}")
        
        existing = _find_user_in_memory(email=body.email)
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered.")
        
        role = body.role if body.role in ("client", "manager") else "client"
        user = _create_user_in_memory(
            name=body.name,
            email=body.email,
            role=role,
            password=body.password,
        )
        logger.info(f"New user registered (in-memory): {body.email} [{role}]")
        
        # Create a mock user object for token generation
        class MockUser:
            def __init__(self, data):
                self.id = data["id"]
                self.email = data["email"]
                self.name = data["name"]
                self.role = data["role"]
                self.photo_url = data.get("photo_url")
                self.is_email_verified = data.get("is_email_verified", False)
                self.last_login = data.get("last_login")
                self.created_at = data.get("created_at")
            
            def to_public(self):
                return {
                    "id": self.id,
                    "name": self.name,
                    "email": self.email,
                    "role": self.role,
                    "auth_provider": "local",
                    "photo_url": self.photo_url,
                    "is_active": True,
                    "is_email_verified": self.is_email_verified,
                    "last_login": self.last_login,
                    "created_at": self.created_at,
                }
        
        mock_user = MockUser(user)
        return {
            "success": True,
            "message": "Registration successful",
            **build_token_response(mock_user),
        }


# ── POST /api/auth/login ─────────────────────────────────────

@router.post("/login")
async def login(body: LoginBody):
    try:
        user = await User.find_one(
            User.email == body.email,
            User.auth_provider == "local",
        )
        if not user or not user.check_password(body.password):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account deactivated.")

        user.last_login = datetime.utcnow()
        await user.save()

        return {
            "success": True,
            "message": "Login successful",
            **build_token_response(user),
        }
    except HTTPException:
        raise
    except Exception as e:
        # Fallback to in-memory storage
        logger.warning(f"Database error during login, using in-memory storage: {e}")
        
        user = _find_user_in_memory(email=body.email)
        if not user or not _check_password(user.get("hashed_password"), body.password):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        
        user["last_login"] = datetime.utcnow().isoformat()
        
        class MockUser:
            def __init__(self, data):
                self.id = data["id"]
                self.email = data["email"]
                self.name = data["name"]
                self.role = data["role"]
                self.photo_url = data.get("photo_url")
                self.is_email_verified = data.get("is_email_verified", False)
                self.last_login = data.get("last_login")
                self.created_at = data.get("created_at")
            
            def to_public(self):
                return {
                    "id": self.id,
                    "name": self.name,
                    "email": self.email,
                    "role": self.role,
                    "auth_provider": "local",
                    "photo_url": self.photo_url,
                    "is_active": True,
                    "is_email_verified": self.is_email_verified,
                    "last_login": self.last_login,
                    "created_at": self.created_at,
                }
        
        mock_user = MockUser(user)
        return {
            "success": True,
            "message": "Login successful",
            **build_token_response(mock_user),
        }


# ── POST /api/auth/google ─────────────────────────────────────

@router.post("/google")
async def google_login(body: GoogleLoginBody):
    """
    Accepts a Google ID token from the frontend (obtained via Google One-Tap
    or the @react-oauth/google library), verifies it server-side using
    google-auth + our Client ID, then creates or updates the user.
    """
    info = _verify_google_id_token(body.id_token)

    uid = info.get("sub")           # unique Google user ID
    email = info.get("email", "")
    name = info.get("name", email.split("@")[0])
    picture = info.get("picture")
    email_verified = info.get("email_verified", False)

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email.")

    try:
        # Find existing user by google_id OR email
        user = await User.find_one({"$or": [{"google_id": uid}, {"email": email}]})

        if user:
            # Update existing user's Google fields
            user.google_id = uid
            user.auth_provider = "google"
            if picture:
                user.photo_url = picture
            user.is_email_verified = email_verified
            user.last_login = datetime.utcnow()
            await user.save()
        else:
            # First-time Google sign-in → create user
            role = body.role if body.role in ("client", "manager") else "client"
            user = User(
                name=name,
                email=email,
                google_id=uid,
                auth_provider="google",
                role=role,
                photo_url=picture,
                is_email_verified=email_verified,
                last_login=datetime.utcnow(),
            )
            await user.insert()
            logger.info(f"New Google user created: {email} [{role}]")

        return {
            "success": True,
            "message": "Google authentication successful",
            **build_token_response(user),
        }
    except Exception as e:
        # Fallback to in-memory storage
        logger.warning(f"Database error during Google login, using in-memory storage: {e}")
        
        user = _find_user_in_memory(email=email, google_id=uid)
        
        if user:
            user["google_id"] = uid
            user["auth_provider"] = "google"
            if picture:
                user["photo_url"] = picture
            user["is_email_verified"] = email_verified
            user["last_login"] = datetime.utcnow().isoformat()
        else:
            role = body.role if body.role in ("client", "manager") else "client"
            user = _create_user_in_memory(
                name=name,
                email=email,
                role=role,
                google_id=uid,
                photo_url=picture,
            )
            logger.info(f"New Google user created (in-memory): {email} [{role}]")
        
        class MockUser:
            def __init__(self, data):
                self.id = data["id"]
                self.email = data["email"]
                self.name = data["name"]
                self.role = data["role"]
                self.photo_url = data.get("photo_url")
                self.is_email_verified = data.get("is_email_verified", False)
                self.last_login = data.get("last_login")
                self.created_at = data.get("created_at")
            
            def to_public(self):
                return {
                    "id": self.id,
                    "name": self.name,
                    "email": self.email,
                    "role": self.role,
                    "auth_provider": "google",
                    "photo_url": self.photo_url,
                    "is_active": True,
                    "is_email_verified": self.is_email_verified,
                    "last_login": self.last_login,
                    "created_at": self.created_at,
                }
        
        mock_user = MockUser(user)
        return {
            "success": True,
            "message": "Google authentication successful",
            **build_token_response(mock_user),
        }


# ── GET /api/auth/me ─────────────────────────────────────────

@router.get("/me")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {"success": True, "user": current_user.to_public()}


# ── PATCH /api/auth/me ───────────────────────────────────────

@router.patch("/me")
async def update_profile(
    body: UpdateProfileBody,
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name
    if body.phone is not None:
        current_user.phone = body.phone
    if body.address is not None:
        current_user.address = body.address
    if body.pan_number is not None:
        current_user.pan_number = body.pan_number
    if body.aadhaar_number is not None:
        current_user.aadhaar_number = body.aadhaar_number
    current_user.updated_at = datetime.utcnow()
    await current_user.save()

    return {"success": True, "user": current_user.to_public()}
