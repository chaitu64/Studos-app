"""Academic PDF storage and first-page rendering for StudOS.

Original PDFs and derived PNGs live on disk/object-storage compatible paths. Only
JSON metadata and URLs are returned to clients; binary data is never embedded in
resource records.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import fitz

logger = logging.getLogger("studos_resources")
BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage" / "resources"
INDEX_PATH = STORAGE_DIR / "resources.json"
MAX_PDF_BYTES = 40 * 1024 * 1024
THUMBNAIL_WIDTH = 900
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
_lock = threading.RLock()
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pdf-thumbnail")


class PdfValidationError(ValueError):
    pass


def _read_index() -> Dict[str, Dict[str, Any]]:
    with _lock:
        if not INDEX_PATH.exists():
            return {}
        try:
            return json.loads(INDEX_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.exception("Could not read resource index")
            return {}


def _write_index(records: Dict[str, Dict[str, Any]]) -> None:
    with _lock:
        temporary = INDEX_PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
        temporary.replace(INDEX_PATH)


def get_resource(resource_id: str) -> Optional[Dict[str, Any]]:
    return _read_index().get(resource_id)


def list_resources() -> Iterable[Dict[str, Any]]:
    return sorted(_read_index().values(), key=lambda item: item.get("createdAt", ""), reverse=True)


def _safe_file_name(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value or "document.pdf").strip("-.")
    return cleaned[:100] or "document.pdf"


def validate_pdf(path: Path, content_type: str, size: int) -> fitz.Document:
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise PdfValidationError("Only PDF uploads are accepted")
    if size <= 0 or size > MAX_PDF_BYTES:
        raise PdfValidationError("PDF must be between 1 byte and 40 MB")
    if path.read_bytes()[:5] != b"%PDF-":
        raise PdfValidationError("File signature is not a PDF")
    try:
        document = fitz.open(path)
    except Exception as exc:
        raise PdfValidationError("PDF is damaged or unreadable") from exc
    if document.page_count < 1:
        document.close()
        raise PdfValidationError("PDF has no pages")
    return document


def create_resource(*, stream, file_name: str, content_type: str, size: int, fields: Dict[str, str], base_url: str) -> Dict[str, Any]:
    resource_id = uuid.uuid4().hex
    directory = STORAGE_DIR / resource_id
    directory.mkdir(parents=True, exist_ok=False)
    original_name = _safe_file_name(file_name)
    pdf_path = directory / original_name
    with pdf_path.open("wb") as destination:
        shutil.copyfileobj(stream, destination)

    try:
        document = validate_pdf(pdf_path, content_type, size)
        page_count = document.page_count
        metadata = document.metadata or {}
        document.close()
    except Exception:
        shutil.rmtree(directory, ignore_errors=True)
        raise

    record: Dict[str, Any] = {
        "id": resource_id,
        "type": fields.get("type", "notes"),
        "title": fields.get("title") or metadata.get("title") or Path(original_name).stem,
        "description": fields.get("description", ""),
        "subject": fields.get("subject", "General"),
        "academicYear": fields.get("academicYear", ""),
        "semester": fields.get("semester", ""),
        "branch": fields.get("branch", ""),
        "uploadedBy": fields.get("uploadedBy", ""),
        "pdfUrl": f"{base_url}/api/resources/{resource_id}/original",
        "thumbnailUrl": None,
        "pageCount": page_count,
        "fileSize": size,
        "fileType": "application/pdf",
        "fileName": original_name,
        "aiSummary": None,
        "summaryStatus": "pending",
        "keyTopics": [],
        "createdAt": fields.get("createdAt", ""),
        "thumbnailStatus": "pending",
    }
    records = _read_index()
    records[resource_id] = record
    _write_index(records)
    _executor.submit(process_resource, resource_id, base_url)
    return record


def process_resource(resource_id: str, base_url: str) -> None:
    records = _read_index()
    record = records.get(resource_id)
    if not record:
        return
    record["thumbnailStatus"] = "processing"
    records[resource_id] = record
    _write_index(records)
    try:
        pdf_path = STORAGE_DIR / resource_id / record["fileName"]
        document = fitz.open(pdf_path)
        page = document.load_page(0)
        scale = THUMBNAIL_WIDTH / max(page.rect.width, 1)
        pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False, colorspace=fitz.csRGB)
        thumbnail_path = STORAGE_DIR / resource_id / "page-1.png"
        pixmap.save(thumbnail_path)
        # Text is extracted only from the original PDF. An AI provider can consume
        # this server-side; until configured we accurately expose unavailable state.
        extracted_text = "\n".join(p.get_text("text") for p in document)
        document.close()
        record["extractedTextLength"] = len(extracted_text)
        record["thumbnailUrl"] = f"{base_url}/api/resources/{resource_id}/thumbnail"
        record["thumbnailStatus"] = "completed"
        record["summaryStatus"] = "unavailable"
    except Exception as exc:
        logger.exception("PDF processing failed for %s", resource_id)
        record["thumbnailStatus"] = "failed"
        record["summaryStatus"] = "unavailable"
        record["processingError"] = str(exc)
    records = _read_index()
    records[resource_id] = record
    _write_index(records)


def resource_file(resource_id: str, kind: str, page_number: Optional[int] = None) -> Optional[Path]:
    record = get_resource(resource_id)
    if not record:
        return None
    directory = STORAGE_DIR / resource_id
    if kind == "original":
        candidate = directory / record["fileName"]
    elif kind == "thumbnail":
        candidate = directory / "page-1.png"
    elif kind == "page" and page_number:
        candidate = directory / f"viewer-page-{page_number}.png"
        if not candidate.exists() and 1 <= page_number <= record["pageCount"]:
            document = fitz.open(directory / record["fileName"])
            page = document.load_page(page_number - 1)
            scale = 144 / 72
            page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False, colorspace=fitz.csRGB).save(candidate)
            document.close()
    else:
        return None
    return candidate if candidate.exists() else None
