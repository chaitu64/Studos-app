import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const community = read('../src/services/studentCommunityService.ts');
const services = read('../src/services/studentServicesService.ts');
const notifications = read('../src/services/notificationService.ts');
const home = read('../src/app/(tabs)/index.tsx');
const connect = read('../src/components/connect/ConnectExperience.tsx');
const search = read('../src/app/search/index.tsx');

test('community reads use the verified student tables and resolve demo/auth authors separately', () => {
  assert.match(community, /readRows\('student_problems', 'id,author_id,demo_profile_id,is_demo,title,description,category,tags,status,created_at,updated_at'\)/);
  assert.match(community, /readRows\('student_help_requests', 'id,author_id,demo_profile_id,is_demo,title,description,category,skills_needed,help_type,status,created_at,updated_at'\)/);
  assert.match(community, /readRows\('student_team_openings', 'id,author_id,demo_profile_id,is_demo,event_name,role_title,description,skills_needed,openings,status,created_at', 80\)/);
  assert.match(community, /from\('student_profiles'\).*demoIds/s);
  assert.match(community, /from\('profiles'\).*authIds/s);
  assert.match(community, /\.filter\(\(row: StudentTeamOpening\) => row\.status\.toLowerCase\(\) === 'open'\)/);
  assert.match(community, /author_id: user\.id, demo_profile_id: null, is_demo: false/);
  assert.doesNotMatch(community, /from\('demo_student_|from\('studos_demo_/);
});

test('Connect discovers every active service and does not discard listings when profile enrichment fails', () => {
  assert.match(services, /\.eq\('is_active', true\)/);
  assert.match(services, /async listDiscoverable\(\): Promise<StudentService\[]> \{ return list\(\); \}/);
  assert.match(services, /if \(authProfiles\.error\) logLookupFailure\('profiles', authProfiles\.error\)/);
  assert.match(connect, /studentServicesService\.listDiscoverable\(\)/);
  assert.match(connect, /studentCommunityService\.teamOpenings\(\)/);
  assert.match(connect, /This is a demonstration opening\. It is view-only and does not accept applications\./);
});

test('notification reads and updates are scoped to the authenticated recipient', () => {
  assert.match(notifications, /\.eq\('recipient_id', user\.id\)/);
  assert.match(notifications, /\.eq\('id', id\)\.eq\('recipient_id', user\.id\)/);
  assert.match(notifications, /\.eq\('is_read', false\)/);
  assert.doesNotMatch(notifications, /\.insert\(/);
});

test('Home and Search render independent community sources and preserve partial search results', () => {
  assert.match(home, /Promise\.allSettled\(\[studentCommunityService\.problems\(\), studentCommunityService\.helpRequests\(\)\]\)/);
  assert.match(home, /Problems could not be loaded/);
  assert.match(home, /Help requests could not be loaded/);
  assert.match(search, /Promise\.allSettled\(\[/);
  assert.match(search, /setSourceErrors\(errors\)/);
  assert.match(search, /Other results are shown/);
  assert.match(search, /query\.trim\(\)\.toLowerCase\(\)/);
});
