import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migration = await readFile(new URL('../backend/migrations/022_repair_auth_signup_triggers.sql', import.meta.url), 'utf8');
const diagnostic = await readFile(new URL('../backend/diagnostics/auth_signup_oauth_readonly.sql', import.meta.url), 'utf8');

test('signup repair is guarded to the canonical profiles schema and fails on legacy table drift', () => {
  assert.match(migration, /to_regclass\('public\.profiles'\) is null/);
  assert.match(migration, /to_regclass\('public\.student_profiles'\) is not null/);
  assert.match(migration, /Duplicate profiles\.auth_user_id values exist/);
  assert.match(migration, /Every Auth user must map to exactly one canonical profile/);
  assert.match(migration, /A legacy profile keyed by an Auth UUID is not linked canonically/);
  assert.match(migration, /auth_user_id_signup_uidx/);
  assert.match(migration, /references auth\.users\(id\) on delete restrict/);
});

test('signup repair creates owner-protected private profiles and fixes stale trigger writes', () => {
  assert.match(migration, /create table if not exists public\.profile_private/);
  assert.match(migration, /profile_private_phone_owner[\s\S]*?id=auth\.uid\(\)/);
  assert.match(migration, /create or replace function public\.initialize_student_profile\(\)[\s\S]*?insert into public\.profile_private/);
  assert.match(migration, /create or replace function public\.studos_create_canonical_profile\(\)[\s\S]*?insert into public\.profiles/);
  assert.match(migration, /github_url, linkedin_url, portfolio_url/);
  assert.match(migration, /jsonb_array_elements_text\(new\.raw_user_meta_data->'skills'\)/);
  assert.match(migration, /jsonb_array_elements_text\(new\.raw_user_meta_data->'interests'\)/);
  assert.match(migration, /drop trigger if exists on_auth_user_created on auth\.users/);
  assert.doesNotMatch(migration, /\b(drop\s+table|truncate\s+table|delete\s+from|update\s+public\.profiles\s+set)\b/i);
});

test('signup repair removes broad profile grants and retains only public authenticated reads', () => {
  assert.match(migration, /alter table public\.profiles enable row level security/);
  assert.match(migration, /revoke all on public\.profiles from public, anon, authenticated/);
  assert.match(migration, /revoke select \(%1\$I\), insert \(%1\$I\), update \(%1\$I\), references \(%1\$I\)/);
  assert.match(migration, /grant select \([\s\S]*?on public\.profiles to authenticated/);
  assert.doesNotMatch(migration, /grant select \([^)]*phone_number[^)]*\) on public\.profiles/i);
  assert.doesNotMatch(migration, /grant select \([\s\S]*?on public\.profiles to anon/i);
});

test('signup diagnostic identifies both legacy relations and all Auth trigger functions', () => {
  assert.match(diagnostic, /'student_profiles'/);
  assert.match(diagnostic, /'profile_private'/);
  assert.match(diagnostic, /'handle_new_user'/);
  assert.match(diagnostic, /studos_create_canonical_profile/);
});
