import unittest

from import_academic_pdfs import academic_code, category_for, normalize_url, source_key, title_subject


class ClassificationTests(unittest.TestCase):
    def test_year_semester_uses_academic_code(self):
        self.assertEqual(academic_code("CSE 2-1 Data Structures"), (2, 1))
        self.assertEqual(academic_code("4th year semester 2"), (4, 2))
        self.assertEqual(academic_code("R23 CSM III-I Question Paper"), (3, 1))
        self.assertEqual(academic_code("calendar year 2026"), (None, None))

    def test_category_classification(self):
        self.assertEqual(category_for("DSA Previous Question Papers"), "previous_question_paper")
        self.assertEqual(category_for("Engineering Mathematics Unit-wise Notes"), "unit_notes")
        self.assertEqual(category_for("Unlabeled file"), "other")

    def test_branch_and_semester_are_not_misclassified_as_subject(self):
        _, subject, _ = title_subject("(VVITU)CSE 2-2 (R23) MID QUESTION PAPERS.pdf", "", {})
        self.assertIsNone(subject)
        _, subject, _ = title_subject("Data Structures Important Questions.pdf", "", {})
        self.assertEqual(subject, "Data Structures")

    def test_drive_normalization_is_stable(self):
        first = normalize_url("https://drive.google.com/file/d/abc123/view?usp=sharing")
        second = normalize_url("https://drive.google.com/open?id=abc123")
        self.assertEqual(first, second)
        self.assertEqual(source_key(first), source_key(second))


if __name__ == "__main__":
    unittest.main()
