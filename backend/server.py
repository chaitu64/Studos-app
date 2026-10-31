"""
StudOs — Opportunities Backend Server
Lightweight HTTP service exposing normalized Unstop opportunities with
caching, pagination, search, and category filtering.
Zero heavy dependencies required: runs on Python's built-in http.server.
"""

import json
import logging
import cgi
import mimetypes
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, Any, Optional
from resource_service import (
    PdfValidationError,
    create_resource,
    get_resource,
    list_resources,
    resource_file,
)

from unstop_extractor import (
    CATEGORIES,
    fetch_category_opportunities,
    fetch_all_categories,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("studos_backend")

# In-memory TTL Cache (15 minutes)
CACHE_TTL_SECONDS = 900
_cached_opportunities: List[Dict[str, Any]] = []
_last_fetch_time: float = 0


def get_cached_opportunities(force_refresh: bool = False) -> List[Dict[str, Any]]:
    global _cached_opportunities, _last_fetch_time
    now = time.time()
    if force_refresh or not _cached_opportunities or (now - _last_fetch_time > CACHE_TTL_SECONDS):
        logger.info("Cache miss or refresh requested: fetching fresh opportunities from Unstop...")
        _cached_opportunities = fetch_all_categories(pages_per_category=2, per_page=15)
        _last_fetch_time = now
    return _cached_opportunities


class StudOsApiHandler(BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy", "service": "studos-unstop-api"}).encode("utf-8"))
            return

        if path == "/api/categories":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({
                "categories": list(CATEGORIES.keys())
            }).encode("utf-8"))
            return

        if path == "/api/resources":
            self.send_json({"items": list(list_resources())})
            return

        if path.startswith("/api/resources/"):
            parts = [part for part in path.split("/") if part]
            resource_id = parts[2] if len(parts) > 2 else ""
            if len(parts) == 3:
                resource = get_resource(resource_id)
                if resource:
                    self.send_json(resource)
                else:
                    self.send_json({"error": "Resource not found"}, 404)
                return
            kind = parts[3] if len(parts) > 3 else ""
            page_number = None
            if kind == "pages" and len(parts) == 5:
                try:
                    page_number = int(parts[4].split(".")[0])
                    kind = "page"
                except ValueError:
                    page_number = None
            file_path = resource_file(resource_id, kind, page_number)
            if file_path:
                self.send_file(file_path)
            else:
                self.send_json({"error": "File not found or processing incomplete"}, 404)
            return

        if path == "/api/opportunities":
            force_refresh = params.get("force_refresh", ["false"])[0].lower() == "true"
            category_filter = params.get("category", [None])[0]
            search_query = params.get("search", [""])[0].strip().lower()
            format_filter = params.get("format", [None])[0]
            sort_by = params.get("sort", ["deadline"])[0]
            page = int(params.get("page", ["1"])[0])
            per_page = int(params.get("per_page", ["30"])[0])

            try:
                # If a specific single category is requested and not 'All', we can fetch specifically or from cache
                all_items = get_cached_opportunities(force_refresh=force_refresh)

                filtered = all_items

                # Filter by category
                if category_filter and category_filter != "All":
                    filtered = [o for o in filtered if o.get("category") == category_filter or o.get("type") == category_filter]

                # Filter by format (Online / In-Person / Hybrid)
                if format_filter and format_filter != "All":
                    filtered = [o for o in filtered if o.get("format") == format_filter]

                # Search by title, organizer, skills, tags
                if search_query:
                    filtered = [
                        o for o in filtered
                        if search_query in o.get("title", "").lower()
                        or search_query in o.get("organizer", "").lower()
                        or search_query in o.get("description", "").lower()
                        or any(search_query in str(s).lower() for s in o.get("requiredSkills", []))
                        or any(search_query in str(t).lower() for t in o.get("tags", []))
                    ]

                # Sort
                if sort_by == "deadline":
                    filtered.sort(key=lambda o: (o.get("daysRemaining") if o.get("daysRemaining") is not None else 999))
                elif sort_by == "recent":
                    filtered.sort(key=lambda o: o.get("publishedAt", ""), reverse=True)
                elif sort_by == "prize":
                    filtered.sort(key=lambda o: o.get("prizeAmount") or 0, reverse=True)

                total_count = len(filtered)
                start_idx = (page - 1) * per_page
                end_idx = start_idx + per_page
                paginated_items = filtered[start_idx:end_idx]

                response_body = {
                    "data": paginated_items,
                    "total": total_count,
                    "page": page,
                    "per_page": per_page,
                    "has_more": end_idx < total_count,
                    "cached_at": _last_fetch_time,
                }

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(response_body).encode("utf-8"))
            except Exception as e:
                logger.error(f"Error handling /api/opportunities: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # 404 for unknown endpoints
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/resources":
            self.send_json({"error": "Not found"}, 404)
            return
        content_type = self.headers.get("Content-Type", "")
        if not content_type.startswith("multipart/form-data"):
            self.send_json({"error": "multipart/form-data is required"}, 415)
            return
        try:
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": content_type},
            )
            upload = form["pdf"] if "pdf" in form else None
            if upload is None or not getattr(upload, "file", None):
                self.send_json({"error": "A PDF field named 'pdf' is required"}, 400)
                return
            fields = {
                key: form.getfirst(key, "")
                for key in ("type", "title", "description", "subject", "academicYear", "semester", "branch", "uploadedBy", "createdAt")
            }
            upload.file.seek(0, 2)
            size = upload.file.tell()
            upload.file.seek(0)
            host = self.headers.get("Host", "localhost:5001")
            base_url = f"http://{host}"
            resource = create_resource(
                stream=upload.file,
                file_name=upload.filename or "document.pdf",
                content_type=upload.type or "application/pdf",
                size=size,
                fields=fields,
                base_url=base_url,
            )
            self.send_json(resource, 202)
        except PdfValidationError as exc:
            self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            logger.exception("Resource upload failed")
            self.send_json({"error": str(exc)}, 500)

    def send_json(self, body: Any, status: int = 200):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def send_file(self, path):
        payload = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        logger.info("%s - - [%s] %s" % (self.client_address[0], self.log_date_time_string(), format % args))


def run_server(port: int = 5001):
    server_address = ("", port)
    httpd = HTTPServer(server_address, StudOsApiHandler)
    logger.info(f"StudOs Opportunities API server running on port {port} (http://localhost:{port})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopping server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server(5001)
