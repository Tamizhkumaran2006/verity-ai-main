"""
Rule engine — ported from verification.controller.js
Returns recommendation: "approve" | "reject" | "manual_review"
"""

from typing import Any

# ── Rule Definitions ───────────────────────────────────────

LOAN_RULES: dict[str, dict] = {
    "personal": {
        "mandatory": [
            {
                "rule": "credit_score >= 650",
                "description": "Minimum credit score of 650 required",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("credit_score") is not None and d["credit_score"] >= 650,
                    "actual_value": d.get("credit_score"),
                    "expected_value": "≥ 650",
                },
            },
            {
                "rule": "monthly_income >= 25000",
                "description": "Minimum monthly income ₹25,000",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("monthly_income") is not None and d["monthly_income"] >= 25000,
                    "actual_value": d.get("monthly_income"),
                    "expected_value": "≥ ₹25,000",
                },
            },
            {
                "rule": "age >= 21 and age <= 60",
                "description": "Applicant age must be between 21 and 60 years",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("age") is not None and 21 <= d["age"] <= 60,
                    "actual_value": d.get("age"),
                    "expected_value": "21–60",
                },
            },
            {
                "rule": "debt_to_income_ratio <= 0.50",
                "description": "Debt-to-income ratio must not exceed 50%",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("debt_to_income_ratio") is None or d["debt_to_income_ratio"] <= 0.5,
                    "actual_value": f"{d['debt_to_income_ratio']*100:.1f}%" if d.get("debt_to_income_ratio") is not None else None,
                    "expected_value": "≤ 50%",
                },
            },
            {
                "rule": "work_experience_years >= 1",
                "description": "Minimum 1 year of employment/work experience",
                "weight": 1,
                "check": lambda d: {
                    "passed": d.get("work_experience_years") is not None and d["work_experience_years"] >= 1,
                    "actual_value": d.get("work_experience_years"),
                    "expected_value": "≥ 1 year",
                },
            },
        ],
        "preferred": [
            {
                "rule": "credit_score >= 750",
                "description": "Excellent credit score (≥ 750) for better interest rates",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("credit_score") is not None and d["credit_score"] >= 750,
                    "actual_value": d.get("credit_score"),
                    "expected_value": "≥ 750",
                },
            },
            {
                "rule": "bounced_cheques == 0",
                "description": "No bounced cheques in last 12 months",
                "weight": 1,
                "check": lambda d: {
                    "passed": d.get("bounced_cheques") is None or d["bounced_cheques"] == 0,
                    "actual_value": d.get("bounced_cheques"),
                    "expected_value": "0",
                },
            },
        ],
    },
    "home": {
        "mandatory": [
            {
                "rule": "credit_score >= 700",
                "description": "Minimum credit score of 700 for home loans",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("credit_score") is not None and d["credit_score"] >= 700,
                    "actual_value": d.get("credit_score"),
                    "expected_value": "≥ 700",
                },
            },
            {
                "rule": "annual_income >= 360000",
                "description": "Minimum annual income ₹3.6L for home loan",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("annual_income") is not None and d["annual_income"] >= 360000,
                    "actual_value": d.get("annual_income"),
                    "expected_value": "≥ ₹3,60,000",
                },
            },
            {
                "rule": "ltv_ratio <= 0.80",
                "description": "Loan-to-Value ratio must not exceed 80%",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("ltv_ratio") is None or d["ltv_ratio"] <= 0.8,
                    "actual_value": f"{d['ltv_ratio']*100:.1f}%" if d.get("ltv_ratio") is not None else None,
                    "expected_value": "≤ 80%",
                },
            },
            {
                "rule": "work_experience_years >= 2",
                "description": "Minimum 2 years of stable employment",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("work_experience_years") is not None and d["work_experience_years"] >= 2,
                    "actual_value": d.get("work_experience_years"),
                    "expected_value": "≥ 2 years",
                },
            },
            {
                "rule": "age >= 21 and age <= 65",
                "description": "Applicant age must be between 21 and 65 years",
                "weight": 1,
                "check": lambda d: {
                    "passed": d.get("age") is not None and 21 <= d["age"] <= 65,
                    "actual_value": d.get("age"),
                    "expected_value": "21–65",
                },
            },
        ],
        "preferred": [
            {
                "rule": "debt_to_income_ratio <= 0.40",
                "description": "Preferred DTI ratio ≤ 40% for favourable terms",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("debt_to_income_ratio") is not None and d["debt_to_income_ratio"] <= 0.4,
                    "actual_value": d.get("debt_to_income_ratio"),
                    "expected_value": "≤ 40%",
                },
            },
        ],
    },
    "business": {
        "mandatory": [
            {
                "rule": "credit_score >= 680",
                "description": "Minimum credit score of 680 for business loans",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("credit_score") is not None and d["credit_score"] >= 680,
                    "actual_value": d.get("credit_score"),
                    "expected_value": "≥ 680",
                },
            },
            {
                "rule": "annual_income >= 600000",
                "description": "Minimum business annual revenue ₹6L",
                "weight": 3,
                "check": lambda d: {
                    "passed": d.get("annual_income") is not None and d["annual_income"] >= 600000,
                    "actual_value": d.get("annual_income"),
                    "expected_value": "≥ ₹6,00,000",
                },
            },
            {
                "rule": "work_experience_years >= 2",
                "description": "Business must be operational for ≥ 2 years",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("work_experience_years") is not None and d["work_experience_years"] >= 2,
                    "actual_value": d.get("work_experience_years"),
                    "expected_value": "≥ 2 years",
                },
            },
            {
                "rule": "average_monthly_balance >= 10000",
                "description": "Average monthly bank balance ≥ ₹10,000",
                "weight": 2,
                "check": lambda d: {
                    "passed": d.get("average_monthly_balance") is not None and d["average_monthly_balance"] >= 10000,
                    "actual_value": d.get("average_monthly_balance"),
                    "expected_value": "≥ ₹10,000",
                },
            },
        ],
        "preferred": [],
    },
}

