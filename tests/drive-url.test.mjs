import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDriveUrl } from '../src/services/driveUrl.ts';

test('normalizes a standard Drive file share URL', () => {
  assert.deepEqual(normalizeDriveUrl('https://drive.google.com/file/d/1Abc_def-1234567890/view?usp=sharing'), {
    id: '1Abc_def-1234567890', url: 'https://drive.google.com/file/d/1Abc_def-1234567890/view', kind: 'file',
  });
});

test('normalizes shared Drive folder links without turning them into file URLs', () => {
  assert.deepEqual(normalizeDriveUrl('https://drive.google.com/drive/folders/1Abc_def-1234567890?usp=sharing'), {
    id: '1Abc_def-1234567890', url: 'https://drive.google.com/drive/folders/1Abc_def-1234567890', kind: 'folder',
  });
});

test('extracts a file ID from Drive query links and rejects non-file Google Docs', () => {
  assert.equal(normalizeDriveUrl('https://drive.google.com/open?id=1234567890abcdef').id, '1234567890abcdef');
  assert.throws(() => normalizeDriveUrl('https://docs.google.com/document/d/1234567890abcdef/edit'));
});

test('accepts direct Drive download links and validates supported URL paths', () => {
  const expectedId = '1234567890abcdef';
  for (const value of [
    `https://drive.google.com/uc?id=${expectedId}`,
    `https://drive.google.com/uc?export=download&id=${expectedId}`,
  ]) assert.equal(normalizeDriveUrl(value).id, expectedId);
  assert.throws(() => normalizeDriveUrl(`https://drive.google.com/not-open?id=${expectedId}`));
  assert.throws(() => normalizeDriveUrl(`https://drive.google.com/file/d/${expectedId}/edit`));
});

test('rejects malformed, insecure, unrelated, and ID-less URLs', () => {
  for (const value of ['not a URL', 'http://drive.google.com/file/d/1234567890/view', 'https://evil.example/file/d/1234567890/view', 'https://drive.google.com/']) {
    assert.throws(() => normalizeDriveUrl(value));
  }
});
