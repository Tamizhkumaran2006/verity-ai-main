"""
LoanVerification Beanie ODM model (replaces Mongoose LoanVerification.model.js)
"""

from datetime import datetime
from typing import Optional, List, Literal, Any
from beanie import Document, Link
from pydantic import BaseModel, Field


# ── Sub-models ─────────────────────────────────────────────

class ExtractedData(BaseModel):
    applicant_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[float] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None

    monthly_income: Optional[float] = None
    annual_income: Optional[float] = None
    employment_type: Optional[str] = None
    employer_name: Optional[str] = None
    work_experience_years: Optional[float] = None

    loan_amount: Optional[float] = None
    loan_purpose: Optional[str] = None
    loan_tenure_months: Optional[int] = None

    credit_score: Optional[float] = None
    existing_loan_emi: Optional[float] = None
    debt_to_income_ratio: Optional[float] = None

    average_monthly_balance: Optional[float] = None
    bounced_cheques: Optional[int] = None

    property_value: Optional[float] = None
    ltv_ratio: Optional[float] = None

    raw_text: Optional[str] = None
    extraction_confidence: Optional[float] = None
    additional_fields: Optional[dict] = None


class RuleCheck(BaseModel):
    rule: str
    description: str
    passed: bool
    actual_value: Any = None
    expected_value: Any = None
    weight: int = 1
    category: Literal["mandatory", "preferred", "bonus"] = "mandatory"


class FileAttachment(BaseModel):
    original_name: str
    stored_name: str
    path: str
    mimetype: str
    size: int
    document_type: Literal[
        "salary_slip", "bank_statement", "income_tax_return",
        "pan_card", "aadhaar_card", "property_document",
        "employment_letter", "other"
    ] = "other"
    url: Optional[str] = None


class AiDecision(BaseModel):
    recommendation: Optional[Literal["approve", "reject", "manual_review"]] = None
    score: Optional[float] = None
    rule_checks: List[RuleCheck] = []
    mandatory_passed: int = 0
    mandatory_total: int = 0
    summary: Optional[str] = None
    processed_at: Optional[datetime] = None


class ManagerAction(BaseModel):
    manager_id: str
    manager_name: str
    action: Literal["approved", "rejected", "more_info_requested"]
    comment: str = ""
    action_at: datetime = Field(default_factory=datetime.utcnow)


# ── Main Document ──────────────────────────────────────────

class LoanVerification(Document):
    user_id: str  # string reference to User._id
    application_id: str

    files: List[FileAttachment] = []
    extracted_data: ExtractedData = Field(default_factory=ExtractedData)
    ai_decision: AiDecision = Field(default_factory=AiDecision)

    status: Literal[
        "pending", "processing", "ai_reviewed",
        "approved", "rejected", "more_info_needed", "cancelled"
    ] = "pending"
    result: Literal["Approved", "Rejected", "Pending", "Under Review"] = "Pending"
    reason: Optional[str] = None

    manager_action: Optional[ManagerAction] = None

    loan_type: Literal[
        "personal", "home", "auto", "business", "education", "other"
    ] = "personal"

    processing_errors: List[str] = []
    ocr_provider: Optional[str] = None
    processing_time_ms: Optional[int] = None
    ip_address: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "loan_verifications"
        indexes = [
            [("user_id", 1), ("status", 1)],
            [("application_id", 1)],
            [("created_at", -1)],
            [("status", 1), ("created_at", -1)],
        ]

    def to_dict(self) -> dict:
        data = self.model_dump()
        data["id"] = str(self.id)
        return data
