import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../backend/migrations/017_community_publishing.sql');
const home = read('../src/app/(tabs)/index.tsx');
const postService = read('../src/services/postService.ts');
const ideaService = read('../src/services/demoIdeasService.ts');
const pollService = read('../src/services/pollService.ts');
const community = read('../src/services/studentCommunityService.ts');
const postMedia = read('../src/services/postMediaService.ts');
const appContext = read('../src/context/AppContext.tsx');

test('student Create menu exposes seven supported types without official Explore opportunity forms', () => {
  for (const type of ['Post', 'Idea', 'Problem', 'Project', 'Help Request', 'PDF / Resource', 'Survey / Poll']) {
    assert.ok(home.includes(`CreateOption label="${type}"`), `missing ${type} creation option`);
  }
  assert.doesNotMatch(home, /CreateOption label="(?:Hackathon|Internship|Job|Scholarship|Competition|Opportunity)"/);
});

test('community post, ideas, problems and help use authenticated ownership and owner-scoped mutations', () => {
  assert.match(postService, /auth\.getUser\(\)/);
  assert.match(postService, /post_type/);
  assert.match(ideaService, /author_id: user\.id/);
  assert.match(migration, /ideas_auth_insert_own[\s\S]*author_id = \(select auth\.uid\(\)\)/);
  assert.match(community, /\.eq\('author_id', user\.id\)/);
});

test('image uploads preserve supported image formats instead of labeling every file JPEG', () => {
  assert.match(postMedia, /extension === 'png' \? 'image\/png'/);
  assert.match(postMedia, /extension === 'webp' \? 'image\/webp'/);
  assert.match(postMedia, /asset\.mimeType \|\| inferredMimeType/);
  assert.doesNotMatch(appContext, /mimeType: 'image\/jpeg'/);
});

test('official opportunity listing types are denied by restrictive database policies', () => {
  assert.match(migration, /as restrictive for insert to authenticated[\s\S]*opportunity[\s\S]*hackathon[\s\S]*internship[\s\S]*job[\s\S]*scholarship[\s\S]*competition/);
  assert.match(migration, /as restrictive for update to authenticated/);
});

test('native polls enforce one authenticated vote per user and hide voter identities from the result API', () => {
  assert.match(migration, /primary key \(poll_id, user_id\)/);
  assert.match(migration, /foreign key \(poll_id, option_id\) references public\.poll_options\(poll_id, id\)/);
  assert.match(migration, /poll_votes_read_authenticated[\s\S]*using \(true\)/);
  assert.match(migration, /revoke all on public\.polls, public\.poll_options, public\.poll_votes from anon, authenticated/);
  assert.match(migration, /get_community_poll/);
  assert.match(pollService, /create_community_poll/);
  assert.match(pollService, /poll_votes/);
});

test('publishing migration preserves Study Hub relations and adds no destructive statements', () => {
  assert.doesNotMatch(migration, /(?:drop|truncate|delete from)\s+(?:table\s+)?public\.(?:study_resources|study_resource_links)/i);
  assert.doesNotMatch(migration, /drop\s+table|truncate\s+table|delete\s+from\s+public\.(?:posts|ideas|problems|help_requests)/i);
  assert.match(migration, /add column if not exists/);
});
