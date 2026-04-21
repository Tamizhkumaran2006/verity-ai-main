"""
History router — replaces history.controller.js + history.routes.js
GET    /api/history      — paginated history (client sees own, manager sees all)
GET    /api/history/:id  — single record detail
DELETE /api/history/:id  — client cancels their own pending application
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query

from app.models.user import User
from app.models.loan_verification import LoanVerification
from app.services.token_service import get_current_user

logger = logging.getLogger("verity-ai.history")
router = APIRouter()


@router.get("")
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    loan_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    query: dict = {}

    if current_user.role == "client":
        query["user_id"] = str(current_user.id)
    elif user_id:
        query["user_id"] = user_id

    if status:
        query["status"] = status
    if loan_type:
        query["loan_type"] = loan_type

    skip = (page - 1) * limit
    records = (
        await LoanVerification.find(query)
        .sort("-created_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )
    total = await LoanVerification.find(query).count()
    total_pages = (total + limit - 1) // limit

    return {
        "success": True,
        "history": [r.to_dict() for r in records],
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_count": total,
            "limit": limit,
            "has_next_page": page < total_pages,
            "has_prev_page": page > 1,
        },
    }


@router.get("/{record_id}")
async def get_history_detail(
    record_id: str,
    current_user: User = Depends(get_current_user),
):
    record = await LoanVerification.get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    if current_user.role == "client" and record.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return {"success": True, "record": record.to_dict()}


@router.delete("/{record_id}")
async def cancel_application(
    record_id: str,
    current_user: User = Depends(get_current_user),
):
    record = await LoanVerification.get(record_id)
    if (
        not record
        or record.user_id != str(current_user.id)
        or record.status not in ("pending", "ai_reviewed")
    ):
        raise HTTPException(
            status_code=404,
            detail="Application not found or cannot be cancelled in its current status.",
        )

    record.status = "cancelled"
    record.reason = "Cancelled by applicant."
    record.updated_at = datetime.utcnow()
    await record.save()

    return {
        "success": True,
        "message": "Application cancelled successfully.",
        "application_id": record.application_id,
    }
