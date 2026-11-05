#!/usr/bin/env python3
"""Discover PDFs under Drive folders recorded in Supabase study_resources.

Dry-run is the default. Discovery reads database metadata and Drive listings only;
it never downloads PDFs or writes to Supabase Storage. ``--apply`` inserts new,
unpublished metadata rows into ``academic_pdfs`` after its additive migration.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse, parse_qs
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "drive_index_report.json"
LOG = ROOT / "drive_index_log.jsonl"
FOLDER_MIME = "application/vnd.google-apps.folder"
PDF_MIME = "application/pdf"
ID_PATTERN = re.compile(r"^[\w-]{10,}$")
FOLDER_ID_RE = re.compile(r"/folders/([\w-]+)")
FILE_ID_RE = re.compile(r"/file/d/([\w-]+)")
GOOGLE_API = "https://www.googleapis.com/drive/v3"
RESOURCE_COLUMNS = (
    "id,title,subject,study_year,semester,category,college,degree,regulation,"
    "drive_url,drive_file_id"
)
ACADEMIC_PDF_COLUMNS = "source_key,source_file_id,parent_resource_id"


def drive_id_from_url(value: str | None) -> tuple[str | None, str | None]:
    """Return (kind, ID) for a Drive folder or file URL, if recognized."""
    if not value:
        return None, None
    parsed = urlparse(value.strip())
    if parsed.scheme != "https" or parsed.hostname not in {"drive.google.com", "docs.google.com"}:
        return None, None
    folder = FOLDER_ID_RE.search(parsed.path)
    if folder and ID_PATTERN.fullmatch(folder.group(1)):
        return "folder", folder.group(1)
    file_match = FILE_ID_RE.search(parsed.path)
    file_id = file_match.group(1) if file_match else parse_qs(parsed.query).get("id", [None])[0]
    if file_id and ID_PATTERN.fullmatch(file_id):
        return "file", file_id
    return None, None


class Api:
    def __init__(self, base: str, token: str, google_token: str, page_size: int = 500):
        self.base = base.rstrip("/")
        self.token = token
        self.google_token = google_token
        self.page_size = page_size

    @staticmethod
    def _request(url: str, headers: dict, data: bytes | None = None, retries: int = 5) -> tuple[object, dict]:
        for attempt in range(retries):
            try:
                request = Request(url, data=data, headers=headers, method="POST" if data is not None else "GET")
                with urlopen(request, timeout=45) as response:
                    payload = response.read()
                    return (json.loads(payload) if payload else None), dict(response.headers.items())
            except HTTPError as error:
                if error.code in (429, 500, 502, 503, 504) and attempt + 1 < retries:
                    delay = min(2 ** attempt, 20)
                    if error.code == 429:
                        try:
                            delay = max(delay, int(error.headers.get("Retry-After", "0")))
                        except ValueError:
                            pass
                    time.sleep(delay)
                    continue
                detail = error.read().decode("utf-8", "replace")[:500]
                raise RuntimeError(f"HTTP {error.code}: {detail}") from error
            except (URLError, TimeoutError) as error:
                if attempt + 1 < retries:
                    time.sleep(min(2 ** attempt, 20))
                    continue
                raise RuntimeError(f"Network error: {error}") from error
        raise RuntimeError("Request retries exhausted")

    def supabase_rows(self, table: str, query: dict, page_size: int | None = None) -> list[dict]:
        """Read a complete PostgREST result set using limit/offset pagination."""
        rows: list[dict] = []
        offset, page_size = 0, page_size or self.page_size
        while True:
            params = {**query, "limit": str(page_size), "offset": str(offset)}
            url = f"{self.base}/rest/v1/{table}?{urlencode(params)}"
            data, _ = self._request(url, {"apikey": self.token, "Authorization": f"Bearer {self.token}"})
            batch = data or []
            if not isinstance(batch, list):
                raise RuntimeError(f"Supabase returned an invalid row set for {table}.")
            rows.extend(batch)
            if len(batch) < page_size:
                return rows
            offset += page_size

    def study_resources(self) -> list[dict]:
        return self.supabase_rows("study_resources", {
            "select": RESOURCE_COLUMNS,
            "order": "id.asc",
        })

    def existing_academic_pdfs(self) -> list[dict]:
        return self.supabase_rows("academic_pdfs", {
            "select": ACADEMIC_PDF_COLUMNS,
            "order": "id.asc",
        })

    def drive_children(self, parent_id: str) -> list[dict]:
        if not self.google_token:
            raise RuntimeError("Missing GOOGLE_DRIVE_ACCESS_TOKEN with Drive read-only scope.")
        children, token = [], None
        while True:
            params = {
                "q": f"'{parent_id}' in parents and trashed = false",
                "pageSize": "1000",
                "orderBy": "name",
                "fields": "nextPageToken,files(id,name,mimeType,size,parents,createdTime,modifiedTime,webViewLink,thumbnailLink,trashed)",
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            }
            if token:
                params["pageToken"] = token
            url = f"{GOOGLE_API}/files?{urlencode(params)}"
            data, _ = self._request(url, {"Authorization": f"Bearer {self.google_token}"})
            children.extend(data.get("files", []))
            token = data.get("nextPageToken")
            if not token:
                return children

    def insert_academic_pdfs(self, rows: list[dict]) -> int:
        inserted = 0
        for offset in range(0, len(rows), 100):
            batch = rows[offset:offset + 100]
            url = f"{self.base}/rest/v1/academic_pdfs?on_conflict=source_key"
            data = json.dumps(batch).encode("utf-8")
            result, _ = self._request(url, {
                "apikey": self.token,
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "Prefer": "resolution=ignore-duplicates,return=representation",
            }, data)
            inserted += len(result or [])
        return inserted


def log(entry: dict) -> None:
    entry["at"] = datetime.now(timezone.utc).isoformat()
    with LOG.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(entry, ensure_ascii=False) + "\n")


def resource_folder(row: dict) -> dict | None:
    kind, parsed_id = drive_id_from_url(row.get("drive_url"))
    folder_id = parsed_id if kind == "folder" else None
    if not folder_id and "/folders/" in urlparse(str(row.get("drive_url") or "")).path and ID_PATTERN.fullmatch(str(row.get("drive_file_id") or "")):
        folder_id = row["drive_file_id"]
    if not folder_id:
        return None
    return {**row, "folder_id": folder_id, "root_folder_id": folder_id}


def list_folder_pdfs(api: Api, folder: dict, all_files: dict, visited: set[str], report: dict, depth: int = 0) -> None:
    folder_id = folder["folder_id"]
    if folder_id in visited:
        return
    if depth > 12:
        report["errors"].append({"folder": folder["title"], "folder_id": folder_id, "error": "Nested folder depth limit exceeded"})
        return
    visited.add(folder_id)
    try:
        children = api.drive_children(folder_id)
        report["accessible_folders"] += 1
        log({"event": "folder_listed", "title": folder["title"], "folder_id": folder_id, "child_count": len(children)})
    except Exception as error:
        report["inaccessible_folders"] += 1
        report["errors"].append({"folder": folder["title"], "folder_id": folder_id, "parent_resource_id": folder["id"], "error": str(error)})
        log({"event": "folder_inaccessible", "title": folder["title"], "folder_id": folder_id, "error": str(error)})
        return
    for child in children:
        if child.get("mimeType") == FOLDER_MIME and child.get("id"):
            nested = {**folder, "folder_id": child["id"], "title": f"{folder['title']} / {child.get('name', 'Folder')}"}
            list_folder_pdfs(api, nested, all_files, visited, report, depth + 1)
        elif child.get("mimeType") == PDF_MIME and child.get("id"):
            file_id = child["id"]
            if file_id in all_files:
                report["duplicate_drive_files"] += 1
                continue
            all_files[file_id] = (folder, child)


def academic_year(value: object) -> int | None:
    match = re.search(r"(?<!\d)([1-4])(?!\d)", str(value or ""))
    return int(match.group(1)) if match else None


def semester_number(value: object) -> int | None:
    text = str(value or "").strip().lower()
    if text in {"1", "i", "first", "1st", "semester 1", "sem 1"}:
        return 1
    if text in {"2", "ii", "second", "2nd", "semester 2", "sem 2"}:
        return 2
    return None


def academic_category(value: object) -> str:
    text = str(value or "").strip().lower().replace(" ", "_")
    aliases = {
        "notes": "lecture_notes", "previous_paper": "previous_question_paper",
        "important_questions": "important_questions", "study_guide": "study_materials",
        "lab_manual": "laboratory_manual",
    }
    allowed = {"important_questions", "previous_question_paper", "lecture_notes", "unit_notes", "study_materials", "assignment", "laboratory_manual", "practical_record", "syllabus", "model_question_paper", "reference_material", "other"}
    mapped = aliases.get(text, text)
    return mapped if mapped in allowed else "other"


def academic_pdf_row(parent: dict, item: dict) -> dict:
    file_id = item["id"]
    source_url = f"https://drive.google.com/file/d/{file_id}/view"
    source_key = hashlib.sha256(source_url.encode("utf-8")).hexdigest()
    file_name = item.get("name") or f"{file_id}.pdf"
    return {
        "title": file_name,
        "subject_name": parent.get("subject") or parent.get("title"),
        "subject_code": None,
        "academic_year": academic_year(parent.get("study_year")),
        "semester": semester_number(parent.get("semester")),
        "category": academic_category(parent.get("category")),
        "description": "",
        "college": parent.get("college"),
        "degree": parent.get("degree"),
        "regulation": parent.get("regulation"),
        "original_file_name": file_name,
        "source_url": source_url,
        "source_key": source_key,
        "source_file_id": file_id,
        "parent_resource_id": parent["id"],
        "pdf_url": None,
        "preview_url": None,
        "file_type": PDF_MIME,
        "file_size": int(item["size"]) if str(item.get("size", "")).isdigit() else None,
        "page_count": None,
        "source_created_at": item.get("createdTime"),
        "source_modified_at": item.get("modifiedTime"),
        "university": "Vasireddy Venkatadri Institute of Technology",
        "is_verified": False,
        "is_published": False,
        "extraction_status": "discovered",
    }


def build_report() -> dict:
    return {
        "started_at": datetime.now(timezone.utc).isoformat(), "mode": "dry_run", "status": "incomplete",
        "study_resources_found": None, "folder_count": None, "accessible_folders": 0,
        "inaccessible_folders": 0, "pdfs_discovered": 0, "duplicate_drive_files": 0,
        "existing_academic_pdf_records": None, "proposed_inserts": 0, "proposed_updates": 0,
        "proposed_rows": [], "folder_results": [], "errors": [],
    }


def run_index(api: Api, max_folders: int | None = None, apply: bool = False) -> dict:
    report = build_report()
    resources = api.study_resources()
    report["study_resources_found"] = len(resources)
    by_folder: dict[str, dict] = {}
    for row in resources:
        folder = resource_folder(row)
        if folder:
            by_folder.setdefault(folder["folder_id"], folder)
    folders = list(by_folder.values())
    report["folder_count"] = len(folders)
    if max_folders is not None:
        folders = folders[:max(0, max_folders)]

    if not api.google_token:
        report["errors"].append({"error": "Missing GOOGLE_DRIVE_ACCESS_TOKEN with Drive read-only scope; Drive folders were not requested."})
        report["folder_results"] = [{"title": row.get("title"), "folder_id": row["folder_id"], "parent_resource_id": row["id"], "status": "not_attempted_missing_drive_credentials"} for row in folders]
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        return report

    existing_rows = api.existing_academic_pdfs()
    existing_keys = {row.get("source_key") for row in existing_rows}
    existing_ids = {row.get("source_file_id") for row in existing_rows if row.get("source_file_id")}
    report["existing_academic_pdf_records"] = len(existing_rows)
    candidates: dict[str, tuple[dict, dict]] = {}
    visited: set[str] = set()
    for folder in folders:
        before_ok = report["accessible_folders"]
        before_error = report["inaccessible_folders"]
        list_folder_pdfs(api, folder, candidates, visited, report)
        report["folder_results"].append({
            "title": folder.get("title"), "folder_id": folder["folder_id"],
            "parent_resource_id": folder["id"],
            "status": "inaccessible" if report["inaccessible_folders"] > before_error else "listed" if report["accessible_folders"] > before_ok else "nested_or_duplicate",
        })
    report["pdfs_discovered"] = len(candidates)

    proposed = []
    for file_id, (parent, item) in candidates.items():
        row = academic_pdf_row(parent, item)
        if file_id in existing_ids or row["source_key"] in existing_keys:
            continue
        proposed.append(row)
    report["proposed_inserts"] = len(proposed)
    report["proposed_updates"] = 0
    report["proposed_rows"] = proposed
    if apply:
        report["mode"] = "apply"
        report["inserted_records"] = api.insert_academic_pdfs(proposed)
    report["status"] = "complete" if not report["errors"] else "complete_with_folder_errors"
    report["finished_at"] = datetime.now(timezone.utc).isoformat()
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Insert discovered, unpublished metadata into academic_pdfs")
    parser.add_argument("--max-folders", type=int, help="Limit folder crawling for a small verification run")
    args = parser.parse_args()

    base = os.getenv("SUPABASE_URL") or os.getenv("EXPO_PUBLIC_SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    google_token = os.getenv("GOOGLE_DRIVE_ACCESS_TOKEN", "")
    token = service_key
    missing = [name for name, value in (("SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL", base), ("SUPABASE_SERVICE_ROLE_KEY", token)) if not value]
    if missing:
        report = build_report()
        report["status"] = "blocked_missing_credentials"
        report["errors"].append({"error": "Missing server-only credentials: " + ", ".join(missing) + ". A public anon key cannot read all study_resources under current RLS."})
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({"status": report["status"], "errors": report["errors"]}, indent=2, ensure_ascii=False), file=sys.stderr)
        return 2
    if args.apply and not service_key:
        print("--apply requires server-only SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 2
    if args.apply and os.getenv("STUDOS_ALLOW_PDF_INDEX_IMPORT") != "yes":
        print("--apply is disabled until STUDOS_ALLOW_PDF_INDEX_IMPORT=yes is set after reviewing the dry-run report.", file=sys.stderr)
        return 2

    api = Api(base, token, google_token)
    try:
        report = run_index(api, args.max_folders, args.apply)
    except Exception as error:
        report = build_report()
        report["errors"].append({"error": str(error)})
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log({"event": "run_finished", **{key: report[key] for key in ("mode", "study_resources_found", "folder_count", "accessible_folders", "inaccessible_folders", "pdfs_discovered", "duplicate_drive_files", "proposed_inserts")}})
    summary = {key: report[key] for key in ("mode", "study_resources_found", "folder_count", "accessible_folders", "inaccessible_folders", "pdfs_discovered", "duplicate_drive_files", "existing_academic_pdf_records", "proposed_inserts", "proposed_updates", "inserted_records", "errors") if key in report}
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
