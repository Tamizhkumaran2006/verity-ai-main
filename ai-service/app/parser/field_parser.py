"""
Field parser — extract structured loan fields from OCR raw text
"""

import re
import logging
from typing import Any

logger = logging.getLogger("verity-ai.parser")


def _find_number(text: str, *patterns: str) -> float | None:
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(1).replace(",", "").replace(" ", "")
            try:
                return float(raw)
            except ValueError:
                continue
    return None


def _find_string(text: str, *patterns: str) -> str | None:
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
    return None


def parse_loan_fields(raw_text: str, loan_type: str = "personal") -> dict[str, Any]:
    t = raw_text

    # ── Personal Info ──────────────────────────────────────
    applicant_name = _find_string(
        t,
        r"(?:name|applicant)[:\s]+([A-Za-z\s]{3,50})",
        r"(?:full name)[:\s]+([A-Za-z\s]{3,50})",
    )
    age = _find_number(t, r"(?:age)[:\s]+(\d{2})")
    dob = _find_string(
        t,
        r"(?:date of birth|dob)[:\s]+([\d/\-\.]+)",
    )
    pan = _find_string(t, r"\b([A-Z]{5}[0-9]{4}[A-Z])\b")
    aadhaar = _find_string(t, r"\b(\d{4}\s?\d{4}\s?\d{4})\b")

    # ── Income ────────────────────────────────────────────
    monthly_income = _find_number(
        t,
        r"(?:monthly (?:net )?(?:salary|income))[:\s₹]+([0-9,]+)",
        r"(?:net salary|take.?home)[:\s₹]+([0-9,]+)",
        r"(?:salary)[:\s₹]+([0-9,]+)",
    )
    annual_income = _find_number(
        t,
        r"(?:annual income|yearly income|gross annual)[:\s₹]+([0-9,]+)",
        r"(?:total income)[:\s₹]+([0-9,]+)",
    )
    if monthly_income and not annual_income:
        annual_income = monthly_income * 12
    if annual_income and not monthly_income:
        monthly_income = annual_income / 12

    employer_name = _find_string(
        t,
        r"(?:employer|company|organisation)[:\s]+([A-Za-z0-9\s&.-]{3,60})",
    )
    work_exp = _find_number(
        t,
        r"(?:experience|work exp)[:\s]+(\d+(?:\.\d+)?)\s*(?:year|yr)",
    )
    employment_type = None
    if re.search(r"\bsalaried\b", t, re.I):
        employment_type = "salaried"
    elif re.search(r"\bself.?employed\b", t, re.I):
        employment_type = "self-employed"
    elif re.search(r"\bbusiness\b", t, re.I):
        employment_type = "business"

    # ── Loan Info ─────────────────────────────────────────
    loan_amount = _find_number(
        t,
        r"(?:loan amount|amount requested)[:\s₹]+([0-9,]+)",
        r"(?:sanctioned amount)[:\s₹]+([0-9,]+)",
    )
    loan_purpose = _find_string(
        t,
        r"(?:purpose|loan purpose)[:\s]+([A-Za-z\s]{3,50})",
    )
    loan_tenure = _find_number(
        t,
        r"(?:tenure|repayment period)[:\s]+(\d+)\s*(?:month|mo)",
        r"(?:tenure)[:\s]+(\d+)\s*(?:year|yr)",
    )

    # ── Credit ────────────────────────────────────────────
    credit_score = _find_number(
        t,
        r"(?:cibil|credit score|cibil score)[:\s]+(\d{3})",
    )
    emi = _find_number(
        t,
        r"(?:existing emi|current emi|emi)[:\s₹]+([0-9,]+)",
    )
    dti = _find_number(
        t,
        r"(?:dti|debt.?to.?income)[:\s]+([\d.]+)%?",
    )
    if dti and dti > 1:
        dti = dti / 100.0

    # ── Bank Statement ─────────────────────────────────────
    avg_balance = _find_number(
        t,
        r"(?:average (?:monthly )?balance|avg balance)[:\s₹]+([0-9,]+)",
    )
    bounced = _find_number(
        t,
        r"(?:bounced cheques|bounced|cheque bounce)[:\s]+(\d+)",
    )

    # ── Property (Home Loan) ────────────────────────────────
    prop_value = _find_number(
        t,
        r"(?:property value|market value)[:\s₹]+([0-9,]+)",
    )
    ltv = _find_number(t, r"(?:ltv|loan.?to.?value)[:\s]+([\d.]+)%?")
    if ltv and ltv > 1:
        ltv = ltv / 100.0

    return {
        "applicant_name": applicant_name,
        "date_of_birth": dob,
        "age": age,
        "pan_number": pan,
        "aadhaar_number": aadhaar,
        "monthly_income": monthly_income,
        "annual_income": annual_income,
        "employment_type": employment_type,
        "employer_name": employer_name,
        "work_experience_years": work_exp,
        "loan_amount": loan_amount,
        "loan_purpose": loan_purpose,
        "loan_tenure_months": int(loan_tenure) if loan_tenure else None,
        "credit_score": credit_score,
        "existing_loan_emi": emi,
        "debt_to_income_ratio": dti,
        "average_monthly_balance": avg_balance,
        "bounced_cheques": int(bounced) if bounced is not None else None,
        "property_value": prop_value,
        "ltv_ratio": ltv,
    }
