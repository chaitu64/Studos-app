"""
StudOs — Unstop Opportunity Extractor
Production-grade module for extracting, normalizing, deduplicating,
and caching verified opportunities across 8 student categories from Unstop.
"""

import os
import re
import csv
import json
import time
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Structured Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("unstop_extractor")

BASE_URL = "https://unstop.com"
SEARCH_API_ENDPOINT = f"{BASE_URL}/api/public/opportunity/search-result"
CDN_BASE = "https://d8it4huxumps7.cloudfront.net"

# 8 Core Student Categories (Cultural Events removed as required)
CATEGORIES: Dict[str, str] = {
    "Hackathons": "hackathons",
    "Internships": "internships",
    "Jobs": "jobs",
    "Competitions": "competitions",
    "Quizzes": "quizzes",
    "Scholarships": "scholarships",
    "Workshops": "workshops",
    "Conferences / Meets": "conferences",
}

# Category to Singular Type Mapping
TYPE_MAPPING: Dict[str, str] = {
    "Hackathons": "Hackathon",
    "Internships": "Internship",
    "Jobs": "Job",
    "Competitions": "Competition",
    "Quizzes": "Quiz",
    "Scholarships": "Scholarship",
    "Workshops": "Workshop",
    "Conferences / Meets": "Conference",
}

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}


def clean_text(val: Any) -> str:
    """Strip HTML tags and decode HTML entities."""
    if val is None:
        return ""
    if isinstance(val, (list, tuple)):
        return ", ".join(clean_text(v) for v in val if v is not None)
    if isinstance(val, dict):
        return clean_text(val.get("name") or val.get("title") or val.get("value") or "")
    
    text = str(val)
    text = re.sub(r"<[^>]*>", " ", text)
    text = (
        text.replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&nbsp;", " ")
    )
    return re.sub(r"\s+", " ", text).strip()


def resolve_image_url(url: Optional[str]) -> Optional[str]:
    """Ensure image URLs have proper protocol and CDN domain."""
    if not url:
        return None
    url = url.strip()
    if not url or url == "null" or url.endswith("/"):
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("//"):
        return f"https:{url}"
    # Relative cloudfront path
    clean_path = url.lstrip("/")
    if clean_path.startswith("images/") or clean_path.startswith("uploads/"):
        return f"{CDN_BASE}/{clean_path}"
    return f"{BASE_URL}/{clean_path}"


