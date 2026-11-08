import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/demoIdeasService.ts', import.meta.url), 'utf8');
const directory = readFileSync(new URL('../src/services/studentDirectoryService.ts', import.meta.url), 'utf8');
const sparkMigration = readFileSync(new URL('../backend/migrations/007_student_idea_live_spark_ownership.sql', import.meta.url), 'utf8');
const appContext = readFileSync(new URL('../src/context/AppContext.tsx', import.meta.url), 'utf8');
const tabs = readFileSync(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8');
const swipe = readFileSync(new URL('../src/components/connect/ConnectExperience.tsx', import.meta.url), 'utf8');

test('Home focuses on student ideas and community posts with a compact Study Hub shortcut', () => {
  assert.match(home, /getDemoIdeas/);
  assert.match(home, /communityPosts/);
  assert.match(home, /<PostComposerModal/);
  assert.match(home, /Post a Problem/);
  assert.match(home, /Share a Build Update/);
  assert.match(home, /\(tabs\)\/study/);
  assert.doesNotMatch(home, /listStudyHubPdfPage|listHomeServices|<ResourceCard/);
  assert.match(home, /<DemoIdeaCard/);
  assert.match(home, /Nothing here yet/);
  assert.match(home, /Retry ideas/);
  assert.match(home, /ideaSkeleton/);
});

test('Student Idea Hub uses the consolidated student feed and interaction relations', () => {
  assert.match(service, /from\('student_ideas'\)\.select\(IDEA_FIELDS, \{ count: 'exact' \}\)/);
  assert.doesNotMatch(service, /from\('student_ideas_feed'\)/);
  assert.match(service, /id,demo_author_id,title,description,category,idea_type,stage,tags,skills_needed,collaboration_open,created_at,github_url,youtube_url/);
  assert.match(service, /demo_author_id/);
  assert.match(service, /from\('student_profiles'\)/);
  assert.doesNotMatch(service, /student_profiles'\)\.select\([^\n]*avatar_url/);
  assert.match(service, /student_idea_sparks/);
  assert.match(service, /student_idea_comments/);
  assert.match(service, /student_idea_actors/);
  assert.match(service, /student_idea_live_sparks/);
  assert.match(service, /student_idea_live_comments/);
  assert.match(service, /student_idea_live_requests/);
  assert.match(service, /student_idea_live_collaborators/);
  assert.match(service, /select\('idea_id,demo_profile_id,role,created_at'\)/);
  assert.match(directory, /eq\('demo_profile_id', identity\.id\)/);
  assert.doesNotMatch(service, /student_idea_actors[^\n]*student_profile_id/);
  assert.doesNotMatch(directory, /student_idea_actors[^\n]*student_profile_id/);
  assert.match(service, /isSeededCollaboratorActor/);
  assert.match(service, /insert\(\{ idea_id: id, user_id: authId, body: content\.trim\(\) \}\)/);
  assert.match(service, /insert\(\{ idea_id: id, user_id: userId, message: message\.trim\(\), status: 'pending' \}\)/);
  assert.match(sparkMigration, /with check \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.match(sparkMigration, /using \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(service, /from\('ideas'\)|from\('idea_votes'\)|from\('saved_ideas'\)/);
  assert.doesNotMatch(service, /studos_demo_|demo_student_/);
  assert.match(service, /student_idea_comments'\)\.select\('id,idea_id,demo_profile_id,body,created_at'\)/);
  assert.match(service, /demoMap\.get\(row\.demo_profile_id\)/);
  assert.match(service, /student_idea_live_comments'\)\.select\('id,idea_id,user_id,body,created_at'\)/);
  assert.match(service, /liveMap\.get\(row\.user_id\)/);
  assert.doesNotMatch(service, /row\.student_profile_id/);
});

test('Notifications load only for an authenticated recipient and Home refetch dependencies stay stable', () => {
  assert.match(appContext, /notificationService\.list\(\)/);
  assert.match(appContext, /if \(!session\?\.user\.id\)/);
  assert.doesNotMatch(appContext, /\[session, pathname, user\.ideasCount\]/);
  assert.match(appContext, /const \[notifications, setNotifications\] = useState/);
  assert.match(appContext, /\[session\?\.user\.id, refreshNotifications\]/);
});

test('AppContext fetches feature feeds only for their owning route', () => {
  assert.match(appContext, /usePathname/);
  assert.match(appContext, /if \(at\('\/\(tabs\)\/index'\) \|\| p === '\/' \|\| p === '\/\(tabs\)'\) needs\.add\('posts'\)/);
  assert.match(appContext, /if \(at\('\/ideahub'\)\) needs\.add\('ideas'\)/);
  assert.doesNotMatch(appContext, /at\('\/\(tabs\)\/swipe'\).*needs\.add/);
  assert.doesNotMatch(appContext, /at\('\/\(tabs\)\/index'\).*needs\.add\('services'\)/);
  assert.match(appContext, /dataErrors: Record<string, string>/);
  assert.doesNotMatch(appContext, /Could not load \$\{failedSources/);
});

test('Primary navigation exposes exactly five tabs and keeps chat in the global stack', () => {
  for (const tab of ['index', 'study', 'explore', 'swipe', 'profile']) assert.match(tabs, new RegExp(`name="${tab}"`));
  assert.equal((tabs.match(/<Tabs(?:\s|>)/g) || []).length, 1);
  assert.doesNotMatch(tabs, /tabBar=\{|renderCustomTabBar|tabBarContainer/);
  assert.match(tabs, /name="swipe"[\s\S]*?title: 'Connect'[\s\S]*?tabBarLabel: 'CONNECT'/);
  assert.match(tabs, /name="chat"[\s\S]*?href: null/);
  assert.doesNotMatch(tabs, /name="services"/);
  assert.match(swipe, /<Header hideGreeting showSearch=\{false\} \/>/);
  assert.match(swipe, /<Text style=\{styles\.pageTitle\}>Connect<\/Text>/);
  assert.doesNotMatch(swipe, /brandHeader|STUDENT NETWORK/);
  assert.match(swipe, /title: 'Services'/);
  assert.match(swipe, /studentServices/);
  assert.match(swipe, /title: 'Teammates'/);
  assert.match(swipe, /title: 'People'/);
});
