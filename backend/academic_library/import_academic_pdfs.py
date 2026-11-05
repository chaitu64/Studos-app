#!/usr/bin/env python3
"""Incremental importer for public VVIT academic PDFs.

Only crawls the configured public source and same-origin HTML pages. It does not
authenticate to source sites, bypass Drive interstitials, or infer missing data.
Supabase credentials are read only from this backend process environment.
"""
from __future__ import annotations

import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.robotparser import RobotFileParser
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urljoin, urlparse, urlunparse
from urllib.request import Request, urlopen

import fitz

ROOT = Path(__file__).resolve().parent
LOG_PATH = ROOT / "import-log.jsonl"
REPORT_PATH = ROOT / "import-report.json"
USER_AGENT = "StudOS-VVIT-Academic-Library/1.0 (public academic index; contact: site owner)"
DRIVE_VIEWER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
MAX_PDF_BYTES = 40 * 1024 * 1024
VVIT_NAME = "Vasireddy Venkatadri Institute of Technology"
CATTERNS = [
    ("important_questions", r"important[\s_-]*questions?|imp[\s_-]*questions?"),
    ("previous_question_paper", r"previous|question[\s_-]*paper|past[\s_-]*paper|old[\s_-]*paper"),
    ("lecture_notes", r"lecture[\s_-]*notes?"),
    ("unit_notes", r"unit[\s_-]*(?:wise[\s_-]*)?notes?|unit[\s_-]*(?:\d+|[ivx]+)"),
    ("study_materials", r"study[\s_-]*materials?"),
    ("assignment", r"assignments?"),
    ("laboratory_manual", r"lab(?:oratory)?[\s_-]*manuals?"),
    ("practical_record", r"practical[\s_-]*records?"),
    ("syllabus", r"syllabus"),
    ("model_question_paper", r"model[\s_-]*(?:question[\s_-]*)?papers?"),
    ("reference_material", r"reference[\s_-]*(?:books?|materials?)"),
]


class OversizePdfError(ValueError):
    pass


