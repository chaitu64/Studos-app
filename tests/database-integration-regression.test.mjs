import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const sharedContent = await readFile(new URL('../src/services/sharedContentService.ts', import.meta.url), 'utf8');
const schemaRepair = await readFile(new URL('../backend/migrations/020_team_chat_schema_repair.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../backend/migrations/021_team_application_atomicity_and_chat_realtime.sql', import.meta.url), 'utf8');
const schemaDiagnostic = await readFile(new URL('../backend/diagnostics/team_chat_schema_readonly.sql', import.meta.url), 'utf8');
const chatRoom = await readFile(new URL('../src/app/chat/room/[id].tsx', import.meta.url), 'utf8');
const search = await readFile(new URL('../src/app/search/index.tsx', import.meta.url), 'utf8');

test('topic-room counts are not fabricated and search omits unavailable counts', () => {
  const mapper = sharedContent.match(/async chatRooms\(\): Promise<ChatRoom\[\]> \{([\s\S]*?)\n  \},/);
  assert.ok(mapper, 'chat-room query should remain explicit');
  assert.doesNotMatch(mapper[1], /membersCount:\s*0|activeNow:\s*0/);
  assert.match(search, /r\.membersCount !== undefined/);
});

test('topic-room messages subscribe to filtered inserts and clean up their Realtime channel', () => {
  assert.match(sharedContent, /table: 'chat_room_messages', filter: `room_id=eq\.\$\{roomId\}`/);
  assert.match(sharedContent, /removeChannel\(channel\)/);
  assert.match(chatRoom, /subscribeRoomMessages\(id/);
  assert.match(chatRoom, /unsubscribe\?\.\(\)/);
});

test('team decisions use an owner-checked atomic RPC and preserve chat rows', () => {
  assert.match(sharedContent, /rpc\('respond_to_team_application_021'/);
  assert.match(migration, /team\.owner_id=caller_id/);
  assert.match(migration, /for update of application/);
  assert.match(migration, /to_regclass\('public\.chat_rooms'\) is null/);
  assert.match(migration, /to_regclass\('public\.chat_room_members'\) is null/);
  assert.match(migration, /to_regclass\('public\.chat_room_messages'\) is null/);
  assert.match(migration, /insert into public\.team_members[\s\S]*?on conflict\(team_id,user_id\) do nothing/);
  assert.match(migration, /grant execute on function public\.respond_to_team_application_021[\s\S]*?to authenticated/);
  assert.match(migration, /alter publication supabase_realtime add table public\.messages/);
  assert.match(migration, /alter publication supabase_realtime add table public\.chat_room_messages/);
  assert.doesNotMatch(migration, /\b(drop|truncate|delete from)\b/i);
});

test('team/chat repair creates absent relations without modifying existing records', () => {
  assert.match(schemaRepair, /create table if not exists public\.team_members/);
  assert.match(schemaRepair, /create table if not exists public\.team_applications/);
  assert.match(schemaRepair, /create table if not exists public\.chat_rooms/);
  assert.match(schemaRepair, /create table if not exists public\.chat_room_members/);
  assert.match(schemaRepair, /create table if not exists public\.chat_room_messages/);
  assert.match(schemaRepair, /enable row level security/);
  assert.match(schemaRepair, /revoke all[\s\S]*from public, anon, authenticated/);
  assert.match(schemaRepair, /on conflict \(slug\) do nothing/);
  assert.match(schemaRepair, /team_applications_self_insert[\s\S]*?applicant_id=auth\.uid\(\)/);
  assert.match(schemaRepair, /room_messages_member_read[\s\S]*?m\.user_id=auth\.uid\(\)/);
  assert.match(schemaRepair, /room_messages_member_insert[\s\S]*?user_id=auth\.uid\(\)/);
  assert.doesNotMatch(schemaRepair, /\b(drop\s+table|truncate|delete\s+from|update\s+public\.)\b/i);
});

test('team/chat catalog diagnostic is read-only and covers API exposure and Realtime', () => {
  const statements = schemaDiagnostic.split(/\r?\n/).filter((line) => !line.trim().startsWith('--')).join('\n');
  assert.match(schemaDiagnostic, /information_schema\.columns/);
  assert.match(schemaDiagnostic, /pg_policies/);
  assert.match(schemaDiagnostic, /pg_publication_tables/);
  assert.match(schemaDiagnostic, /pgrst\.db_schemas/);
  assert.match(schemaDiagnostic, /study_resources_total/);
  assert.doesNotMatch(statements, /\b(create|alter|drop|insert|update|delete|notify)\b/i);
});
