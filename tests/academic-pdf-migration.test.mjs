import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../backend/migrations/003_academic_pdf_library.sql', import.meta.url), 'utf8');
const driveSourceSql = readFileSync(new URL('../backend/migrations/006_academic_pdf_drive_sources.sql', import.meta.url), 'utf8');

test('VVIT PDF migration is additive and enforces the academic classification', () => {
  assert.match(sql, /create table if not exists public\.academic_pdfs/i);
  assert.match(sql, /academic_year between 1 and 4/i);
  assert.match(sql, /semester in \(1, 2\)/i);
  assert.match(sql, /year_semester text generated always/i);
  assert.match(sql, /academic_pdfs_search_idx/i);
  assert.match(sql, /academic_pdfs_browse_idx/i);
  assert.doesNotMatch(sql, /drop\s+table/i);
});

test('published PDF read access and admin mutation rules are present', () => {
  assert.match(sql, /alter table public\.academic_pdfs enable row level security/i);
  assert.match(sql, /is_published\s*=\s*true and is_verified\s*=\s*true/i);
  assert.match(sql, /auth\.jwt\(\)\s*->\s*'app_metadata'\s*->>\s*'role'\)\s*=\s*'admin'/i);
  assert.match(sql, /get_academic_pdf_admin_details/i);
  assert.match(sql, /academic-pdf-previews/i);
  assert.match(sql, /academic-pdf-files/i);
  const publicSelect = sql.match(/grant select \(([\s\S]*?)\) on public\.academic_pdfs to anon, authenticated/i)?.[1] || '';
  assert.doesNotMatch(publicSelect, /source_url|source_key|extraction_error/i);
});

test('Drive PDF provenance and parent resource support are additive and deduplicated', () => {
  assert.match(driveSourceSql, /add column if not exists source_file_id text/i);
  assert.match(driveSourceSql, /parent_resource_id uuid references public\.study_resources\(id\)/i);
  assert.match(driveSourceSql, /create unique index if not exists academic_pdfs_source_file_id_idx/i);
  assert.match(driveSourceSql, /source_thumbnail_url text/i);
  assert.doesNotMatch(driveSourceSql, /drop\s+table|delete\s+from/i);
});
