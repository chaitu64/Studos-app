"""Create deterministic demo PDFs, then render their real first-page thumbnails."""
from pathlib import Path
import json
import shutil
import fitz

from resource_service import STORAGE_DIR, process_resource

ASSET_DIR = Path(__file__).resolve().parents[1] / "assets" / "demo-documents"

DOCUMENTS = [
    ("demo-cn-notes", "COMPUTER NETWORKS", "UNIT III — TRANSPORT LAYER", ["TCP Congestion Control", "Sliding Window Protocol", "Flow & Error Control"], "TCP provides reliable, connection-oriented communication using sequence numbers, acknowledgements, and retransmission.", 3),
    ("demo-dsa-paper", "DATA STRUCTURES", "UNIT IV — IMPORTANT QUESTIONS", ["Trees and Graph Traversal", "Hashing", "Dynamic Programming"], "Explain breadth-first and depth-first traversal. Compare their data structures and time complexity with an example.", 2),
    ("demo-dbms-paper", "DATABASE MANAGEMENT SYSTEMS", "PREVIOUS PAPER — SECTION B", ["Normalization", "Transactions", "B+ Tree Indexing"], "Given a relation and functional dependencies, identify candidate keys and decompose the relation into third normal form.", 3),
    ("demo-os-diagrams", "OPERATING SYSTEMS", "UNIT II — PROCESSES & MEMORY", ["Process Scheduling", "Deadlock Graph", "Paging & Virtual Memory"], "A process moves between ready, running, and waiting states while the scheduler allocates CPU time.", 2),
]

def build_pdf(path: Path, title: str, subtitle: str, topics: list[str], sample: str, pages: int) -> None:
    doc = fitz.open()
    for page_index in range(pages):
        page = doc.new_page(width=595, height=842)
        page.draw_rect(fitz.Rect(42, 42, 553, 800), color=(0.72, 0.74, 0.78), width=1)
        page.insert_text((62, 84), title, fontsize=20, fontname="hebo", color=(0.08, 0.1, 0.16))
        page.insert_text((62, 112), f"{subtitle}  •  Page {page_index + 1}", fontsize=10, color=(0.35, 0.38, 0.45))
        y = 160
        for index, topic in enumerate(topics):
            page.insert_text((66, y), f"{index + 1}. {topic}", fontsize=14, fontname="hebo", color=(0.15, 0.18, 0.25))
            page.insert_textbox(fitz.Rect(78, y + 18, 520, y + 75), sample if index == 0 else "Key definitions, worked examples, and exam-focused revision points.", fontsize=10, lineheight=1.4, color=(0.25, 0.28, 0.34))
            y += 112
        if page_index == 0 and "diagrams" in subtitle.lower():
            page.draw_circle((300, 620), 58, color=(0.9, 0.2, 0.2), width=2)
            page.draw_line((190, 620), (242, 620), color=(0.2, 0.3, 0.7), width=2)
            page.draw_line((358, 620), (410, 620), color=(0.2, 0.3, 0.7), width=2)
        page.insert_text((62, 775), "StudOS development sample — generated locally", fontsize=8, color=(0.5, 0.5, 0.55))
    doc.set_metadata({"title": title, "subject": subtitle})
    doc.save(path)
    doc.close()

def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    records = {}
    for resource_id, title, subtitle, topics, sample, pages in DOCUMENTS:
        directory = STORAGE_DIR / resource_id
        directory.mkdir(parents=True, exist_ok=True)
        pdf_path = directory / f"{resource_id}.pdf"
        build_pdf(pdf_path, title, subtitle, topics, sample, pages)
        records[resource_id] = {
            "id": resource_id, "type": "notes", "title": title, "description": subtitle,
            "subject": title.split(" — ")[0], "academicYear": "3rd Year", "semester": "", "branch": "",
            "uploadedBy": "demo", "pdfUrl": f"http://localhost:5001/api/resources/{resource_id}/original",
            "thumbnailUrl": None, "pageCount": pages, "fileSize": pdf_path.stat().st_size,
            "fileType": "application/pdf", "fileName": pdf_path.name, "aiSummary": None,
            "summaryStatus": "unavailable", "keyTopics": topics, "createdAt": "", "thumbnailStatus": "pending",
        }
    (STORAGE_DIR / "resources.json").write_text(json.dumps(records, indent=2), encoding="utf-8")
    for resource_id, *_ in DOCUMENTS:
        process_resource(resource_id, "http://localhost:5001")
        source_dir = STORAGE_DIR / resource_id
        shutil.copy2(source_dir / f"{resource_id}.pdf", ASSET_DIR / f"{resource_id}.pdf")
        shutil.copy2(source_dir / "page-1.png", ASSET_DIR / f"{resource_id}-page-1.png")

if __name__ == "__main__":
    main()
