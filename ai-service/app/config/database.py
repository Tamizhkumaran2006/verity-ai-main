"""
MongoDB async connection via Motor + Beanie ODM
Falls back to in-memory storage if MongoDB is unavailable
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

logger = logging.getLogger("verity-ai.db")

_client: AsyncIOMotorClient | None = None
_db_available = False

# In-memory storage fallback
_in_memory_store = {
    "users": {},
    "loan_verifications": {},
}


async def init_db():
    global _client, _db_available
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/verity_ai")
    try:
        _client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        # Import models here to avoid circular imports
        from app.models.user import User
        from app.models.loan_verification import LoanVerification

        db_name = uri.split("/")[-1].split("?")[0] or "verity_ai"
        await init_beanie(
            database=_client[db_name],
            document_models=[User, LoanVerification],
        )
        _db_available = True
        logger.info(f"✅ MongoDB connected: {uri}")
    except Exception as e:
        _db_available = False
        logger.warning(f"⚠️  MongoDB unavailable: {e}. Server running with IN-MEMORY storage (data will be lost on restart).")


def get_client() -> AsyncIOMotorClient:
    return _client


def is_db_available() -> bool:
    return _db_available


def get_in_memory_store() -> dict:
    return _in_memory_store
