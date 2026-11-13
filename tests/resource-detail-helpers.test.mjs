import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appendUniqueResources } from '../src/utils/resourceDetail.ts';

const resource = (id) => ({ id });

test('resource pagination appends new PDFs once and preserves the current order', () => {
  assert.deepEqual(
    appendUniqueResources([resource('a'), resource('b')], [resource('b'), resource('c'), resource('c')]),
    [resource('a'), resource('b'), resource('c')],
  );
});

test('resource pagination leaves the current list unchanged when a page is empty', () => {
  const current = [resource('a')];
  assert.deepEqual(appendUniqueResources(current, []), current);
});