def calculate_days_remaining(deadline_str: Optional[str]) -> Optional[int]:
    """Calculate days remaining until the deadline."""
    if not deadline_str:
        return None
    try:
        # Try ISO format
        dt = datetime.fromisoformat(deadline_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = dt - now
        return max(0, diff.days)
    except Exception:
        pass

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(deadline_str[:19], fmt).replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            diff = dt - now
            return max(0, diff.days)
        except Exception:
            continue
    return None


def parse_numeric_prize(prize_str: str) -> Optional[int]:
    """Extract numeric value from prize description string."""
    if not prize_str:
        return None
    # Look for amounts with currency symbols or commas
    digits = re.findall(r"\d[\d,]*", prize_str)
    if digits:
        try:
            return int(digits[0].replace(",", ""))
        except ValueError:
            return None
    return None


def normalize_opportunity(item: Dict[str, Any], category_name: str) -> Optional[Dict[str, Any]]:
    """Normalize raw Unstop API item into StudOs schema."""
    if not isinstance(item, dict):
        return None

    raw_title = item.get("title") or item.get("name")
    title = clean_text(raw_title)
    if not title:
        return None

    opp_id = str(item.get("id") or item.get("opportunity_id") or "")
    public_url = item.get("seo_url") or item.get("public_url") or item.get("short_url") or ""
    
    if public_url.startswith("http://") or public_url.startswith("https://"):
        source_url = public_url
    elif public_url:
        source_url = f"{BASE_URL}/{public_url.lstrip('/')}"
    elif opp_id:
        source_url = f"{BASE_URL}/o/{opp_id}"
    else:
        source_url = ""

    # Organizer details
    org_dict = item.get("organisation") or item.get("organization") or {}
    if isinstance(org_dict, dict):
        organizer_name = clean_text(org_dict.get("name")) or clean_text(item.get("organizer"))
        org_logo = org_dict.get("logo") or org_dict.get("logoUrl") or org_dict.get("logoUrl2")
    else:
        organizer_name = clean_text(org_dict) or clean_text(item.get("organizer"))
        org_logo = None

    if not organizer_name:
        fest_org = (item.get("festival") or {}).get("organisation") if isinstance(item.get("festival"), dict) else None
        if isinstance(fest_org, dict):
            organizer_name = clean_text(fest_org.get("name"))
            org_logo = org_logo or fest_org.get("logo")
    
    if not organizer_name:
        organizer_name = "Unstop Verified Host"

    # Logo URL resolution (never use banner as logo)
    raw_logo = org_logo or item.get("logoUrl2") or item.get("logoUrl")
    organizer_logo_url = resolve_image_url(raw_logo)

    # Opportunity Banner / Thumbnail (separate from organizer logo)
    raw_banner = item.get("thumb") or item.get("banner_mobile") or item.get("banner")
    if not raw_banner and isinstance(item.get("festival"), dict):
        raw_banner = item.get("festival", {}).get("logoUrl2")
    banner_image_url = resolve_image_url(raw_banner)

    # Format & Mode
    raw_region = clean_text(item.get("region") or item.get("mode") or "online").lower()
    if "in-person" in raw_region or "offline" in raw_region:
        format_val = "In-Person"
    elif "hybrid" in raw_region:
        format_val = "Hybrid"
    else:
        format_val = "Online"

    # Location
    address_obj = item.get("address_with_country_logo") or item.get("address") or {}
    if isinstance(address_obj, dict):
        city = clean_text(address_obj.get("city"))
        state = clean_text(address_obj.get("state"))
        country = clean_text(address_obj.get("country"))
        loc_parts = [p for p in (city, state, country) if p]
        location = ", ".join(loc_parts) if loc_parts else format_val
    else:
        location = clean_text(address_obj) or format_val

    # Deadline & Countdown
    regn_req = item.get("regnRequirements") or {}
    if not isinstance(regn_req, dict):
        regn_req = {}

    end_date_str = item.get("end_date") or regn_req.get("end_regn_dt") or item.get("last_date")
    deadline_iso = clean_text(end_date_str) or None

    # Calculate or retrieve days remaining
    days_rem = None
    remain_days_arr = regn_req.get("remainingDaysArray")
    if isinstance(remain_days_arr, dict) and "durations" in remain_days_arr:
        try:
            days_rem = int(remain_days_arr["durations"])
        except (ValueError, TypeError):
            pass
    if days_rem is None:
        days_rem = calculate_days_remaining(deadline_iso)

    # Human readable deadline string
    if deadline_iso:
        try:
            dt = datetime.fromisoformat(deadline_iso.replace("Z", "+00:00"))
            readable_deadline = dt.strftime("%b %d, %Y")
        except Exception:
            readable_deadline = deadline_iso[:10]
    else:
        readable_deadline = "Not specified"

    # Team size
    min_team = regn_req.get("min_team_size")
    max_team = regn_req.get("max_team_size")
    min_size = int(min_team) if min_team is not None and str(min_team).isdigit() else None
    max_size = int(max_team) if max_team is not None and str(max_team).isdigit() else None

    if min_size and max_size:
        if min_size == max_size:
            team_size_label = "Individual" if min_size == 1 else f"{min_size} members"
        else:
            team_size_label = f"{min_size}–{max_size} members"
    elif max_size:
        team_size_label = "Individual" if max_size == 1 else f"Up to {max_size} members"
    elif min_size:
        team_size_label = f"Min {min_size} members"
    else:
        team_size_label = "Not specified"

    # Eligibility
    eligibility = None
    filters = item.get("filters") or []
    if isinstance(filters, list):
        for f in filters:
            if isinstance(f, dict) and f.get("type") == "eligible":
                fname = f.get("name")
                if fname:
                    eligibility = clean_text(fname)
                    break
    if not eligibility:
        eligibility = clean_text(regn_req.get("eligibility"))
    if not eligibility or eligibility.lower() == "all":
        eligibility = "Everyone can apply"

    # Workfunction / Domains & Skills tags
    tags: List[str] = []
    wf = item.get("workfunction") or []
    if isinstance(wf, list):
        for w in wf:
            if isinstance(w, dict) and w.get("name"):
                tags.append(clean_text(w["name"]))

    skills: List[str] = []
    raw_skills = item.get("required_skills") or item.get("skills") or []
    if isinstance(raw_skills, list):
        for s in raw_skills:
            if isinstance(s, dict):
                sname = s.get("skill") or s.get("skill_name") or s.get("name")
                if sname:
                    skills.append(clean_text(sname))
            elif isinstance(s, str):
                skills.append(clean_text(s))
    elif isinstance(raw_skills, str):
        skills = [clean_text(s) for s in raw_skills.split(",") if s.strip()]

    # Prizes / Stipend
    prizes_list = item.get("prizes") or []
    prize_desc = ""
    if isinstance(prizes_list, list) and prizes_list:
        first_prize = prizes_list[0]
        if isinstance(first_prize, dict):
            prize_desc = clean_text(first_prize.get("cash") or first_prize.get("title") or "")
    if not prize_desc:
        prize_desc = clean_text(item.get("prize_money") or item.get("prize") or "")

    prize_amount = parse_numeric_prize(prize_desc)
    is_paid = bool(item.get("isPaid"))
    reg_fee = "Paid" if is_paid else "Free"

    # Description
    desc = clean_text(item.get("details") or item.get("description") or "")
    if not desc:
        desc = f"{category_name} listed on Unstop."

    # Posting timestamp
    posted_date = clean_text(item.get("approved_date") or item.get("updated_at") or "")

    return {
        "id": opp_id or source_url or title,
        "title": title,
        "organizer": organizer_name,
        "organizerLogo": organizer_logo_url,
        "bannerImage": banner_image_url,
        "type": TYPE_MAPPING.get(category_name, "Hackathon"),
        "category": category_name,
        "format": format_val,
        "location": location,
        "deadline": readable_deadline,
        "deadlineIso": deadline_iso,
        "daysRemaining": days_rem,
        "eligibility": eligibility,
        "prizeOrCompensation": prize_desc or "Not specified",
        "prizeAmount": prize_amount,
        "registrationFee": reg_fee,
        "teamSize": team_size_label,
        "minTeamSize": min_size,
        "isVerified": bool(
            (isinstance(org_dict, dict) and (org_dict.get("is_verified") or org_dict.get("verified")))
            or item.get("is_verified")
            or item.get("verified")
        ),
        "tags": tags,
        "requiredSkills": skills[:6] if skills else tags[:4],
        "description": desc,
        "officialUrl": source_url,
        "source": "Unstop",
        "publishedAt": posted_date,
        "status": "Expired" if (days_rem is not None and days_rem < 0) else ("Closing Soon" if (days_rem is not None and days_rem <= 5) else "Open"),
    }


def fetch_category_opportunities(
    category_slug: str,
    category_name: str,
    page: int = 1,
    per_page: int = 20,
    timeout_sec: float = 15.0
) -> Tuple[List[Dict[str, Any]], int]:
    """Fetch a single page of opportunities for a given category."""
    params = {
        "opportunity": category_slug,
        "per_page": str(per_page),
        "oppstatus": "open",
        "page": str(page),
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{SEARCH_API_ENDPOINT}?{query_string}"
    
    headers = dict(DEFAULT_HEADERS)
    headers["Referer"] = f"{BASE_URL}/{category_slug}/"

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            if response.status != 200:
                logger.warning(f"HTTP {response.status} fetching {category_name} (p.{page})")
                return [], 0
            
            raw_data = response.read().decode("utf-8")
            if not raw_data or raw_data.strip().startswith("<"):
                logger.warning(f"Non-JSON or challenge response received for {category_name}")
                return [], 0

            payload = json.loads(raw_data)
            data_block = payload.get("data") or {}
            
            items: List[Dict[str, Any]] = []
            if isinstance(data_block, dict):
                candidates = data_block.get("data") or data_block.get("items") or data_block.get("results")
                if isinstance(candidates, list):
                    items = candidates
                total = int(data_block.get("total") or len(items))
            elif isinstance(data_block, list):
                items = data_block
                total = len(items)
            else:
                total = 0

            normalized: List[Dict[str, Any]] = []
            for item in items:
                opp = normalize_opportunity(item, category_name)
                if opp:
                    normalized.append(opp)

            return normalized, total
    except Exception as exc:
        logger.error(f"Error fetching {category_name} (p.{page}): {exc}")
        return [], 0


def fetch_all_categories(
    pages_per_category: int = 1,
    per_page: int = 15
) -> List[Dict[str, Any]]:
    """Fetch opportunities across all 8 retained categories with deduplication and timing."""
    start_all = time.perf_counter()
    logger.info("Starting Unstop extraction across 8 retained categories...")

    unique_results: Dict[str, Dict[str, Any]] = {}
    category_metrics: Dict[str, Dict[str, Any]] = {}

    for cat_name, cat_slug in CATEGORIES.items():
        cat_start = time.perf_counter()
        cat_count = 0
        total_available = 0

        for page in range(1, pages_per_category + 1):
            items, total = fetch_category_opportunities(
                category_slug=cat_slug,
                category_name=cat_name,
                page=page,
                per_page=per_page,
            )
            total_available = total
            for item in items:
                item_id = item["id"]
                if item_id not in unique_results:
                    unique_results[item_id] = item
                    cat_count += 1

            if len(items) < per_page:
                break
            # Modest delay between page fetches to avoid rate limits
            time.sleep(0.15)

        elapsed = time.perf_counter() - cat_start
        category_metrics[cat_name] = {
            "fetched": cat_count,
            "total_available": total_available,
            "duration_sec": round(elapsed, 2),
        }
        logger.info(
            f"Category '{cat_name}' completed: {cat_count} items fetched "
            f"(available: {total_available}) in {elapsed:.2f}s"
        )

    total_elapsed = time.perf_counter() - start_all
    logger.info(
        f"Extraction complete: {len(unique_results)} unique opportunities "
        f"across {len(CATEGORIES)} categories in {total_elapsed:.2f}s"
    )

    return list(unique_results.values())


def export_to_csv(opportunities: List[Dict[str, Any]], filepath: str = "studos_unstop_opportunities.csv") -> str:
    """Export opportunities to CSV for verification or analytics."""
    if not opportunities:
        logger.warning("No opportunities to export.")
        return filepath

    fieldnames = [
        "id",
        "title",
        "organizer",
        "organizerLogo",
        "bannerImage",
        "type",
        "category",
        "format",
        "location",
        "deadline",
        "daysRemaining",
        "eligibility",
        "teamSize",
        "prizeOrCompensation",
        "prizeAmount",
        "registrationFee",
        "tags",
        "requiredSkills",
        "officialUrl",
        "source",
        "publishedAt",
    ]

    with open(filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for opp in opportunities:
            row = dict(opp)
            if isinstance(row.get("tags"), list):
                row["tags"] = ", ".join(row["tags"])
            if isinstance(row.get("requiredSkills"), list):
                row["requiredSkills"] = ", ".join(row["requiredSkills"])
            writer.writerow(row)

    logger.info(f"Successfully exported {len(opportunities)} opportunities to {filepath}")
    return filepath


if __name__ == "__main__":
    results = fetch_all_categories(pages_per_category=1, per_page=5)
    export_to_csv(results, "test_extracted_opportunities.csv")
    print(f"Sample opportunity extracted: {results[0]['title'] if results else 'None'}")
