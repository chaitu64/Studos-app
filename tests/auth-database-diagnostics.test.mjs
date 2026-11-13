import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const diagnostics = await readFile(new URL('../backend/diagnostics/auth_signup_oauth_readonly.sql', import.meta.url), 'utf8');
const migration014 = await readFile(new URL('../backend/migrations/014_remove_profiles_runtime_dependencies.sql', import.meta.url), 'utf8');
const migration016 = await readFile(new URL('../backend/migrations/016_rename_student_public_relations.sql', import.meta.url), 'utf8');

test('auth diagnostics inspect every auth.users trigger and canonical profile relations without writing', () => {
  assert.match(diagnostics, /from pg_trigger[\s\S]*?n\.nspname = 'auth'[\s\S]*?r\.relname = 'users'/);
  assert.match(diagnostics, /to_regclass\('public\.' \|\| relation_name\)/);
  assert.match(diagnostics, /auth_users_without_profile/);
  assert.match(diagnostics, /duplicate_auth_links/);
  assert.doesNotMatch(diagnostics, /^\s*(?:insert|update|delete|drop|alter|create)\s/im);
});

test('historical rename rewrites stored function source before renaming relations', () => {
  assert.match(migration016, /p\.prosrc ~ \('\\m' \|\| v_old \|\| '\\M'\)/);
  assert.match(migration016, /regexp_replace\(v_definition, '\\m' \|\| v_old \|\| '\\M', v_new, 'g'\)/);
  assert.match(migration014, /create or replace function public\.initialize_student_profile\(\)[\s\S]*?security definer set search_path = ''[\s\S]*?profile_private/);
});
