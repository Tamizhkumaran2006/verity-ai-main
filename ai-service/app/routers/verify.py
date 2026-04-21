"""
Verify router — replaces verification.controller.js + verification.routes.js
POST /api/verify             — run rule engine on stored or inline data
POST /api/verify/quick-check — instant check without DB
GET  /api/verify/:id         — full record details
"""

import logging
from datetime import datetime
from typing import Optional, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.models.user import User
from app.models.loan_verification import LoanVerification, AiDecision, RuleCheck
from app.decision.rule_engine import run_loan_decision
from app.services.token_service import get_current_user

logger = logging.getLogger("verity-ai.verify")
router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────

class VerifyBody(BaseModel):
    verification_id: Optional[str] = None
    extracted_data: Optional[dict[str, Any]] = None
    loan_type: str = "personal"


class QuickCheckBody(BaseModel):
    extracted_data: dict[str, Any]
    loan_type: str = "personal"


# ── Helpers ───────────────────────────────────────────────────

STATUS_LABEL = {
    "approve": "Eligible for Approval",
    "reject": "Not Eligible",
    "manual_review": "Requires Manual Review",
}


def _format_decision(decision: dict) -> dict:
    return {
        "recommendation": decision["recommendation"],
        "approval_score": decision["score"],
        "summary": decision["summary"],
        "rule_checks": decision["rule_checks"],
        "mandatory_passed": decision["mandatory_passed"],
        "mandatory_total": decision["mandatory_total"],
        "status": STATUS_LABEL.get(decision["recommendation"], "Unknown"),
    }


# ── POST /api/verify ──────────────────────────────────────────

@router.post("")
async def verify_document(
    body: VerifyBody,
    current_user: User = Depends(get_current_user),
):
    record = None
    data_to_verify = body.extracted_data

    if body.verification_id:
        record = await LoanVerification.get(body.verification_id)
        if not record:
            raise HTTPException(status_code=404, detail="Application not found.")
        if current_user.role == "client" and record.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Access denied.")

        # Convert Beanie model to plain dict
        data_to_verify = record.extracted_data.model_dump()

        if not any(v is not None for v in data_to_verify.values()):
            raise HTTPException(
                status_code=400,
                detail="No extracted data found. Upload and process a document first.",
            )

    if not data_to_verify:
        raise HTTPException(
            status_code=400,
            detail="Provide either verification_id or extracted_data.",
        )

    decision = run_loan_decision(data_to_verify, body.loan_type)

    # Update DB record if we have one
    if record:
        rc_list = [RuleCheck(**rc) for rc in decision["rule_checks"]]
        record.ai_decision = AiDecision(
            recommendation=decision["recommendation"],
            score=decision["score"],
            rule_checks=rc_list,
            mandatory_passed=decision["mandatory_passed"],
            mandatory_total=decision["mandatory_total"],
            summary=decision["summary"],
            processed_at=datetime.utcnow(),
        )
        result_map = {"approve": "Approved", "reject": "Rejected", "manual_review": "Under Review"}
        record.status = "ai_reviewed"
        record.result = result_map.get(decision["recommendation"], "Under Review")
        record.reason = decision["summary"]
        record.updated_at = datetime.utcnow()
        await record.save()

    return {
        "success": True,
        "verification_id": str(record.id) if record else None,
        "application_id": record.application_id if record else None,
        "loan_type": body.loan_type,
        "decision_engine": "rule_engine",
        **_format_decision(decision),
    }


# ── POST /api/verify/quick-check ─────────────────────────────

@router.post("/quick-check")
async def quick_check(
    body: QuickCheckBody,
    current_user: User = Depends(get_current_user),
):
    decision = run_loan_decision(body.extracted_data, body.loan_type)
    return {
        "success": True,
        "message": "Quick verification complete",
        "loan_type": body.loan_type,
        **_format_decision(decision),
    }


# ── GET /api/verify/:id ───────────────────────────────────────

@router.get("/{record_id}")
async def get_verification_detail(
    record_id: str,
    current_user: User = Depends(get_current_user),
):
    record = await LoanVerification.get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Verification record not found.")
    if current_user.role == "client" and record.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return {"success": True, "record": record.to_dict()}
