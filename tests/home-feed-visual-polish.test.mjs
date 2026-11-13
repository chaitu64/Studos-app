import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const feed = await readFile(new URL('../src/components/home/HomeFeedItem.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8');
const tabs = await readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8');
const icons = JSON.parse(await readFile(new URL('../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json', import.meta.url), 'utf8'));

test('feed labels use concise categories and keep demo content separately identified', () => {
  for (const label of ['Idea', 'Problem', 'Build', 'Help Needed', 'General Post', 'Resource', 'Survey']) assert.ok(feed.includes(`'${label}'`));
  assert.match(feed, /const sample = Boolean\(/);
  assert.match(feed, /styles\.sampleLabel\}>Sample/);
  assert.doesNotMatch(feed, /Problem · Sample|Help needed · Sample/);
});

test('feed previews keep tags compact and descriptions bounded while preserving detail actions', () => {
  assert.match(feed, /tags\.slice\(0, 3\)/);
  assert.match(feed, /numberOfLines=\{expanded \? undefined : 4\}/);
  assert.match(feed, /onSpark/);
  assert.match(feed, /onCollaborate/);
  assert.match(feed, /onAuthor/);
  assert.match(feed, /onOpen/);
});

test('home filters and Create remain in the existing horizontally scrollable feed header', () => {
  assert.match(home, /\['All', 'Ideas', 'Problems', 'Builds', 'Help Needed'\]/);
  assert.match(home, /<FlatList horizontal data=\{FILTERS\}/);
  assert.match(home, /accessibilityLabel="Create a post"/);
});

test('Connect keeps its route and uses an installed people icon at the existing size', () => {
  assert.ok(Object.hasOwn(icons, 'account-group-outline'));
  assert.match(tabs, /name="swipe"[\s\S]*?title: 'Connect'[\s\S]*?name="account-group-outline" size=\{21\}/);
  assert.doesNotMatch(tabs, /handshake-outline/);
});
