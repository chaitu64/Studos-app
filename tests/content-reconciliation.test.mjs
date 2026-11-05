import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCloudAndLocal } from '../src/services/contentReconciliation.ts';

test('reconciliation preserves local-only records and lets the cloud copy win duplicate ids', () => {
  const cloud = [{ id: 'same', value: 'server' }, { id: 'cloud', value: 2 }];
  const local = [{ id: 'same', value: 'cache' }, { id: 'local', value: 3 }];
  assert.deepEqual(mergeCloudAndLocal(cloud, local), [cloud[0], cloud[1], local[1]]);
});

test('reconciliation returns an empty set without mutating either input', () => {
  const local = [{ id: 'local' }];
  assert.deepEqual(mergeCloudAndLocal([], local), local);
  assert.deepEqual(local, [{ id: 'local' }]);
});
