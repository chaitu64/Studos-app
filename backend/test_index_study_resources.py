import unittest
from unittest.mock import patch

from backend.index_study_resources import (
    Api, FOLDER_MIME, PDF_MIME, academic_pdf_row, drive_id_from_url,
    list_folder_pdfs, run_index,
)


class FakeApi:
    def __init__(self, resources=None, existing=None, children=None, denied=None):
        self.resources = resources or []
        self.existing = existing or []
        self.children = children or {}
        self.denied = set(denied or [])
        self.google_token = "read-only-token"
        self.insert_calls = []

    def study_resources(self):
        return self.resources

    def existing_academic_pdfs(self):
        return self.existing

    def drive_children(self, folder_id):
        if folder_id in self.denied:
            raise RuntimeError("HTTP 403: permission denied")
        return self.children.get(folder_id, [])

    def insert_academic_pdfs(self, rows):
        self.insert_calls.extend(rows)
        return len(rows)


class StudyResourceIndexerTests(unittest.TestCase):
    def test_reads_all_supabase_pages(self):
        api = Api("https://project.supabase.co", "anon", "drive", page_size=2)
        pages = [[{"id": "1"}, {"id": "2"}], [{"id": "3"}]]
        requests = []

        def fake_request(url, headers, data=None, retries=5):
            requests.append(url)
            return pages.pop(0), {}

        with patch.object(Api, "_request", side_effect=fake_request):
            rows = api.study_resources()
        self.assertEqual([row["id"] for row in rows], ["1", "2", "3"])
        self.assertIn("offset=0", requests[0])
        self.assertIn("offset=2", requests[1])
        self.assertIn("id%2Ctitle%2Csubject", requests[0])
        self.assertNotIn("user_id", requests[0])

    def test_extracts_folder_and_file_ids_from_drive_urls(self):
        self.assertEqual(drive_id_from_url("https://drive.google.com/drive/folders/folder-123456"), ("folder", "folder-123456"))
        self.assertEqual(drive_id_from_url("https://drive.google.com/file/d/file-123456/view"), ("file", "file-123456"))
        self.assertEqual(drive_id_from_url("https://example.com/drive/folders/folder-123456"), (None, None))

    def test_drive_api_pagination_collects_all_children(self):
        api = Api("https://project.supabase.co", "service", "drive", page_size=1)
        responses = [
            ({"files": [{"id": "first-file-1234"}], "nextPageToken": "next-page"}, {}),
            ({"files": [{"id": "second-file-1234"}]}, {}),
        ]
        urls = []

        def fake_request(url, headers, data=None, retries=5):
            urls.append(url)
            return responses.pop(0)

        with patch.object(Api, "_request", side_effect=fake_request):
            files = api.drive_children("root-folder-123456")
        self.assertEqual([item["id"] for item in files], ["first-file-1234", "second-file-1234"])
        self.assertIn("pageToken=next-page", urls[1])

    def test_discovers_nested_pdfs_and_preserves_parent_association(self):
        parent = {"id": "subject-row", "title": "Math I", "subject": "Mathematics 1", "study_year": "1", "semester": "1", "category": "notes", "drive_url": "https://drive.google.com/drive/folders/root-folder-123456"}
        pdf = {"id": "file-pdf-123456", "name": "Unit 1 notes.pdf", "mimeType": PDF_MIME, "size": "4096"}
        api = FakeApi(resources=[parent], children={
            "root-folder-123456": [pdf, {"id": "nested-folder-123456", "name": "Unit 1", "mimeType": FOLDER_MIME}],
            "nested-folder-123456": [pdf],
        })
        with patch("backend.index_study_resources.log"):
            report = run_index(api)
        self.assertEqual(report["study_resources_found"], 1)
        self.assertEqual(report["folder_count"], 1)
        self.assertEqual(report["accessible_folders"], 2)
        self.assertEqual(report["pdfs_discovered"], 1)
        self.assertEqual(report["duplicate_drive_files"], 1)
        row = report["proposed_rows"][0]
        self.assertEqual(row["parent_resource_id"], parent["id"])
        self.assertEqual(row["subject_name"], "Mathematics 1")
        self.assertEqual(row["source_file_id"], pdf["id"])
        self.assertEqual(row["title"], "Unit 1 notes.pdf")
        self.assertEqual(row["file_size"], 4096)
        self.assertIsNone(row["pdf_url"])
        self.assertFalse(row["is_published"])

    def test_inaccessible_folder_is_reported_without_aborting_run(self):
        parent = {"id": "private-row", "title": "Private", "subject": "Networks", "drive_url": "https://drive.google.com/drive/folders/private-folder-1234"}
        api = FakeApi(resources=[parent], denied={"private-folder-1234"})
        with patch("backend.index_study_resources.log"):
            report = run_index(api)
        self.assertEqual(report["inaccessible_folders"], 1)
        self.assertIn("permission denied", report["errors"][0]["error"])
        self.assertEqual(report["proposed_inserts"], 0)

    def test_idempotency_uses_drive_file_id_and_source_key(self):
        parent = {"id": "parent-row", "title": "DBMS", "subject": "Database Management Systems", "drive_url": "https://drive.google.com/drive/folders/root-folder-123456"}
        pdf = {"id": "file-pdf-123456", "name": "DBMS.pdf", "mimeType": PDF_MIME}
        expected = academic_pdf_row(parent, pdf)
        api = FakeApi(resources=[parent], existing=[{"source_key": expected["source_key"], "source_file_id": pdf["id"]}], children={"root-folder-123456": [pdf]})
        with patch("backend.index_study_resources.log"):
            report = run_index(api, apply=True)
        self.assertEqual(report["pdfs_discovered"], 1)
        self.assertEqual(report["proposed_inserts"], 0)
        self.assertEqual(report["proposed_updates"], 0)
        self.assertEqual(api.insert_calls, [])

    def test_apply_only_inserts_new_unpublished_metadata(self):
        parent = {"id": "parent-row", "title": "Machine Learning", "subject": "Machine Learning", "drive_url": "https://drive.google.com/drive/folders/root-folder-123456"}
        pdf = {"id": "file-pdf-987654", "name": "ML notes.pdf", "mimeType": PDF_MIME}
        api = FakeApi(resources=[parent], children={"root-folder-123456": [pdf]})
        with patch("backend.index_study_resources.log"):
            report = run_index(api, apply=True)
        self.assertEqual(report["proposed_inserts"], 1)
        self.assertEqual(len(api.insert_calls), 1)
        self.assertFalse(api.insert_calls[0]["is_verified"])
        self.assertFalse(api.insert_calls[0]["is_published"])


if __name__ == "__main__":
    unittest.main()
