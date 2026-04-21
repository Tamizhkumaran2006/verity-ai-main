"""
OCR Service — uses Google Cloud Vision API (no local Tesseract/EasyOCR needed)

Supports:
  - Images: JPEG, PNG, TIFF, WEBP  → annotate_image
  - PDFs                           → async_batch_annotate_files (or convert page-by-page)

Requires env var:
  GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json
  OR
  GOOGLE_VISION_API_KEY=<your key>   (used via REST fallback)
"""

import os
import base64
import io
import logging
import asyncio
from typing import Optional

import httpx
from PIL import Image

logger = logging.getLogger("verity-ai.ocr")

VISION_API_KEY = os.getenv("GOOGLE_VISION_API_KEY", "")
VISION_REST_URL = "https://vision.googleapis.com/v1/images:annotate"


def _image_to_base64(image_bytes: bytes, mime_type: str) -> str:
    """Return base64-encoded image; convert PDF page to PNG first."""
    if mime_type == "application/pdf":
        # Convert first page of PDF to PNG using pdf2image
        try:
            from pdf2image import convert_from_bytes
            pages = convert_from_bytes(image_bytes, first_page=1, last_page=1, dpi=200)
            buf = io.BytesIO()
            pages[0].save(buf, format="PNG")
            return base64.b64encode(buf.getvalue()).decode()
        except Exception as e:
            logger.warning(f"pdf2image failed: {e}. Sending raw bytes.")
            return base64.b64encode(image_bytes).decode()
    return base64.b64encode(image_bytes).decode()


async def _call_vision_rest(image_b64: str) -> dict:
    """Call Vision API via REST (works with API key)."""
    payload = {
        "requests": [
            {
                "image": {"content": image_b64},
                "features": [
                    {"type": "DOCUMENT_TEXT_DETECTION", "maxResults": 1}
                ],
            }
        ]
    }
    url = f"{VISION_REST_URL}?key={VISION_API_KEY}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()


async def _call_vision_sdk(image_bytes: bytes, mime_type: str) -> dict:
    """Call Vision API via google-cloud-vision SDK (service account JSON)."""
    from google.cloud import vision

    loop = asyncio.get_event_loop()

    def _sync_call():
        client = vision.ImageAnnotatorClient()
        if mime_type == "application/pdf":
            # Process PDF via sync annotate with PDF mime type
            try:
                from pdf2image import convert_from_bytes
                pages = convert_from_bytes(image_bytes, first_page=1, last_page=1, dpi=200)
                buf = io.BytesIO()
                pages[0].save(buf, format="PNG")
                img = vision.Image(content=buf.getvalue())
            except Exception:
                img = vision.Image(content=image_bytes)
        else:
            img = vision.Image(content=image_bytes)

        response = client.document_text_detection(image=img)
        full_text = response.full_text_annotation.text if response.full_text_annotation else ""
        confidence = 0.9  # SDK doesn't expose a simple scalar confidence
        return {"text": full_text, "confidence": confidence}

    return await loop.run_in_executor(None, _sync_call)


async def extract_text_from_file(
    file_bytes: bytes,
    content_type: str,
    filename: str = "document",
) -> dict:
    """
    Main OCR entry point.
    Returns: { text: str, provider: str, confidence: float }
    """
    provider = "google_vision"

    try:
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

        if creds_path and os.path.exists(creds_path):
            # Prefer SDK (service account key)
            result = await _call_vision_sdk(file_bytes, content_type)
            raw_text = result["text"]
            confidence = result.get("confidence", 0.9)
            logger.info(f"✅ Vision SDK OCR: {len(raw_text)} chars from '{filename}'")
        elif VISION_API_KEY:
            # Fallback: REST API with API key
            image_b64 = _image_to_base64(file_bytes, content_type)
            data = await _call_vision_rest(image_b64)
            responses = data.get("responses", [{}])
            annotation = responses[0].get("fullTextAnnotation", {})
            raw_text = annotation.get("text", "")
            pages = annotation.get("pages", [])
            confidence = pages[0].get("confidence", 0.85) if pages else 0.85
            logger.info(f"✅ Vision REST OCR: {len(raw_text)} chars from '{filename}'")
        else:
            raise RuntimeError(
                "No OCR credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_VISION_API_KEY."
            )

        return {"text": raw_text, "provider": provider, "confidence": confidence}

    except Exception as e:
        logger.error(f"❌ OCR failed for '{filename}': {e}")
        raise
