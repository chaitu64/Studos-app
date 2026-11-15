import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeOpportunityText } from '../src/utils/opportunityText.ts';
import { getOpportunityRewardAmount, isOpportunityActive } from '../src/services/opportunityUtils.ts';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const explore = read('../src/app/(tabs)/explore.tsx');
const card = read('../src/components/cards/OpportunityCard.tsx');
const service = read('../src/services/dataService.ts');

test('Explore removes the promotional heading and count while keeping opportunity search scoped in the search modal', () => {
  assert.doesNotMatch(explore, /Find your next opportunity|>Explore<|displayedOpportunities\.length \?\?/);
  assert.match(explore, /onSearchPress=\{\(\) => setShowSearchModal\(true\)\}/);
  assert.match(explore, /Search opportunities by title, organization, or category/);
  assert.match(explore, /search: debouncedSearch/);
});

test('sort choices are mutually exclusive and advanced filters stay separately applied', () => {
  assert.match(explore, /type SortOption = 'all' \| 'deadline' \| 'recent' \| 'prize'/);
  assert.match(explore, /accessibilityState=\{\{ selected: sortBy === 'all' \}\}/);
  for (const mode of ['deadline', 'recent', 'prize']) assert.ok(explore.includes(`sortBy === '${mode}' && styles.sortPillActive`));
  assert.match(explore, /sortBy: sortBy === 'all' \? undefined : sortBy/);
  assert.match(explore, /selectedCategories/);
  assert.match(explore, /setDraftCategories/);
});

test('filter button stays outside the swipe area and the feed uses divider rows with independent bookmark action', () => {
  assert.match(explore, /<View style=\{styles\.controlsRow\}>[\s\S]*?<ScrollView horizontal[\s\S]*?<\/ScrollView>[\s\S]*?accessibilityLabel="Open opportunity filters"/);
  assert.match(explore, /showsHorizontalScrollIndicator=\{false\}/);
  assert.match(card, /borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(card, /borderRadius: BorderRadius\.lg|marginBottom: 12/);
  assert.match(card, /router\.push\(`\/opportunities\/\$\{opportunity\.id\}`/);
  assert.match(card, /onPress=\{\(\) => \{ void handleBookmark\(\); \}\}/);
});

test('provider text decodes common entities and removes only the redundant event prefix', () => {
  assert.equal(decodeOpportunityText('About the Event: Meet students &amp; build &#8212; together &rsquo;26'), 'Meet students & build — together ’26');
  assert.equal(decodeOpportunityText('Eligibility: Open to all students'), 'Eligibility: Open to all students');
});

test('salary and stipend amounts do not enter comparable prize sorting; ended events are not expired applications', () => {
  assert.equal(getOpportunityRewardAmount({ salary: 90000 }), undefined);
  assert.equal(getOpportunityRewardAmount({ stipend: 20000 }), undefined);
  assert.equal(isOpportunityActive({ date_end: '2020-01-01', status: 'Open' }, new Date('2026-11-12T12:00:00')), true);
});

test('recent sorting handles missing dates safely and default ranking remains the provider order', () => {
  assert.match(service, /params\?\.sortBy === 'recent'[\s\S]*Number\.isFinite\(bDate\) \? bDate : 0/);
  assert.match(service, /if \(params\?\.sortBy === 'recent'\)[\s\S]*else if \(params\?\.sortBy === 'prize'\)[\s\S]*else if \(params\?\.sortBy === 'deadline'\)/);
});
