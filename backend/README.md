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
# Test extraction and export to CSV
python unstop_extractor.py

# Launch HTTP API Server (runs on http://localhost:5001)
python server.py
```

### Endpoints

- `GET /health` — Health check
- `GET /api/categories` — Returns list of 8 supported categories
- `GET /api/opportunities?category=Hackathons&page=1&per_page=20` — Returns normalized opportunities
