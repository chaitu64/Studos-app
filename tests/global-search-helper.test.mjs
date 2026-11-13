import assert from 'node:assert/strict';
import { test } from 'node:test';
import { visibleSearchResultCount } from '../src/utils/globalSearch.ts';

test('search tab count selects that source while All keeps the aggregate', () => {
  const counts = { Students: 2, Posts: 3, Rooms: 1 };
  assert.equal(visibleSearchResultCount('Posts', counts, 9), 3);
  assert.equal(visibleSearchResultCount('All', counts, 9), 9);
});

test('unknown search tabs display no results', () => {
  assert.equal(visibleSearchResultCount('Unknown', {}, 9), 0);
});
