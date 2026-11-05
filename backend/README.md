# StudOs Opportunities Backend & Extractor

This directory contains the Python modules for extracting, normalizing, deduplicating, and serving real opportunities from Unstop.

## Features

- **8 Retained Categories**:
  - Hackathons
  - Internships
  - Jobs
  - Competitions
  - Quizzes
  - Scholarships
  - Workshops
  - Conferences / Meets
  *(Cultural Events removed)*
- **Structured Logging & Timing**: Per-category extraction benchmarks with timestamps.
- **Normalization**: Standardized organizer logos, banners, team sizes, deadlines, countdowns, eligibility, prize amounts, and official source links.
- **Deduplication**: Stable source ID deduplication across multi-page fetches.
- **In-Memory TTL Caching**: High-performance caching to avoid redundant network round-trips.
- **CSV Export**: Verified CSV export functionality for analytical verification.
- **Zero-Dependency Server**: Uses Python's standard library `http.server` with CORS enabled on port 5001.

## Quick Start

```bash
pip install -r backend/requirements.txt
python backend/generate_demo_pdfs.py
# Test extraction and export to CSV
python unstop_extractor.py

# Launch HTTP API Server (runs on http://localhost:5001)
python server.py
```

## Legacy local PDF prototype

The HTTP PDF upload/render endpoints below are legacy development prototype code and are not called by the current Expo app. The STUDOS Study Hub workflow uses contributor-owned Google Drive links and Supabase metadata (`study_resources`); it must not send PDFs to this backend, Supabase Storage, or a proxy/viewer endpoint.

Do not enable the legacy routes for production Study Hub traffic. They are retained so existing local prototype data and developer experiments are not silently removed.

### Legacy endpoints (development only)

- `POST /api/resources` accepts `multipart/form-data` with a PDF field named `pdf`.
- `GET /api/resources/:id` returns metadata and processing status.
- `GET /api/resources/:id/thumbnail` returns the actual rendered first page.
- `GET /api/resources/:id/pages/:page.png` lazily renders a viewer page.
- `GET /api/resources/:id/original` returns the unmodified uploaded PDF.

PyMuPDF performs validation, metadata/text extraction, first-page rendering, and
lazy viewer-page rendering. Original files and PNG derivatives are stored under
`backend/storage/resources`; resource records contain URLs and metadata only.

## Study Hub Drive PDF indexing

`index_study_resources.py` reads all Drive-linked parent records directly from
`public.study_resources` using PostgREST pagination, recursively lists accessible
Drive folder contents with the Drive API v3, and finds PDF files only. Supabase
is the sole source of folder metadata; no workbook, CSV, or JSON input is used.
It does not download or copy PDFs. The default is a dry run; it writes a JSON
report and JSONL log under `backend/` and does not change Supabase. It proposes
new, unpublished `academic_pdfs` metadata rows and only inserts them with
`--apply` after migration 006 and explicit write enablement.

Before indexing, execute migrations 004 and 006 in the Supabase SQL Editor if
they are not already installed. Migration 004 adds Drive file indexing fields
to `study_resources`; migration 006 adds source file ID and parent metadata to
`academic_pdfs`. Both are additive.

Run from PowerShell after setting the values in that terminal session. Keep the
service key and OAuth token out of Expo `.env` files, source control, and chat.
The Drive token must have the read-only `https://www.googleapis.com/auth/drive.readonly`
scope and the account must already have permission to read the folders.

```powershell
$env:SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<server-only service role key>'
$env:GOOGLE_DRIVE_ACCESS_TOKEN = '<OAuth access token with Drive read-only scope>'
python backend/index_study_resources.py
```

Review `backend/drive_index_report.json` first. It reports database resource and
folder counts, accessible/inaccessible folders, unique Drive PDFs, duplicate
file IDs, existing records, proposed inserts, and errors. Discovered records
remain unpublished with no `pdf_url` until an authorized PDF delivery method is
configured. After reviewing and approving the proposed metadata inserts, set:

```powershell
$env:STUDOS_ALLOW_PDF_INDEX_IMPORT = 'yes'
python backend/index_study_resources.py --apply
```

Imported metadata inherits academic details and the parent resource ID while
preserving the Drive file ID, filename, MIME type, and size. Indexing does not
grant students access to source PDFs or copy document bytes. The private Storage
reader serves only PDFs with a valid stored `pdf_url` and published/verified
metadata; newly discovered records remain unreadable until an authorized
delivery process populates those fields.

### Endpoints

- `GET /health` — Health check
- `GET /api/categories` — Returns list of 8 supported categories
- `GET /api/opportunities?category=Hackathons&page=1&per_page=20` — Returns normalized opportunities
