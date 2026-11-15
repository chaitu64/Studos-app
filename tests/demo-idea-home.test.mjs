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

test('Home is a continuous, virtualized student feed with compact create and category controls', () => {
  assert.match(home, /getDemoIdeas/);
  assert.match(home, /postService\.feed/);
  assert.match(home, /studentCommunityService\.problems\(pageOffsets\.problems, PAGE_SIZE\)/);
  assert.match(home, /studentCommunityService\.helpRequests\(pageOffsets\.help, PAGE_SIZE\)/);
  assert.match(home, /<PostComposerModal/);
  assert.match(home, /CreateOption label="Problem"/);
  for (const type of ['Post', 'Idea', 'Problem', 'Project', 'Help Request', 'PDF \/ Resource', 'Survey \/ Poll']) assert.match(home, new RegExp(`CreateOption label="${type}"`));
  assert.doesNotMatch(home, /listStudyHubPdfPage|listHomeServices|<ResourceCard/);
  assert.match(home, /<FlatList/);
  assert.match(home, /initialNumToRender=\{6\}/);
  assert.match(home, /keyExtractor=\{\(item\) => `\$\{item\.kind\}:\$\{item\.id\}`\}/);
  for (const filter of ['All', 'Ideas', 'Problems', 'Builds', 'Help Needed']) assert.match(home, new RegExp(`'${filter}'`));
  for (const removedCopy of ['Welcome back', 'Build something that matters today', 'What are students building?', 'Exam prep?', 'Student community', 'Open Study Hub']) assert.doesNotMatch(home, new RegExp(removedCopy));
  assert.match(home, /<FlatList/);
  assert.match(home, /<ScrollView keyboardShouldPersistTaps="handled">/);
  assert.doesNotMatch(home, /<DemoIdeaCard/);
});

test('Student Idea Hub uses the consolidated student feed and interaction relations', () => {
  const currentUserId = service.match(/async function currentUserId\(expected\?: string\) \{([\s\S]*?)\n\}/);
  assert.ok(currentUserId, 'idea interactions should resolve the current Auth identity explicitly');
  assert.match(currentUserId[1], /if \(error\) throw error/);
  assert.doesNotMatch(currentUserId[1], /catch/);
  assert.match(service, /from\('ideas'\)\.select\(IDEA_FIELDS, \{ count: 'exact' \}\)/);
  assert.doesNotMatch(service, /from\('ideas_feed'\)/);
  assert.match(service, /id,demo_author_id,author_id,title,description,problem_statement,proposed_solution,target_audience,roles_needed,links,category,idea_type,stage,tags,skills_needed,collaboration_open,created_at,github_url,youtube_url/);
  assert.match(service, /demo_author_id/);
  assert.match(service, /from\('profiles'\)/);
  assert.doesNotMatch(service, /profiles'\)\.select\([^\n]*avatar_url[^\n]*\.in\('id', demoIds\)/);
  assert.match(service, /idea_sparks/);
  assert.match(service, /idea_comments/);
  assert.match(service, /idea_actors/);
  assert.match(service, /idea_live_sparks/);
  assert.match(service, /idea_live_comments/);
  assert.match(service, /idea_live_requests/);
  assert.match(service, /idea_live_collaborators/);
  assert.match(service, /select\('idea_id,demo_profile_id,role,created_at'\)/);
  assert.match(directory, /eq\('demo_profile_id', identity\.id\)/);
  assert.doesNotMatch(service, /idea_actors[^\n]*student_profile_id/);
  assert.doesNotMatch(directory, /idea_actors[^\n]*student_profile_id/);
  assert.match(service, /isSeededCollaboratorActor/);
  assert.match(service, /insert\(\{ idea_id: id, user_id: authId, body: content\.trim\(\) \}\)/);
  assert.match(service, /insert\(\{ idea_id: id, user_id: userId, message: message\.trim\(\), status: 'pending' \}\)/);
  assert.match(sparkMigration, /with check \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.match(sparkMigration, /using \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(service, /studos_demo_|demo_student_/);
  assert.match(service, /idea_comments'\)\.select\('id,idea_id,demo_profile_id,body,created_at'\)/);
  assert.match(service, /demoMap\.get\(row\.demo_profile_id\)/);
  assert.match(service, /idea_live_comments'\)\.select\('id,idea_id,user_id,body,created_at'\)/);
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
  assert.match(tabs, /name="swipe"[\s\S]*?title: 'Connect'[\s\S]*?tabBarLabel: 'Connect'/);
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
