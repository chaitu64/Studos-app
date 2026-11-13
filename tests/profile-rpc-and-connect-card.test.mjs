import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const profileService = await readFile(new URL('../src/services/profileService.ts', import.meta.url), 'utf8');
const appContext = await readFile(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
const profileScreen = await readFile(new URL('../src/app/(tabs)/profile.tsx', import.meta.url), 'utf8');
const serviceService = await readFile(new URL('../src/services/studentServicesService.ts', import.meta.url), 'utf8');
const connect = await readFile(new URL('../src/components/connect/ConnectExperience.tsx', import.meta.url), 'utf8');
const card = await readFile(new URL('../src/components/cards/DiscoverySwipeCard.tsx', import.meta.url), 'utf8');
const profileMigration = await readFile(new URL('../backend/migrations/012_authenticated_student_profiles.sql', import.meta.url), 'utf8');
const renameMigration = await readFile(new URL('../backend/migrations/016_rename_student_public_relations.sql', import.meta.url), 'utf8');
const repairMigration = await readFile(new URL('../backend/migrations/018_restore_ensure_student_profile_rpc.sql', import.meta.url), 'utf8');

test('profile service calls the no-argument UUID RPC and surfaces its errors', () => {
  assert.match(profileService, /db\.rpc\('ensure_student_profile'\)/);
  assert.match(profileService, /if \(ensureError\)/);
  assert.match(profileService, /throw ensureError/);
  assert.match(profileService, /ensureError\.code === 'PGRST202'/);
  assert.match(appContext, /ask the project administrator to apply migration 018/i);
  assert.match(profileScreen, /dataErrors\.profile[\s\S]*?refreshAll\(\)/);
  assert.match(profileMigration, /function public\.ensure_student_profile\(\)[\s\S]*?returns uuid language plpgsql security definer set search_path = ''/);
  assert.match(profileMigration, /grant execute on function public\.ensure_student_profile\(\) to authenticated/);
  assert.match(profileMigration, /revoke all on function public\.ensure_student_profile\(\) from public, anon/);
});

test('profile RPC creates or reuses one Auth-linked canonical row while preserving demo rows', () => {
  assert.match(profileMigration, /if v_user_id is null then raise exception 'Authentication required'/);
  assert.match(profileMigration, /where auth_user_id = v_user_id/);
  assert.match(profileMigration, /on conflict \(auth_user_id\) where auth_user_id is not null do nothing/);
  assert.match(profileMigration, /return v_profile_id/);
  assert.match(renameMigration, /pg_get_functiondef\(v_function\.oid\)/);
  assert.doesNotMatch(renameMigration, /drop function[^;]*ensure_student_profile/i);
  assert.match(repairMigration, /create or replace function public\.ensure_student_profile\(\)[\s\S]*?returns uuid[\s\S]*?security definer[\s\S]*?set search_path = ''/);
  assert.match(repairMigration, /auth\.uid\(\)/);
  assert.match(repairMigration, /where p\.auth_user_id = v_user_id/);
  assert.match(repairMigration, /on conflict \(auth_user_id\) where auth_user_id is not null do nothing/);
  assert.match(repairMigration, /revoke all on function public\.ensure_student_profile\(\) from public, anon, authenticated/);
  assert.match(repairMigration, /grant execute on function public\.ensure_student_profile\(\) to authenticated/);
  assert.match(repairMigration, /notify pgrst, 'reload schema'/);
});

test('active services map into a populated service card and profile enrichment is optional', () => {
  assert.match(serviceService, /db\.from\('services'\)/);
  assert.match(serviceService, /title: row\.title, description: row\.description/);
  assert.match(serviceService, /if \(authProfiles\.error\) logLookupFailure/);
  assert.match(connect, /studentServicesService\.listDiscoverable\(\)/);
  assert.match(card, /function ServiceCard\(/);
  for (const field of ['post.title', 'post.content', 'post.category', 'post.servicePricing', 'post.author.name', 'post.author.avatar']) assert.ok(card.includes(field), `Service card does not display ${field}`);
});

test('service card fills the available deck area instead of collapsing above its actions', () => {
  assert.match(card, /serviceCard:\s*\{[^}]*flex:\s*1[^}]*minHeight:\s*0/);
  assert.match(card, /serviceCardScroll:\s*\{[^}]*flex:\s*1[^}]*minHeight:\s*0/);
});

test('Connect only renders actions when a selected item exists and shows a no-results state otherwise', () => {
  assert.match(connect, /candidates\.length === 0 \? <EmptyState[\s\S]*?\: current \? <View[\s\S]*?styles\.actions/);
  assert.match(connect, /onPress=\{\(\) => openDetails\(current\)\}/);
  assert.match(connect, /onSkip=\{\(\) => pass\(current\)\}/);
  assert.match(connect, /onInterest=\{\(\) => beginRequest\(current\)\}/);
});
