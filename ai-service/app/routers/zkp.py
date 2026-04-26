"""ZKP router (demo)

This is a **placeholder** interface for loan-eligibility ZK proofs.
It intentionally keeps the logic simple: prove `value >= threshold`.

NOTE: This is NOT a real ZK proof system yet. It provides an API surface
that you can later swap to Circom/Noir/snarkjs/Halo2/etc.
"""

import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.models.user import User
from app.services.token_service import get_current_user
from app.services.zkp_service import ZkpService

router = APIRouter()


class ProveGteBody(BaseModel):
    field: Literal["income", "credit_score"]
    value: int
    threshold: int


class VerifyGteBody(BaseModel):
    field: Literal["income", "credit_score"]
    proof: str
    threshold: int
    salt: str
    result: bool


@router.post("/prove-gte")
async def prove_gte(
    body: ProveGteBody,
    current_user: User = Depends(get_current_user),
):
    svc = ZkpService()
    salt = uuid.uuid4().hex
    bundle = svc.create_gte_proof(value=body.value, threshold=body.threshold, salt=salt)

    return {
        "success": True,
        "field": body.field,
        "proof": bundle.proof,
        "public_inputs": bundle.public_inputs,
    }


@router.post("/verify-gte")
async def verify_gte(
    body: VerifyGteBody,
    current_user: User = Depends(get_current_user),
):
    svc = ZkpService()
    ok = svc.verify_gte_proof(
        proof=body.proof,
        threshold=body.threshold,
        salt=body.salt,
        result=body.result,
    )

    return {
        "success": True,
        "field": body.field,
        "verified": ok,
    }
