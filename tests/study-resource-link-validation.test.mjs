import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeResourceLinkUrl, validateStudyResourceLinkDraft } from '../src/services/studyResourceLinkValidation.ts';

test('normalizes supported direct YouTube video URLs', () => {
  assert.equal(normalizeResourceLinkUrl('youtube', 'https://youtu.be/dQw4w9WgXcQ?t=30'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(normalizeResourceLinkUrl('youtube', 'https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('normalizes public ChatGPT share URLs and rejects private conversation URLs', () => {
  assert.equal(normalizeResourceLinkUrl('chatgpt', 'https://chatgpt.com/share/12345678-abcd?utm_source=copy'), 'https://chatgpt.com/share/12345678-abcd');
  assert.throws(() => normalizeResourceLinkUrl('chatgpt', 'https://chatgpt.com/c/12345678-abcd'), /public shared-conversation|\/share\//i);
});

test('rejects search, channel, unsupported host and insecure learning links', () => {
  assert.throws(() => normalizeResourceLinkUrl('youtube', 'https://youtube.com/results?search_query=calculus'), /direct YouTube video/);
  assert.throws(() => normalizeResourceLinkUrl('youtube', 'https://youtube.com/@student'), /direct YouTube video/);
  assert.throws(() => normalizeResourceLinkUrl('youtube', 'https://example.com/watch?v=dQw4w9WgXcQ'), /youtube.com or youtu.be/);
  assert.throws(() => normalizeResourceLinkUrl('youtube', 'http://youtu.be/dQw4w9WgXcQ'), /HTTPS/);
  assert.throws(() => normalizeResourceLinkUrl('chatgpt', 'https://example.com/share/12345678'), /public ChatGPT/);
});

test('cleans titles and enforces title bounds', () => {
  assert.deepEqual(validateStudyResourceLinkDraft('youtube', '  A\n  useful video  ', 'https://youtu.be/dQw4w9WgXcQ'), {
    title: 'A useful video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  });
  assert.throws(() => validateStudyResourceLinkDraft('chatgpt', 'no', 'https://chatgpt.com/share/12345678'), /3 and 120/);
});
