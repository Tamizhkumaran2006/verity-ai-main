"""Eligibility router (proof-only)

Stores proof-based eligibility submissions in MongoDB.
Eligibility rule (as requested):
  income >= T_income AND credit_score >= T_score

This router intentionally does NOT accept/store raw income or credit score values.
"""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.models.user import User
from app.models.eligibility_submission import (
    EligibilitySubmission,
    ProofPacket,
    GteProofPublicInputs,
)
from app.services.token_service import get_current_user
from app.services.zkp_service import ZkpService

router = APIRouter()


class SubmitEligibilityBody(BaseModel):
    income: ProofPacket
    credit_score: ProofPacket


@router.post("/submit", status_code=201)
async def submit_eligibility(
    body: SubmitEligibilityBody,
    current_user: User = Depends(get_current_user),
):
    # Enforce expected fields (avoid swapping)
    if body.income.field != "income":
        raise HTTPException(status_code=400, detail="income.field must be 'income'.")
    if body.credit_score.field != "credit_score":
        raise HTTPException(status_code=400, detail="credit_score.field must be 'credit_score'.")

    svc = ZkpService()

    income_pi = body.income.public_inputs
    cs_pi = body.credit_score.public_inputs

    # Verify proofs (demo verifier for now)
    income_verified = svc.verify_gte_proof(
        proof=body.income.proof,
        threshold=income_pi.threshold,
        salt=income_pi.salt,
        result=income_pi.result,
    )

    credit_verified = svc.verify_gte_proof(
        proof=body.credit_score.proof,
        threshold=cs_pi.threshold,
        salt=cs_pi.salt,
        result=cs_pi.result,
    )

    eligible = bool(income_verified and credit_verified and income_pi.result and cs_pi.result)

    submission = EligibilitySubmission(
        user_id=str(current_user.id),
        income=body.income,
        credit_score=body.credit_score,
        eligible=eligible,
    )
    await submission.insert()

    return {
        "success": True,
        "submission_id": str(submission.id),
        "eligible": eligible,
        "verified": {
            "income": income_verified,
            "credit_score": credit_verified,
        },
        "thresholds": {
            "income": income_pi.threshold,
            "credit_score": cs_pi.threshold,
        },
    }


@router.get("/{submission_id}")
async def get_submission(
    submission_id: str,
    current_user: User = Depends(get_current_user),
):
    submission = await EligibilitySubmission.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
    if submission.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Access denied.")

    return {"success": True, "submission": submission.to_dict()}
