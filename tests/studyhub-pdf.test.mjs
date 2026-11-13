import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildStudyHubPdfQuery, dedupeStudyPdfs, isIndividualStudyPdf, toStudyHubPdfResource } from '../src/services/studyHubPdf.ts';

const row = (overrides = {}) => ({
  id: 'row-1', user_id: 'user-1', title: 'M-1', subject: 'Mathematics 1', category: 'notes',
  study_year: 1, semester: '1', college: 'VVIT', degree: 'B.Tech', regulation: 'R23',
  pdf_file_name: 'Module 1 notes.pdf', pdf_link: 'https://drive.google.com/file/d/file-id-123456/view',
  file_size_mb: 2.5, source_folder_url: 'https://drive.google.com/drive/folders/folder-id-123456',
  drive_file_id: 'file-id-123456', created_at: '2025-01-02T00:00:00.000Z',
  author_profile: { first_name: 'STUDOS', last_name: '', college: 'VVIT' }, saved_resources: [],
  ...overrides,
});

test('individual PDF validation requires a named file and an individual Drive file URL', () => {
  assert.equal(isIndividualStudyPdf(row()), true);
  assert.equal(isIndividualStudyPdf(row({ pdf_link: 'https://drive.google.com/drive/folders/folder-id-123456' })), false);
  assert.equal(isIndividualStudyPdf(row({ pdf_file_name: '  ' })), false);
  assert.equal(isIndividualStudyPdf(row({ pdf_link: '' })), false);
  assert.equal(isIndividualStudyPdf(row({ drive_file_id: 'different-file-1234' })), false);
});

test('dedupe uses Drive file IDs and keeps same-title PDFs with different IDs', () => {
  const first = row();
  const duplicate = row({ id: 'row-duplicate', pdf_file_name: 'Copy of Module 1.pdf' });
  const sameTitleDifferentPdf = row({ id: 'row-2', drive_file_id: 'another-file-123456', pdf_link: 'https://drive.google.com/file/d/another-file-123456/view' });
  assert.deepEqual(dedupeStudyPdfs([first, duplicate, sameTitleDifferentPdf]).map((item) => item.id), ['row-1', 'row-2']);
});

test('mapping uses pdf_link and actual filename while keeping folder provenance separate', () => {
  const resource = toStudyHubPdfResource(row());
  assert.equal(resource.fileName, 'Module 1 notes.pdf');
  assert.equal(resource.pdfFileName, 'Module 1 notes.pdf');
  assert.equal(resource.pdfUrl, 'https://drive.google.com/file/d/file-id-123456/view');
  assert.equal(resource.sourceFolderUrl, 'https://drive.google.com/drive/folders/folder-id-123456');
  assert.equal(resource.title, 'M-1');
  assert.equal(resource.fileSizeMb, 2.5);
  assert.equal(resource.uploader.name, 'STUDOS');
  assert.equal(resource.resourceKind, 'pdf');
});

test('Supabase PDF query selects individual-file fields, applies search/filters, and paginates without owner filtering', () => {
  const calls = [];
  const builder = {};
  for (const method of ['select', 'not', 'neq', 'order', 'range', 'eq', 'ilike', 'or']) {
    builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  }
  const db = { from: (table) => { calls.push(['from', table]); return builder; } };
  buildStudyHubPdfQuery(db, { search: 'Module 1', studyYear: 2, semester: '2', subject: 'Computer Networks', category: 'notes', offset: 24, limit: 24 });
  assert.equal(calls.find(([method]) => method === 'from')[1], 'study_resources');
  const select = calls.find(([method]) => method === 'select')[1];
  for (const column of ['pdf_file_name', 'pdf_link', 'file_size_mb', 'source_folder_url', 'drive_file_id']) assert.match(select, new RegExp(column));
  assert.deepEqual(calls.filter(([method]) => method === 'not').map(([, column, operator, value]) => [column, operator, value]), [['pdf_link', 'is', null], ['pdf_file_name', 'is', null]]);
  assert.deepEqual(calls.find(([method]) => method === 'range').slice(1), [24, 47]);
  assert.deepEqual(calls.find(([method]) => method === 'or').slice(1), ['pdf_file_name.ilike.%Module 1%,subject.ilike.%Module 1%,title.ilike.%Module 1%']);
  assert.equal(calls.some((call) => call[1] === 'user_id'), false);
  assert.deepEqual(calls.filter(([method]) => method === 'eq').map(([, column, value]) => [column, value]), [['study_year', 2], ['category', 'notes']]);
  assert.deepEqual(calls.filter(([method]) => method === 'ilike').map(([, column, value]) => [column, value]), [['semester', '%2%'], ['subject', '%Computer Networks%']]);
});

test('Study Hub reads the existing study_resources table without requiring Academic Library migration 003', () => {
  const screen = readFileSync(new URL('../src/app/academic-library/index.tsx', import.meta.url), 'utf8');
  assert.match(screen, /listStudyHubPdfPage/);
  assert.doesNotMatch(screen, /academicPdfService|academic_pdfs|migration 003/i);
});

test('resource detail keeps nullable PDF metadata and relations optional', () => {
  const resource = toStudyHubPdfResource(row({ file_size_mb: null, source_folder_url: null, author_profile: null, saved_resources: undefined }));
  assert.equal(resource.pdfUrl, row().pdf_link);
  assert.equal(resource.fileName, row().pdf_file_name);
  assert.equal(resource.college, row().college);
  assert.equal(resource.fileSizeMb, undefined);
  assert.equal(resource.sourceFolderUrl, undefined);
  assert.equal(resource.uploader.name, 'Student');

  assert.equal(toStudyHubPdfResource(row({ college: null })).college, undefined);

  const calls = [];
  const builder = {};
  for (const method of ['select', 'not', 'neq', 'order', 'range', 'eq', 'ilike', 'or']) {
    builder[method] = (...args) => { calls.push([method, ...args]); return builder; };
  }
  const db = { from: (table) => { calls.push(['from', table]); return builder; } };
  buildStudyHubPdfQuery(db, {}, false);
  const select = calls.find(([method]) => method === 'select')[1];
  assert.doesNotMatch(select, /profiles\(|saved_resources\(/);
  assert.equal(calls.find(([method]) => method === 'from')[1], 'study_resources');
});