DEFAULT_RULES = LOAN_RULES["personal"]


def run_loan_decision(extracted_data: dict[str, Any], loan_type: str = "personal") -> dict:
    """
    Run rule engine on extracted_data dict.
    Returns: recommendation, score, rule_checks, mandatory_passed, mandatory_total, summary
    """
    rules = LOAN_RULES.get(loan_type, DEFAULT_RULES)
    all_checks = []
    mandatory_passed = 0
    mandatory_total = 0
    weighted_score = 0
    total_weight = 0

    def run_category(rule_list: list, category: str):
        nonlocal mandatory_passed, mandatory_total, weighted_score, total_weight
        for rd in rule_list:
            result = rd["check"](extracted_data)
            all_checks.append({
                "rule": rd["rule"],
                "description": rd["description"],
                "passed": result["passed"],
                "actual_value": result.get("actual_value"),
                "expected_value": result.get("expected_value"),
                "weight": rd["weight"],
                "category": category,
            })
            if category == "mandatory":
                mandatory_total += 1
                if result["passed"]:
                    mandatory_passed += 1
            if result["passed"]:
                weighted_score += rd["weight"]
            total_weight += rd["weight"]

    run_category(rules.get("mandatory", []), "mandatory")
    run_category(rules.get("preferred", []), "preferred")

    all_mandatory_passed = mandatory_passed == mandatory_total
    approval_score = round((weighted_score / total_weight) * 100) if total_weight > 0 else 0

    if not all_mandatory_passed:
        recommendation = "reject"
    elif approval_score >= 80:
        recommendation = "approve"
    else:
        recommendation = "manual_review"

    failed_mandatory = [c for c in all_checks if c["category"] == "mandatory" and not c["passed"]]

    if recommendation == "approve":
        summary = f"All {mandatory_total} mandatory criteria passed. Approval score: {approval_score}/100."
    elif recommendation == "reject":
        reasons = "; ".join(c["description"] for c in failed_mandatory)
        summary = f"Rejected — {len(failed_mandatory)} mandatory criteria failed: {reasons}"
    else:
        summary = f"Mandatory criteria passed but score {approval_score}/100 requires manual review."

    return {
        "recommendation": recommendation,
        "score": approval_score,
        "rule_checks": all_checks,
        "mandatory_passed": mandatory_passed,
        "mandatory_total": mandatory_total,
        "preferred_passed": sum(1 for c in all_checks if c["category"] == "preferred" and c["passed"]),
        "summary": summary,
    }
