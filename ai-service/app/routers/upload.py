"""
Upload router — replaces upload.controller.js + upload.routes.js
POST /api/upload         — accept files, trigger OCR + AI in background
GET  /api/upload/:id     — poll processing status
"""

import os
import uuid
import asyncio
import logging
from datetime import datetime
from typing import List

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request, BackgroundTasks
import aiofiles

from app.models.user import User
from app.models.loan_verification import (
    LoanVerification, FileAttachment, ExtractedData, AiDecision, RuleCheck
)
from app.services.token_service import get_current_user
from app.ocr.extractor import extract_text_from_file
from app.parser.field_parser import parse_loan_fields
from app.decision.rule_engine import run_loan_decision

logger = logging.getLogger("verity-ai.upload")
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_MB = int(os.getenv("MAX_FILE_SIZE_MB", 10))
ALLOWED_MIMES = {
    "application/pdf", "image/jpeg", "image/jpg",
    "image/png", "image/tiff", "image/webp",
}


def _detect_doc_type(filename: str) -> str:
    n = filename.lower()
    if any(k in n for k in ("salary", "payslip")):
        return "salary_slip"
    if any(k in n for k in ("bank", "statement")):
        return "bank_statement"
    if any(k in n for k in ("itr", "tax")):
        return "income_tax_return"
    if "pan" in n:
        return "pan_card"
    if any(k in n for k in ("aadhaar", "aadhar")):
        return "aadhaar_card"
    if any(k in n for k in ("property", "deed")):
        return "property_document"
    if any(k in n for k in ("offer", "employment")):
        return "employment_letter"
    return "other"


async def _save_file(file: UploadFile) -> tuple[str, str, int]:
    """Save uploaded file to disk. Returns (stored_name, full_path, size)."""
    ext = os.path.splitext(file.filename or "doc")[1] or ".bin"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, stored_name)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    content = await file.read()
    async with aiofiles.open(dest, "wb") as f:
        await f.write(content)
    return stored_name, dest, len(content), content


async def _process_background(ver_id: str, file_path: str, mime: str, loan_type: str):
    """Background task: OCR → parse → decide → update DB."""
    start = datetime.utcnow()
    verification = await LoanVerification.get(ver_id)
    if not verification:
        return
    try:
        async with aiofiles.open(file_path, "rb") as f:
            file_bytes = await f.read()

        ocr_result = await extract_text_from_file(file_bytes, mime, os.path.basename(file_path))
        raw_text = ocr_result["text"]
        provider = ocr_result["provider"]
        confidence = ocr_result.get("confidence", 0.85)

        fields = parse_loan_fields(raw_text, loan_type)
        fields["raw_text"] = raw_text
        fields["extraction_confidence"] = confidence

        extracted = ExtractedData(**{k: v for k, v in fields.items() if v is not None})
        decision_data = run_loan_decision(fields, loan_type)

        rc_list = [RuleCheck(**rc) for rc in decision_data["rule_checks"]]
        ai_dec = AiDecision(
            recommendation=decision_data["recommendation"],
            score=decision_data["score"],
            rule_checks=rc_list,
            mandatory_passed=decision_data["mandatory_passed"],
            mandatory_total=decision_data["mandatory_total"],
            summary=decision_data["summary"],
            processed_at=datetime.utcnow(),
        )

        rec = decision_data["recommendation"]
        result_map = {"approve": "Approved", "reject": "Rejected", "manual_review": "Under Review"}

        elapsed = int((datetime.utcnow() - start).total_seconds() * 1000)

        verification.extracted_data = extracted
        verification.ai_decision = ai_dec
        verification.status = "ai_reviewed"
        verification.result = result_map.get(rec, "Under Review")
        verification.reason = decision_data["summary"]
        verification.ocr_provider = provider
        verification.processing_time_ms = elapsed
        verification.updated_at = datetime.utcnow()
        await verification.save()

        logger.info(f"✅ {ver_id} processed in {elapsed}ms → {rec}")

    except Exception as e:
        logger.error(f"❌ Background processing failed for {ver_id}: {e}")
        verification.status = "pending"
        verification.processing_errors.append(str(e))
        await verification.save()


@router.post("", status_code=201)
async def upload_documents(
    background_tasks: BackgroundTasks,
    request: Request,
    files: List[UploadFile] = File(...),
    loan_type: str = Form("personal"),
    process_now: str = Form("true"),
    current_user: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    saved_files: list[FileAttachment] = []
    primary_file_path = None
    primary_mime = None
    primary_content = None

    for f in files:
        if f.content_type not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {f.content_type}",
            )
        stored_name, full_path, size, content = await _save_file(f)
        url = f"/uploads/{stored_name}"
        fa = FileAttachment(
            original_name=f.filename or stored_name,
            stored_name=stored_name,
            path=full_path,
            mimetype=f.content_type,
            size=size,
            document_type=_detect_doc_type(f.filename or ""),
            url=url,
        )
        saved_files.append(fa)
        if primary_file_path is None:
            primary_file_path = full_path
            primary_mime = f.content_type

    application_id = f"LOAN-{int(datetime.utcnow().timestamp()*1000)}-{uuid.uuid4().hex[:6].upper()}"
    should_process = process_now.lower() != "false"

    verification = LoanVerification(
        user_id=str(current_user.id),
        application_id=application_id,
        files=saved_files,
        loan_type=loan_type,
        status="processing" if should_process else "pending",
        ip_address=request.client.host if request.client else None,
    )
    await verification.insert()

    if should_process and primary_file_path:
        background_tasks.add_task(
            _process_background,
            str(verification.id),
            primary_file_path,
            primary_mime,
            loan_type,
        )

    return {
        "success": True,
        "message": "Documents uploaded. AI processing started in background." if should_process
                   else "Documents uploaded. Processing is deferred.",
        "application_id": application_id,
        "verification_id": str(verification.id),
        "files_uploaded": len(saved_files),
        "status": verification.status,
        "estimated_processing_time": "30-60 seconds",
    }


@router.get("/{verification_id}")
async def get_upload_status(
    verification_id: str,
    current_user: User = Depends(get_current_user),
):
    query = {"_id": verification_id}
    if current_user.role == "client":
        query["user_id"] = str(current_user.id)

    ver = await LoanVerification.get(verification_id)
    if not ver or (current_user.role == "client" and ver.user_id != str(current_user.id)):
        raise HTTPException(status_code=404, detail="Application not found.")

    return {
        "success": True,
        "record": {
            "id": str(ver.id),
            "application_id": ver.application_id,
            "status": ver.status,
            "result": ver.result,
            "ai_recommendation": ver.ai_decision.recommendation,
            "ai_score": ver.ai_decision.score,
            "processing_errors": ver.processing_errors,
            "created_at": ver.created_at.isoformat(),
        },
    }
