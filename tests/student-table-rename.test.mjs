import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../backend/migrations/016_rename_student_public_relations.sql', import.meta.url), 'utf8');
const databaseTypes = readFileSync(new URL('../src/types/database.ts', import.meta.url), 'utf8');
const supabase = readFileSync(new URL('../src/services/supabase.ts', import.meta.url), 'utf8');

test('student relation migration renames relations without dropping or copying records', () => {
  assert.match(migration, /alter %s public\.%I rename to %I/i);
  assert.match(migration, /substring\(v_old from 9\)/i);
  assert.match(migration, /regexp_replace\(v_definition/);
  assert.match(migration, /both relations exist/);
  assert.match(migration, /continue;/i, 'a rerun recognizes a completed rename');
  assert.doesNotMatch(migration, /drop\s+(table|view)|truncate|insert\s+into/i);
  assert.match(migration, /study_resources/);
  assert.match(migration, /study_resource_links/);
  assert.match(migration, /pg_get_functiondef/);
});

test('Supabase client and database schema use the renamed relation names', () => {
  for (const name of ['profiles', 'content', 'ideas', 'ideas_feed', 'services', 'help_requests', 'team_openings', 'private_details', 'problems', 'portfolio', 'idea_actors', 'idea_comments', 'idea_requests', 'idea_sparks', 'idea_live_collaborators', 'idea_live_comments', 'idea_live_requests', 'idea_live_sparks', 'idea_live_saves', 'contact_requests']) {
    assert.match(databaseTypes, new RegExp(`\\b${name}: RelationShape`));
  }
  assert.match(supabase, /createClient<Database>/);
});
