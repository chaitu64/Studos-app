import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesConnectSearch } from '../src/utils/connectSearch.ts';

test('Connect search is case-insensitive and applies an exact tag filter', () => {
  assert.equal(matchesConnectSearch('Robotics project', ['Robotics', 'Python'], 'ROBOT', 'All'), true);
  assert.equal(matchesConnectSearch('Robotics project', ['Robotics', 'Python'], 'robot', 'Python'), true);
  assert.equal(matchesConnectSearch('Robotics project', ['Robotics', 'Python'], 'robot', 'Design'), false);
});

test('Connect search supports an empty term without bypassing a selected filter', () => {
  assert.equal(matchesConnectSearch('Any profile', ['AI'], '', 'AI'), true);
  assert.equal(matchesConnectSearch('Any profile', ['AI'], '', 'All'), true);
});
