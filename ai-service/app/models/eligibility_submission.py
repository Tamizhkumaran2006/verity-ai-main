from datetime import datetime
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field


class GteProofPublicInputs(BaseModel):
    threshold: int
    salt: str
    result: bool


class ProofPacket(BaseModel):
    field: Literal["income", "credit_score"]
    proof: str
    public_inputs: GteProofPublicInputs


class EligibilitySubmission(Document):
    user_id: str

    income: ProofPacket
    credit_score: ProofPacket

    eligible: bool

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "eligibility_submissions"
        indexes = [
            [("user_id", 1), ("created_at", -1)],
            [("created_at", -1)],
        ]

    def to_dict(self) -> dict:
        data = self.model_dump()
        data["id"] = str(self.id)
        return data
