import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sql = await readFile(new URL('../backend/migrations/002_studos_application.sql', import.meta.url), 'utf8');

test('incremental migration preserves existing core tables and local SQL is non-destructive', () => {
  assert.match(sql, /alter table public\.profiles add column if not exists/i);
  assert.match(sql, /alter table public\.posts add column if not exists/i);
  assert.doesNotMatch(sql, /\b(drop\s+table|truncate|delete\s+from\s+public\.(profiles|posts|profile_private))\b/i);
  assert.match(sql, /Never run 001_studos_social\.sql/i);
  assert.doesNotMatch(sql, /^\s*(?:\\i|\\include|\\ir)\s+.*001_studos_social\.sql/im);
});

test('application tables have row security and owner-scoped policies', () => {
  for (const table of ['post_likes', 'post_comments', 'saved_posts', 'post_collaborations', 'study_resources', 'saved_resources', 'resource_reports', 'ideas', 'idea_comments', 'teams', 'projects', 'team_applications', 'saved_opportunities', 'messages', 'notifications', 'reports']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'), `${table} should enable RLS`);
  }
  assert.match(sql, /author_id=auth\.uid\(\)/i);
  assert.match(sql, /user_id=auth\.uid\(\)/i);
  assert.match(sql, /reporter_id=auth\.uid\(\)/i);
  assert.match(sql, /owner_id=auth\.uid\(\)/i);
});

test('private fields and media remain protected by grants and storage folder policies', () => {
  assert.match(sql, /revoke all on public\.profiles from anon, authenticated/i);
  assert.match(sql, /grant select \(id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,created_at,updated_at\) on public\.profiles to authenticated/i);
  assert.match(sql, /profile_private_self[\s\S]*?using\(id=auth\.uid\(\)\) with check\(id=auth\.uid\(\)\)/i);
  assert.match(sql, /storage\.foldername\(name\)\)\[1\]=auth\.uid\(\)::text/i);
  assert.match(sql, /storage\.foldername\(name\)\)\[2\]='posts'/i);
  assert.match(sql, /study_resources[\s\S]*?drive_url text not null[\s\S]*?drive_file_id text not null/i);
  assert.doesNotMatch(sql, /create\s+bucket\s+.*pdf/i);
});

test('migration policy recreation is repeatable and high impact objects use guarded creation', () => {
  const createdPolicies = [...sql.matchAll(/create policy ([a-z0-9_]+)/gi)].map((match) => match[1].toLowerCase());
  const droppedPolicies = new Set([...sql.matchAll(/drop policy if exists ([a-z0-9_]+)/gi)].map((match) => match[1].toLowerCase()));
  for (const policy of createdPolicies) assert.ok(droppedPolicies.has(policy), `policy ${policy} must be dropped before recreation`);
  assert.match(sql, /create table if not exists public\.study_resources/i);
  assert.match(sql, /create table if not exists public\.team_applications/i);
  assert.match(sql, /on conflict\(slug\) do nothing/i);
  assert.match(sql, /revoke all on function public\.initialize_student_profile\(\) from public, anon, authenticated/i);
});
