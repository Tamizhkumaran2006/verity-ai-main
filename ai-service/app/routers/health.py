"""Health router"""
import time
import os
from fastapi import APIRouter

router = APIRouter()

@router.get("")
async def health():
    return {
        "status": "ok",
        "service": "verity-ai-backend",
        "version": "2.0.0",
        "ocr_provider": "google_vision",
        "timestamp": time.time(),
    }
