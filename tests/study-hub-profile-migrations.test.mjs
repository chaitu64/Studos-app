import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

const driveMigration = await readFile(new URL('../backend/migrations/004_study_resource_drive_index.sql', import.meta.url), 'utf8');
const profileMigration = await readFile(new URL('../backend/migrations/005_profile_identity_compat.sql', import.meta.url), 'utf8');

test('Drive indexing migration extends study_resources and preserves existing rows', () => {
  assert.match(driveMigration, /add column if not exists resource_kind/i);
  assert.match(driveMigration, /parent_resource_id uuid references public\.study_resources/i);
  assert.match(driveMigration, /drive_file_size bigint/i);
  assert.doesNotMatch(driveMigration, /drop table|truncate table|delete from public\.study_resources/i);
  assert.match(driveMigration, /where drive_url ~\* .*drive\\\.google\\\.com\/drive\/folders/i);
});

test('profile compatibility migration grants only public profile fields and self-owned private RLS', () => {
  assert.match(profileMigration, /add column if not exists avatar_url text/i);
  assert.match(profileMigration, /create policy profile_private_self[\s\S]*?using \(id = auth\.uid\(\)\)[\s\S]*?with check \(id = auth\.uid\(\)\)/i);
  assert.match(profileMigration, /grant select \(id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,created_at,updated_at\)/i);
  assert.doesNotMatch(profileMigration, /grant .*date_of_birth|grant .*college_email/i);
});