def log(event: dict) -> None:
    event["at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with LOG_PATH.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(event, ensure_ascii=False) + "\n")
    print(json.dumps(event, ensure_ascii=False))


def normalize_url(url: str) -> str:
    p = urlparse(url.strip())
    query = parse_qs(p.query)
    if "drive.google.com" in p.netloc.lower():
        file_id = ""
        match = re.search(r"/file/d/([^/]+)", p.path)
        if match:
            file_id = match.group(1)
        file_id = file_id or (query.get("id", [""])[0])
        if file_id:
            return f"https://drive.google.com/file/d/{file_id}/view"
    return urlunparse((p.scheme.lower(), p.netloc.lower(), p.path, "", p.query, ""))


def source_key(url: str) -> str:
    return hashlib.sha256(normalize_url(url).encode("utf-8")).hexdigest()


def academic_code(text: str) -> tuple[int | None, int | None]:
    value = html.unescape(text).lower()
    roman = re.search(r"\b(iv|iii|ii|i)\s*[-_/]\s*(ii|i)\b", value)
    if roman:
        roman_year = {"i": 1, "ii": 2, "iii": 3, "iv": 4}
        roman_semester = {"i": 1, "ii": 2}
        return roman_year[roman.group(1)], roman_semester[roman.group(2)]
    patterns = [r"(?<!\d)([1-4])\s*[-_/]\s*([12])(?!\d)",
                r"(?<!\d)([1-4])(?:st|nd|rd|th)?\s+year\D{0,20}(?:semester\D{0,5})?([12])(?!\d)",
                r"(?<!\d)([1-4])\s*(?:year|yr)\D{0,15}([12])\s*(?:sem|semester)"]
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return int(match.group(1)), int(match.group(2))
    return None, None


def category_for(text: str) -> str:
    for category, pattern in CATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return category
    return "other"


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.href = ""
        self.label = []
        self.items: list[tuple[str, str]] = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "a":
            self.href = dict(attrs).get("href", "") or ""
            self.label = []

    def handle_data(self, data):
        if self.href:
            self.label.append(data.strip())

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self.href:
            self.items.append((self.href, " ".join(x for x in self.label if x)))
            self.href, self.label = "", []


class DriveFiles(HTMLParser):
    """Read file name/ID metadata Google exposes in a public folder page."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.items: list[tuple[str, str, bool]] = []
        self.pending_label = ""
        self.pending_folder = False

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        file_id = attributes.get("data-id", "")
        label = attributes.get("data-tooltip", "") or attributes.get("aria-label", "")
        label = html.unescape(label).strip()
        is_pdf = label.lower().endswith(".pdf") or "PDF Shared" in label
        is_folder = "Folder Shared" in label
        if label and (is_pdf or is_folder):
            self.pending_folder = is_folder and not is_pdf
            self.pending_label = re.sub(r"\s+(?:PDF|Folder) Shared$", "", label, flags=re.I)
        if file_id and self.pending_label and (self.pending_folder or self.pending_label.lower().endswith(".pdf")):
            self.items.append((file_id, self.pending_label, self.pending_folder))
            self.pending_label = ""
            self.pending_folder = False


def request(url: str, timeout: int = 25, browser_compatible: bool = False):
    agent = DRIVE_VIEWER_UA if browser_compatible else USER_AGENT
    req = Request(url, headers={"User-Agent": agent, "Accept": "text/html,application/pdf,*/*"})
    return urlopen(req, timeout=timeout)


def drive_download_url(url: str) -> str:
    p = urlparse(url)
    if "drive.google.com" not in p.netloc.lower():
        return url
    match = re.search(r"/file/d/([^/]+)", p.path)
    file_id = (match.group(1) if match else "") or parse_qs(p.query).get("id", [""])[0]
    return f"https://drive.google.com/uc?export=download&id={quote(file_id)}" if file_id else url


def crawl(source: str, max_pages: int) -> tuple[list[tuple[str, str, str]], list[dict]]:
    origin = urlparse(source)
    robots = RobotFileParser()
    robots.set_url(urljoin(source, "/robots.txt"))
    try:
        robots.read()
    except Exception as exc:
        # If the source's access policy cannot be read, avoid crawling it.
        return [], [{"url": source, "status": "restricted", "error": f"Could not read robots.txt; crawl stopped: {exc}"}]
    queue, seen, records, drive_folders, errors = [source], set(), [], [], []
    while queue and len(seen) < max_pages:
        page = queue.pop(0)
        if page in seen:
            continue
        seen.add(page)
        if not robots.can_fetch(USER_AGENT, page):
            errors.append({"url": page, "status": "restricted", "error": "Blocked by source robots.txt"})
            continue
        try:
            with request(page) as response:
                content_type = response.headers.get_content_type()
                body = response.read(5 * 1024 * 1024 + 1)
                if len(body) > 5 * 1024 * 1024:
                    raise ValueError("HTML listing exceeds 5 MiB limit")
            if content_type != "application/pdf":
                parser = Links()
                parser.feed(body.decode("utf-8", errors="replace"))
                for href, label in parser.items:
                    absolute = urljoin(page, html.unescape(href)).strip()
                    parsed = urlparse(absolute)
                    if parsed.scheme not in {"http", "https"}:
                        continue
                    path = parsed.path.lower()
                    is_drive = "drive.google.com" in parsed.netloc.lower()
                    is_folder = is_drive and "/drive/folders/" in path
                    is_pdf = path.endswith(".pdf") or (is_drive and not is_folder)
                    if is_pdf:
                        if parsed.netloc.lower() == origin.netloc.lower() and not robots.can_fetch(USER_AGENT, absolute):
                            errors.append({"url": absolute, "status": "restricted", "error": "Blocked by source robots.txt"})
                            continue
                        records.append((normalize_url(absolute), label, page))
                    elif is_folder:
                        drive_folders.append((absolute, page))
                        log({"url": absolute, "listing_url": page, "status": "public_folder_discovered"})
                    elif parsed.netloc.lower() == origin.netloc.lower() and absolute not in seen and absolute not in queue:
                        queue.append(absolute)
        except Exception as exc:
            error = {"url": page, "status": "source_failed", "error": str(exc)}
            errors.append(error)
            log(error)
    processed_folders = set()
    folder_index = 0
    while folder_index < min(len(drive_folders), max_pages):
        folder, listing = drive_folders[folder_index]
        folder_index += 1
        folder_id_match = re.search(r"/folders/([^/?]+)", urlparse(folder).path)
        folder_id = folder_id_match.group(1) if folder_id_match else folder
        if folder_id in processed_folders:
            continue
        processed_folders.add(folder_id)
        try:
            drive_robots = RobotFileParser()
            drive_robots.set_url("https://drive.google.com/robots.txt")
            drive_robots.read()
            if not drive_robots.can_fetch(USER_AGENT, folder):
                errors.append({"url": folder, "status": "restricted", "error": "Blocked by Google Drive robots.txt"})
                continue
            with request(folder, browser_compatible=True) as response:
                body = response.read(5 * 1024 * 1024 + 1).decode("utf-8", errors="replace")
            if len(body) > 5 * 1024 * 1024:
                raise ValueError("Drive folder listing exceeds 5 MiB limit")
            drive_files = DriveFiles()
            drive_files.feed(body)
            log({"url": folder, "status": "public_folder_parsed", "public_entries": len(drive_files.items)})
            if not drive_files.items:
                empty = {"url": folder, "listing_url": listing, "status": "no_public_pdf_entries", "error": "The public folder page exposed no PDF files or nested public folders to the importer."}
                errors.append(empty)
                log(empty)
            for file_id, label, is_nested_folder in drive_files.items:
                if is_nested_folder:
                    drive_folders.append((f"https://drive.google.com/drive/folders/{quote(file_id)}", folder))
                    continue
                pdf_url = f"https://drive.google.com/file/d/{quote(file_id)}/view"
                records.append((pdf_url, label, folder))
        except Exception as exc:
            error = {"url": folder, "listing_url": listing, "status": "source_failed", "error": str(exc)}
            errors.append(error)
            log(error)
    unique = {}
    for url, label, listing in records:
        unique.setdefault(url, (url, label, listing))
    return list(unique.values()), errors


def public_file(url: str) -> tuple[bytes, str]:
    target = drive_download_url(url)
    with request(target, timeout=45) as response:
        mime = response.headers.get_content_type()
        content = response.read(MAX_PDF_BYTES + 1)
    if len(content) > MAX_PDF_BYTES:
        raise OversizePdfError("PDF exceeds 40 MiB import limit")
    if not content.startswith(b"%PDF-") or mime not in {"application/pdf", "application/octet-stream"}:
        # Drive interstitials and confirmation pages are recorded, never bypassed.
        raise PermissionError(f"Public URL did not return a PDF (content type: {mime})")
    return content, target


def pdf_metadata(data: bytes) -> dict:
    doc = fitz.open(stream=data, filetype="pdf")
    if doc.is_encrypted:
        raise PermissionError("Password-protected PDF")
    meta = doc.metadata or {}
    page_text = "\n".join(doc.load_page(i).get_text() for i in range(min(doc.page_count, 3)))
    return {"doc": doc, "metadata": meta, "text": page_text, "page_count": doc.page_count}


def title_subject(label: str, file_name: str, meta: dict) -> tuple[str, str | None, str | None]:
    title = (label or meta.get("title") or Path(urlparse(file_name).path).name or "").strip()
    title = re.sub(r"\s+", " ", re.sub(r"\.pdf+$", "", title, flags=re.I).replace("_", " ")).strip(" -|")
    if not title:
        title = Path(urlparse(file_name).path).name or "Academic PDF"
    code_match = re.search(r"\b(?:[0-9]{2}[A-Z]{2,5}[0-9A-Z]{2,})\b", title, re.I)
    code = code_match.group(0).upper() if code_match else None
    subject = title
    if code:
        subject = re.sub(re.escape(code), " ", subject, flags=re.I)
    subject = re.sub(r"\(?(?:VVITU|VVIT)\)?", " ", subject, flags=re.I)
    subject = re.sub(r"^\s*(?:CSE|AID|AIML|AI|CSM|CSO|ECE|EEE|IT|ME|CE|CIVIL|MECH)\b", " ", subject, flags=re.I)
    subject = re.sub(r"\b[1-4]\s*[-_/]\s*[12]\b|\bR\s*\d{2}\b", " ", subject, flags=re.I)
    subject = re.sub(r"\b(?:important questions?|previous papers?|(?:mid\s+)?question papers?|notes?|study material|model paper|unit\s*(?:\d+|[ivx]+).*)$", " ", subject, flags=re.I)
    subject = re.sub(r"[\s\-–—:|()]+", " ", subject).strip() or None
    return title, subject, code


def storage_upload(base: str, key: str, bucket: str, data: bytes, mime: str, token: str, upsert: bool):
    url = f"{base.rstrip('/')}/storage/v1/object/{bucket}/{key}"
    req = Request(url, data=data, method="POST", headers={
        "apikey": token, "Authorization": f"Bearer {token}", "Content-Type": mime,
        "x-upsert": "true" if upsert else "false",
    })
    with urlopen(req, timeout=60) as response:
        response.read()
    return key


def db_upsert(base: str, token: str, row: dict):
    url = f"{base.rstrip('/')}/rest/v1/academic_pdfs?on_conflict=source_key"
    req = Request(url, data=json.dumps(row).encode(), method="POST", headers={
        "apikey": token, "Authorization": f"Bearer {token}", "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    })
    with urlopen(req, timeout=45) as response:
        response.read()


def existing_record(base: str, token: str, key: str) -> dict | None:
    url = f"{base.rstrip('/')}/rest/v1/academic_pdfs?source_key=eq.{quote(key)}&select=file_sha256&limit=1"
    req = Request(url, headers={"apikey": token, "Authorization": f"Bearer {token}"})
    with urlopen(req, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8"))
    return result[0] if result else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=os.getenv("VVIT_PDF_SOURCE_URL", "https://cse-vvitu.vercel.app/"))
    parser.add_argument("--max-pages", type=int, default=500)
    parser.add_argument("--discover-only", action="store_true", help="Crawl and report only; do not fetch PDFs or write Supabase")
    parser.add_argument("--audit-only", action="store_true", help="Fetch publicly served PDFs in memory to classify them, without upload or database writes")
    parser.add_argument("--retry-failed", action="store_true", help="Retry is the default; accepted for explicit runbook clarity")
    parser.add_argument("--report", default=str(REPORT_PATH))
    args = parser.parse_args()
    base, token = os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    discovered, crawl_errors = crawl(args.source_url, max(1, args.max_pages))
    totals = {"discovered": len(discovered), "imported": 0, "duplicated": 0, "failed": len(crawl_errors), "excluded": 0, "verified_accessible": 0}
    failed_records, excluded_records = list(crawl_errors), []
    if args.discover_only:
        report = {"source_url": args.source_url, "run_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "max_pages": args.max_pages, "discover_only": True, "totals": totals, "discovered_records": [{"url": url, "label": label, "listing_url": listing} for url, label, listing in discovered], "failed_records": failed_records, "excluded_records": [], "note": "Discovery only. No PDFs or database records were changed."}
        Path(args.report).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0 if not crawl_errors else 1
    if not args.audit_only and (not base or not token):
        fail = {"url": args.source_url, "status": "import_blocked", "error": "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for database/storage writes; use --audit-only without credentials."}
        failed_records.append(fail)
        totals["failed"] += 1
        report = {"source_url": args.source_url, "run_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "max_pages": args.max_pages, "discover_only": False, "audit_only": False, "totals": totals, "failed_records": failed_records, "excluded_records": excluded_records}
        Path(args.report).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 2
    audited_records = []
    for url, label, listing in discovered:
        key = source_key(url)
        academic_year, semester = academic_code(" ".join([url, label, listing]))
        try:
            data, resolved = public_file(url)
            info = pdf_metadata(data)
            title, subject, code = title_subject(label, url, info["metadata"])
            evidence = " ".join([url, label, listing, info["text"][:6000]]).lower()
            domain = urlparse(listing).netloc.lower()
            if "vvit" not in evidence and "vvitu" not in domain:
                totals["excluded"] += 1
                excluded_records.append({"url": url, "status": "excluded", "reason": "No reliable VVIT affiliation evidence found"})
                log(excluded_records[-1])
                continue
            academic_year, semester = academic_code(" ".join([url, label, listing, info["text"][:6000]]))
            if args.audit_only:
                totals["verified_accessible"] += 1
                audited_records.append({"url": url, "source_key": key, "title": title, "subject_name": subject, "subject_code": code, "academic_year": academic_year, "semester": semester, "category": category_for(label or info["text"][:2500]), "status": "verified_accessible_needs_review" if not (academic_year and semester and subject) else "verified_accessible", "file_size": len(data), "page_count": info["page_count"], "pdf_title": info["metadata"].get("title") or None, "text_excerpt": re.sub(r"\s+", " ", info["text"]).strip()[:300]})
                log({"url": url, "source_key": key, "status": audited_records[-1]["status"], "file_size": len(data), "page_count": info["page_count"]})
                continue
            digest = hashlib.sha256(data).hexdigest()
            previous = existing_record(base, token, key)
            if previous and previous.get("file_sha256") == digest:
                totals["duplicated"] += 1
                log({"url": url, "source_key": key, "status": "duplicate_unchanged", "sha256": digest})
                continue
            doc = info["doc"]
            page = doc.load_page(0)
            pix = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
            preview = pix.tobytes("jpeg", jpg_quality=78)
            pdf_path = f"{key}.pdf"
            preview_path = f"{key}.jpg"
            storage_upload(base, key, "academic-pdf-files", data, "application/pdf", token, True)
            storage_upload(base, preview_path, "academic-pdf-previews", preview, "image/jpeg", token, True)
            description = re.sub(r"\s+", " ", info["text"]).strip()[:430]
            if len(description) < 35:
                academic_hint = f", academic term {academic_year}-{semester}" if academic_year and semester else ""
                description = f"{category_for(label).replace('_', ' ').capitalize()} listed as {label or title}{academic_hint}. The PDF has limited extractable text; this description uses its source filename only."
            category = category_for(" ".join([label, url, info["text"][:2500]]))
            row = {
                "title": title, "subject_name": subject, "subject_code": code,
                "academic_year": academic_year, "semester": semester,
                "category": category, "description": description,
                "original_file_name": label or Path(urlparse(url).path).name or title + ".pdf",
                "source_url": url, "source_key": key, "pdf_url": pdf_path,
                "preview_url": f"{base.rstrip('/')}/storage/v1/object/public/academic-pdf-previews/{quote(preview_path)}",
                "file_size": len(data), "page_count": info["page_count"], "file_sha256": digest,
                "university": VVIT_NAME, "is_verified": True,
                "is_published": bool(academic_year and semester and subject),
                "extraction_status": "imported" if academic_year and semester and subject else "needs_review",
                "extraction_error": None if academic_year and semester and subject else "Academic year, semester, or subject was not reliably identified; admin review required.",
            }
            db_upsert(base, token, row)
            totals["imported"] += 1
            log({"url": url, "source_key": key, "status": row["extraction_status"], "sha256": digest})
        except HTTPError as exc:
            status = "restricted" if exc.code in {401, 403, 404, 429} else "source_failed"
            fail = {"url": url, "source_key": key, "status": status, "error": f"HTTP {exc.code}: {exc.reason}"}
            failed_records.append(fail); totals["failed"] += 1; log(fail)
            if base and token and "vvit" in (url + label + listing).lower():
                try:
                    source_title = label.strip() or Path(urlparse(url).path).name or "Academic document"
                    db_upsert(base, token, {"title": source_title, "subject_name": None, "academic_year": academic_year, "semester": semester, "category": category_for(label), "description": "Source file could not be retrieved; metadata and access status need review.", "original_file_name": Path(urlparse(url).path).name or None, "source_url": url, "source_key": key, "university": VVIT_NAME, "is_verified": False, "is_published": False, "extraction_status": status, "extraction_error": fail["error"]})
                except Exception as save_error:
                    log({"url": url, "status": "failure_record_write_failed", "error": str(save_error)})
        except Exception as exc:
            status = "oversize" if isinstance(exc, OversizePdfError) else "restricted" if isinstance(exc, PermissionError) else "invalid_pdf" if isinstance(exc, fitz.FileDataError) else "source_failed"
            fail = {"url": url, "source_key": key, "status": status, "error": str(exc)}
            failed_records.append(fail); totals["failed"] += 1; log(fail)
            if base and token and "vvit" in (url + listing).lower():
                try:
                    source_title = label.strip() or Path(urlparse(url).path).name or "Academic document"
                    db_upsert(base, token, {"title": source_title, "subject_name": None, "academic_year": academic_year, "semester": semester, "category": category_for(label), "description": "Source file could not be retrieved; metadata and access status need review.", "original_file_name": label or Path(urlparse(url).path).name or None, "source_url": url, "source_key": key, "university": VVIT_NAME, "is_verified": False, "is_published": False, "extraction_status": status, "extraction_error": str(exc)})
                except Exception as save_error:
                    log({"url": url, "status": "failure_record_write_failed", "error": str(save_error)})
    report = {"source_url": args.source_url, "run_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "max_pages": args.max_pages, "discover_only": args.discover_only, "audit_only": args.audit_only, "totals": totals, "audited_records": audited_records, "failed_records": failed_records, "excluded_records": excluded_records, "note": "Discovery and audit modes never write to Supabase. A record counts as imported only after source verification, actual PDF and first-page preview upload, and Supabase upsert."}
    Path(args.report).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0 if not crawl_errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
