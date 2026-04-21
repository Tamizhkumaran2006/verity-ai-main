"""
Manager router — replaces manager.controller.js + manager.routes.js
GET  /api/manager/requests          — list applications
GET  /api/manager/requests/:id      — get single application
POST /api/manager/approve           — approve application
POST /api/manager/reject            — reject application
POST /api/manager/request-more-info — request more info
GET  /api/manager/stats             — dashboard statistics
GET  /api/manager/users             — list users
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from app.models.user import User
from app.models.loan_verification import LoanVerification, ManagerAction
from app.services.token_service import get_current_user, require_manager

logger = logging.getLogger("verity-ai.manager")
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────

class ApproveBody(BaseModel):
    verification_id: str
    comment: Optional[str] = None


class RejectBody(BaseModel):
    verification_id: str
    reason: str


class MoreInfoBody(BaseModel):
    verification_id: str
    message: str


# ── GET /api/manager/requests ─────────────────────────────────

@router.get("/requests")
async def get_requests(
    status: Optional[str] = Query(None),
    loan_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_manager),
):
    query: dict = {}

    if status:
        query["status"] = status
    else:
        query["status"] = {"$in": ["pending", "processing", "ai_reviewed"]}

    if loan_type:
        query["loan_type"] = loan_type

    if search:
        query["application_id"] = {"$regex": search, "$options": "i"}

    skip = (page - 1) * limit

    records = await LoanVerification.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    total = await LoanVerification.find(query).count()
    total_pages = (total + limit - 1) // limit

    return {
        "success": True,
        "records": [r.to_dict() for r in records],
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_count": total,
            "limit": limit,
            "has_next_page": page < total_pages,
            "has_prev_page": page > 1,
        },
    }


# ── GET /api/manager/requests/:id ────────────────────────────

@router.get("/requests/{record_id}")
async def get_request_detail(
    record_id: str,
    current_user: User = Depends(require_manager),
):
    record = await LoanVerification.get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Application not found.")
    return {"success": True, "record": record.to_dict()}


# ── POST /api/manager/approve ─────────────────────────────────

@router.post("/approve")
async def approve_application(
    body: ApproveBody,
    current_user: User = Depends(require_manager),
):
    record = await LoanVerification.get(body.verification_id)
    if not record:
        raise HTTPException(status_code=404, detail="Application not found.")
    if record.status not in ("pending", "ai_reviewed", "more_info_needed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve application in status: {record.status}",
        )

    record.status = "approved"
    record.result = "Approved"
    record.reason = body.comment or "Approved by manager after review."
    record.manager_action = ManagerAction(
        manager_id=str(current_user.id),
        manager_name=current_user.name,
        action="approved",
        comment=body.comment or "",
        action_at=datetime.utcnow(),
    )
    record.updated_at = datetime.utcnow()
    await record.save()

    logger.info(f"✅ {record.application_id} APPROVED by {current_user.email}")
    return {
        "success": True,
        "message": "Application approved successfully.",
        "application_id": record.application_id,
        "status": record.status,
    }


# ── POST /api/manager/reject ──────────────────────────────────

@router.post("/reject")
async def reject_application(
    body: RejectBody,
    current_user: User = Depends(require_manager),
):
    record = await LoanVerification.get(body.verification_id)
    if not record:
        raise HTTPException(status_code=404, detail="Application not found.")
    if record.status not in ("pending", "ai_reviewed", "more_info_needed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject application in status: {record.status}",
        )

    record.status = "rejected"
    record.result = "Rejected"
    record.reason = body.reason
    record.manager_action = ManagerAction(
        manager_id=str(current_user.id),
        manager_name=current_user.name,
        action="rejected",
        comment=body.reason,
        action_at=datetime.utcnow(),
    )
    record.updated_at = datetime.utcnow()
    await record.save()

    logger.info(f"❌ {record.application_id} REJECTED by {current_user.email}")
    return {
        "success": True,
        "message": "Application rejected.",
        "application_id": record.application_id,
        "status": record.status,
        "reason": body.reason,
    }


# ── POST /api/manager/request-more-info ──────────────────────

@router.post("/request-more-info")
async def request_more_info(
    body: MoreInfoBody,
    current_user: User = Depends(require_manager),
):
    record = await LoanVerification.get(body.verification_id)
    if not record:
        raise HTTPException(status_code=404, detail="Application not found.")

    record.status = "more_info_needed"
    record.manager_action = ManagerAction(
        manager_id=str(current_user.id),
        manager_name=current_user.name,
        action="more_info_requested",
        comment=body.message,
        action_at=datetime.utcnow(),
    )
    record.updated_at = datetime.utcnow()
    await record.save()

    return {
        "success": True,
        "message": "More information requested.",
        "application_id": record.application_id,
    }


# ── GET /api/manager/stats ────────────────────────────────────

@router.get("/stats")
async def get_stats(current_user: User = Depends(require_manager)):
    from motor.motor_asyncio import AsyncIOMotorCollection

    col: AsyncIOMotorCollection = LoanVerification.get_motor_collection()

    status_agg = await col.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(length=None)

    loan_type_agg = await col.aggregate([
        {"$group": {"_id": "$loan_type", "count": {"$sum": 1}}}
    ]).to_list(length=None)

    recent = await LoanVerification.find().sort("-created_at").limit(5).to_list()

    stats = {s["_id"]: s["count"] for s in status_agg}
    total = sum(stats.values())
    approval_rate = f"{(stats.get('approved', 0) / total * 100):.1f}%" if total > 0 else "0%"

    return {
        "success": True,
        "stats": {
            "total_applications": total,
            "pending": stats.get("pending", 0),
            "processing": stats.get("processing", 0),
            "ai_reviewed": stats.get("ai_reviewed", 0),
            "approved": stats.get("approved", 0),
            "rejected": stats.get("rejected", 0),
            "more_info_needed": stats.get("more_info_needed", 0),
            "approval_rate": approval_rate,
        },
        "by_loan_type": [{"type": l["_id"], "count": l["count"]} for l in loan_type_agg],
        "recent_activity": [r.to_dict() for r in recent],
    }


# ── GET /api/manager/users ────────────────────────────────────

@router.get("/users")
async def get_users(
    role: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_manager),
):
    query = {}
    if role:
        query["role"] = role

    skip = (page - 1) * limit
    users = await User.find(query).sort("-created_at").skip(skip).limit(limit).to_list()
    total = await User.find(query).count()

    return {
        "success": True,
        "users": [u.to_public() for u in users],
        "pagination": {"current_page": page, "total": total, "limit": limit},
    }
