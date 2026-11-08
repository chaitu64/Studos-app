import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const service = await readFile(new URL('../src/services/postService.ts', import.meta.url), 'utf8');
const detail = await readFile(new URL('../src/app/post/[id].tsx', import.meta.url), 'utf8');
const card = await readFile(new URL('../src/components/cards/CommunityPostCard.tsx', import.meta.url), 'utf8');
const safeBack = await readFile(new URL('../src/navigation/safeBack.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../backend/migrations/008_post_engagement.sql', import.meta.url), 'utf8');

test('post engagement uses current relations and the verified post/comment fields', () => {
  assert.match(service, /from\('post_likes'\)/);
  assert.match(service, /from\('saved_posts'\)/);
  assert.match(service, /select\('id,user_id,body,created_at,updated_at'\)/);
  assert.match(service, /user_id: user\.id, body: value/);
  assert.match(service, /row\.post_type \|\| row\.category/);
  assert.match(service, /query\.eq\('post_type', type\)/);
  assert.doesNotMatch(service, /post_comments'\)\.insert\(\{[^}]*content:/);
});

test('comment update and delete are scoped to the authenticated owner', () => {
  assert.match(service, /update\(\{ body: value, updated_at:/);
  assert.match(service, /eq\('id', commentId\)\.eq\('user_id', user\.id\)/);
  assert.match(service, /async deleteComment/);
  assert.match(detail, /comment\.isOwn \? .*Edit/s);
  assert.match(detail, /postService\.updateComment/);
  assert.match(detail, /postService\.deleteComment/);
});

test('post cards render actual interaction counts and unavailable relations are deduplicated', () => {
  assert.match(card, /post\.likesCount !== undefined/);
  assert.match(card, /post\.commentsCount !== undefined/);
  assert.match(service, /reportedMissingRelations\.has\(relation\)/);
  assert.match(service, /optionalRelationRequests\.get\(requestKey\)/);
});

test('detail back actions have a safe fallback when there is no navigation history', () => {
  assert.match(safeBack, /router\.canGoBack\(\)/);
  assert.match(safeBack, /router\.replace\(fallback/);
  assert.match(detail, /safeBack\(\)/);
});

test('post engagement migration is additive and enforces Auth-owned mutations', () => {
  assert.match(migration, /alter table public\.post_comments enable row level security/i);
  assert.match(migration, /post_comments_update_self[\s\S]*?using \(user_id = \(select auth\.uid\(\)\)\)[\s\S]*?with check \(user_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(migration, /create unique index post_likes_post_user_key/i);
  assert.match(migration, /create unique index saved_posts_post_user_key/i);
  assert.match(migration, /notify pgrst, 'reload schema'/i);
  assert.doesNotMatch(migration, /^\s*(?:create\s+table|drop\s+table|truncate|delete\s+from\s+public\.(?:posts|post_likes|post_comments|saved_posts))/im);
});
