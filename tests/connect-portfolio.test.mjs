import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const connect = readFileSync(new URL('../src/components/connect/ConnectExperience.tsx', import.meta.url), 'utf8');
const services = readFileSync(new URL('../src/services/studentServicesService.ts', import.meta.url), 'utf8');
const requests = readFileSync(new URL('../src/services/studentContactRequestService.ts', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../backend/migrations/010_student_contact_requests.sql', import.meta.url), 'utf8');
const profile = readFileSync(new URL('../src/app/(tabs)/profile.tsx', import.meta.url), 'utf8');

test('Connect uses active verified service fields and keeps profile enrichment optional', () => {
  assert.match(services, /select\('id,provider_id,title,description,category,price_from,is_active,created_at'\)/);
  assert.match(services, /\.eq\('is_active', true\)/);
  assert.match(services, /const identity = resolved \? \{ type: resolved\.kind, id: providerId \}/);
  assert.doesNotMatch(services, /if \(!profile \|\| !providerId/);
});

test('Connect keeps services, teammate roles, and people in separate swipe segments', () => {
  assert.match(connect, /title: 'Services'/);
  assert.match(connect, /title: 'Teammates'/);
  assert.match(connect, /title: 'People'/);
  assert.match(connect, /onInterest=\{\(\) => beginRequest\(current\)\}/);
  assert.match(connect, /Browse/);
});

test('Contact requests use the authenticated account and have pending-duplicate/RLS protections', () => {
  assert.match(requests, /auth\.getUser\(\)/);
  assert.match(requests, /submit_student_contact_request/);
  assert.match(migration, /student_contact_requests_active_unique/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = requester_id or auth\.uid\(\) = recipient_id/);
  assert.match(migration, /auth\.uid\(\) = recipient_id and status = 'pending'/);
});

test('Profile is an Auth-owned portfolio, separate from Connect discovery', () => {
  assert.match(profile, /About/);
  assert.match(profile, /Featured work/);
  assert.match(profile, /Contributions/);
  assert.match(profile, /post\.author\.id === authenticatedId/);
  assert.match(profile, /studentServices\.filter\(\(service\) => service\.provider\.identity\?\.type === 'real'/);
  assert.doesNotMatch(profile, /DiscoverySwipeCard|Swipe left/);
});
