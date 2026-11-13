import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('../src/services/chatService.ts', import.meta.url), 'utf8');
const inbox = readFileSync(new URL('../src/app/(tabs)/chat.tsx', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../backend/migrations/011_secure_direct_chat_requests.sql', import.meta.url), 'utf8');
const messagesRoute = readFileSync(new URL('../src/app/messages.tsx', import.meta.url), 'utf8');
const conversationRoute = readFileSync(new URL('../src/app/chat/[id].tsx', import.meta.url), 'utf8');

test('chat frontend uses migration 011 message columns and named RPC parameters', () => {
  assert.match(migration, /grant insert\(conversation_id,sender_id,content\) on public\.messages to authenticated/i);
  assert.match(service, /insert\(\{ conversation_id: conversationId, sender_id: user\.id, content: message \}\)/);
  assert.match(service, /select\('id,created_at'\)\s*\.single\(\)/);
  assert.match(service, /rpc\('request_direct_conversation', \{ target_user_id: otherAuthId, request_message:/);
  assert.match(migration, /function public\.request_direct_conversation\(target_user_id uuid,request_message text/);
  assert.match(service, /rpc\('respond_to_conversation_request', \{ request_id: requestId, decision \}\)/);
  assert.match(migration, /function public\.respond_to_conversation_request\(request_id uuid,decision text/);
  assert.match(service, /rpc\('cancel_conversation_request', \{ request_id: requestId \}\)/);
  assert.match(service, /rpc\('block_chat_user', \{ target_user_id: targetUserId \}\)/);
  assert.match(service, /eq\('conversation_id', conversationId\)/);
});

test('Messages has a safe back action and remains behind the chat request feature flag', () => {
  assert.match(inbox, /safeBack\('\/\(tabs\)'\)/);
  assert.match(inbox, /accessibilityLabel="Back"/);
  assert.match(inbox, /chatRequestsEnabled/);
  assert.match(service, /process\.env\.EXPO_PUBLIC_CHAT_REQUESTS_ENABLED === 'true'/);
  assert.match(messagesRoute, /export \{ default \} from '\.\/\(tabs\)\/chat'/);
  assert.ok(conversationRoute.indexOf('authorizedConversation') < conversationRoute.indexOf('subscribeMessages'), 'Realtime subscribes only after membership is resolved');
  assert.match(service, /subscribe\(\(status, error\) => onStatus\?\.\(status, error\)\)/);
  assert.match(conversationRoute, /status === 'SUBSCRIBED'[\s\S]*?refreshRecentMessages\(\)/);
  assert.match(conversationRoute, /unsubscribe\?\.\(\)/);
  assert.match(conversationRoute, /confirmed\.id/);
});
