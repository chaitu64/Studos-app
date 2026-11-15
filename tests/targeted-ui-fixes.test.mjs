import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const tabs = read('../src/app/(tabs)/_layout.tsx');
const header = read('../src/components/navigation/Header.tsx');
const home = read('../src/app/(tabs)/index.tsx');
const feed = read('../src/components/home/HomeFeedItem.tsx');
const explore = read('../src/app/(tabs)/explore.tsx');
const connect = read('../src/components/connect/ConnectExperience.tsx');
const card = read('../src/components/cards/DiscoverySwipeCard.tsx');

test('global navigation keeps five tabs and shows the current profile avatar only in Profile tab', () => {
  const names = [...tabs.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)].map((match) => match[1]).filter((name) => name !== 'chat');
  assert.deepEqual(names, ['index', 'study', 'explore', 'swipe', 'profile']);
  assert.match(tabs, /Avatar key=\{user\.avatar\} uri=\{user\.avatar\}/);
  assert.match(tabs, /user\.avatar \?/);
  assert.doesNotMatch(header, /Avatar|avatarBtn|\(tabs\)\/profile/);
  assert.match(header, /notifications-outline/);
});

test('Home surface opens its type-specific detail route while nested controls stop propagation', () => {
  // The card container must remain a View: nesting Pressable controls inside an
  // outer button produces invalid nested buttons on React Native Web.
  assert.match(feed, /return <View style=\{styles\.row\}>/);
  assert.match(feed, /<Pressable accessibilityRole="button" accessibilityLabel=\{`Open \$\{title\}`} onPress=\{onOpen\}>/);
  assert.match(feed, /event\.stopPropagation\(\)/);
  assert.match(feed, /onInteraction=\{stop\}/);
  assert.match(home, /entry\.kind === 'idea'[\s\S]*?\/ideahub\/\[id\]/);
  assert.match(home, /else router\.push\(\{ pathname: '\/community\/\[kind\]\/\[id\]'/);
  assert.match(home, /type === 'study_material' && entry\.data\.document\?\.id[\s\S]*?resourceReaderRoute\(entry\.data\.document\)/);
  assert.match(home, /pathname: '\/post\/\[id\]'/);
});

test('Explore search is header-launched and controls retain the compact horizontal sort row', () => {
  assert.match(explore, /<Header hideGreeting onSearchPress=\{\(\) => setShowSearchModal\(true\)\}/);
  assert.match(explore, /placeholder="Search opportunities"/);
  assert.match(explore, /setShowSearchModal\(false\)/);
  assert.match(explore, /<ScrollView horizontal showsHorizontalScrollIndicator=\{false\} style=\{styles\.quickControlsScroll\}/);
  for (const label of ['All', 'Deadline', 'Recent', 'Prize']) assert.ok(explore.includes(`>${label}</Text>`));
  assert.match(explore, /accessibilityLabel="Open opportunity filters"/);
  assert.match(explore, /styles\.controlsRow/);
  assert.match(explore, /filterBtnCompact: \{ width: 34, height: 32/);
  assert.match(explore, /sortBy === 'all' \? undefined : sortBy/);
  assert.doesNotMatch(explore, /Find your next opportunity|displayedOpportunities\.length.*opportunit/);
  assert.match(explore, /accessibilityState=\{\{ selected: sortBy === 'all' \}\}/);
});

test('Connect categories remain horizontally scrollable without the indicator and service cards fill the deck area', () => {
  assert.match(connect, /ScrollView horizontal style=\{styles\.filterScroll\} showsHorizontalScrollIndicator=\{false\}/);
  assert.match(connect, /filterScroll: \{[^}]*overflow: 'hidden'/);
  assert.match(card, /serviceCard: \{ flex: 1, minHeight: 0, maxHeight: 480/);
  assert.match(card, /serviceCardScroll: \{ flex: 1, minHeight: 0, maxHeight: 460/);
});
