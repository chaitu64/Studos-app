import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedEnvFiles = ['.env', '.env.test', '.env.local', '.env.test.local'];
const local = Object.create(null);
for (const filename of allowedEnvFiles) {
  const fullPath = path.join(root, filename);
  if (!existsSync(fullPath)) continue;
  try { execFileSync('git', ['check-ignore', '--quiet', '--', filename], { cwd: root, stdio: 'ignore' }); }
  catch { continue; } // Never read credentials from a file Git does not ignore.
  for (const line of readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    local[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const config = (name) => local[name] || '';
const url = config('STUDOS_TEST_SUPABASE_URL');
const key = config('STUDOS_TEST_SUPABASE_ANON_KEY');
const normalA = [config('STUDOS_CHAT_TEST_USER_A_EMAIL'), config('STUDOS_CHAT_TEST_USER_A_PASSWORD')];
const normalB = [config('STUDOS_CHAT_TEST_USER_B_EMAIL'), config('STUDOS_CHAT_TEST_USER_B_PASSWORD')];
const securityA = [config('STUDOS_CHAT_SECURITY_USER_A_EMAIL'), config('STUDOS_CHAT_SECURITY_USER_A_PASSWORD')];
const securityB = [config('STUDOS_CHAT_SECURITY_USER_B_EMAIL'), config('STUDOS_CHAT_SECURITY_USER_B_PASSWORD')];
const blockA = [config('STUDOS_CHAT_BLOCK_TEST_USER_A_EMAIL'), config('STUDOS_CHAT_BLOCK_TEST_USER_A_PASSWORD')];
const blockB = [config('STUDOS_CHAT_BLOCK_TEST_USER_B_EMAIL'), config('STUDOS_CHAT_BLOCK_TEST_USER_B_PASSWORD')];
const hasPair = (pair) => pair.every(Boolean);
const normalConfigured = Boolean(url && key && hasPair(normalA) && hasPair(normalB));
const securityDisposable = config('STUDOS_CHAT_SECURITY_TEST_USERS_DISPOSABLE') === 'true';
const securityConfigured = Boolean(url && key && hasPair(securityA) && hasPair(securityB) && securityDisposable);
const blockDisposable = config('STUDOS_CHAT_BLOCK_TEST_USERS_DISPOSABLE') === 'true';
const blockExplicitlyAllowed = config('STUDOS_CHAT_BLOCK_TEST_ALLOWED') === 'true';
const blockConfigured = Boolean(url && key && hasPair(blockA) && hasPair(blockB) && blockDisposable && blockExplicitlyAllowed);

const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function signInPair(credentialsA, credentialsB) {
  const a = client();
  const b = client();
  const [loginA, loginB] = await Promise.all([
    a.auth.signInWithPassword({ email: credentialsA[0], password: credentialsA[1] }),
    b.auth.signInWithPassword({ email: credentialsB[0], password: credentialsB[1] }),
  ]);
  assert.ifError(loginA.error);
  assert.ifError(loginB.error);
  assert.ok(loginA.data.user?.id && loginB.data.user?.id, 'both sessions must be authenticated Auth users');
  assert.notEqual(loginA.data.user.id, loginB.data.user.id, 'test accounts must be distinct');
  return { a, b, idA: loginA.data.user.id, idB: loginB.data.user.id };
}

async function assertAuthProfiles(a, b, idA, idB) {
  const [profileA, profileB] = await Promise.all([
    a.from('profiles').select('id,auth_user_id,first_name,last_name,college,branch,degree,avatar_url').eq('auth_user_id', idA).single(),
    b.from('profiles').select('id,auth_user_id,first_name,last_name,college,branch,degree,avatar_url').eq('auth_user_id', idB).single(),
  ]);
  assert.ifError(profileA.error);
  assert.ifError(profileB.error);
  assert.equal(profileA.data.auth_user_id, idA);
  assert.equal(profileB.data.auth_user_id, idB);
  const [discoverB, discoverA] = await Promise.all([
    a.from('profiles').select('id,auth_user_id,first_name,last_name,college,branch,degree,avatar_url').eq('auth_user_id', idB).single(),
    b.from('profiles').select('id,auth_user_id,first_name,last_name,college,branch,degree,avatar_url').eq('auth_user_id', idA).single(),
  ]);
  assert.ifError(discoverB.error);
  assert.ifError(discoverA.error);
  assert.equal(discoverB.data.auth_user_id, idB);
  assert.equal(discoverA.data.auth_user_id, idA);
}

function waitForRealtime(subscriber, conversationId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let channel;
    const finish = (error, value) => {
      clearTimeout(timer);
      if (channel) void subscriber.removeChannel(channel);
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('Timed out waiting for a Realtime INSERT event.')), timeoutMs);
    channel = subscriber.channel(`chat-e2e:${conversationId}:${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => finish(null, payload.new))
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          finish(error || new Error(`Realtime subscription failed: ${status}`));
        }
      });
  });
}

async function assertAnonymousDenied(conversationId) {
  const anonymous = client();
  const read = await anonymous.from('messages').select('id').eq('conversation_id', conversationId);
  assert.ok(read.error || read.data?.length === 0, 'anonymous users must not read private messages');
  const insert = await anonymous.from('messages').insert({
    conversation_id: conversationId,
    sender_id: '00000000-0000-4000-8000-000000000001',
    content: `Anonymous denial probe ${Date.now()}`,
  });
  assert.ok(insert.error, 'anonymous users must not insert private messages');
}

async function assertConversationMembers(a, b, conversationId, idA, idB) {
  for (const db of [a, b]) {
    const result = await db.from('conversation_members').select('user_id').eq('conversation_id', conversationId);
    assert.ifError(result.error);
    assert.deepEqual(new Set(result.data.map((row) => row.user_id)), new Set([idA, idB]));
  }
}

test('normal authenticated chat: discover, request, accept, send, receive, persist, and Realtime in both directions', { skip: !normalConfigured }, async () => {
  const { a, b, idA, idB } = await signInPair(normalA, normalB);
  try {
    await assertAuthProfiles(a, b, idA, idB);
    const status = await a.rpc('direct_chat_contact_status', { target_user_id: idB });
    assert.ifError(status.error);
    assert.equal(status.data, 'available', 'normal test requires a fresh Auth account pair');

    const request = await a.rpc('request_direct_conversation', {
      target_user_id: idB, request_message: `STUDOS normal chat test ${Date.now()}`,
    });
    assert.ifError(request.error);
    assert.ok(request.data, 'request RPC should return a request id');
    const [sentView, receivedView] = await Promise.all([
      a.from('conversation_requests').select('id,requester_id,recipient_id,status').eq('id', request.data).single(),
      b.from('conversation_requests').select('id,requester_id,recipient_id,status').eq('id', request.data).single(),
    ]);
    assert.ifError(sentView.error);
    assert.ifError(receivedView.error);
    assert.equal(sentView.data.requester_id, idA);
    assert.equal(receivedView.data.recipient_id, idB);
    assert.equal(receivedView.data.status, 'pending');

    const accepted = await b.rpc('respond_to_conversation_request', {
      request_id: request.data, decision: 'accepted',
    });
    assert.ifError(accepted.error);
    const conversationId = accepted.data;
    assert.ok(conversationId, 'acceptance should return the authorized conversation id');
    await assertConversationMembers(a, b, conversationId, idA, idB);
    const forgedMember = await b.from('conversation_members').insert({
      conversation_id: conversationId, user_id: idA,
    });
    assert.ok(forgedMember.error, 'clients must not write conversation memberships');
    assert.equal(forgedMember.error.code, '42501', 'membership writes must be denied by privileges/RLS, not merely fail as a duplicate');

    const eventAtB = waitForRealtime(b, conversationId);
    const messageA = `Persisted STUDOS message A ${Date.now()}`;
    const insertedA = await a.from('messages').insert({
      conversation_id: conversationId, sender_id: idA, content: messageA,
    }).select('id,conversation_id,sender_id,content,created_at').single();
    assert.ifError(insertedA.error);
    const realtimeAtB = await eventAtB;
    assert.equal(realtimeAtB.id, insertedA.data.id);
    assert.equal(realtimeAtB.sender_id, idA);
    assert.equal(realtimeAtB.content, messageA);

    const eventAtA = waitForRealtime(a, conversationId);
    const messageB = `Persisted STUDOS reply B ${Date.now()}`;
    const insertedB = await b.from('messages').insert({
      conversation_id: conversationId, sender_id: idB, content: messageB,
    }).select('id,conversation_id,sender_id,content,created_at').single();
    assert.ifError(insertedB.error);
    const realtimeAtA = await eventAtA;
    assert.equal(realtimeAtA.id, insertedB.data.id);
    assert.equal(realtimeAtA.sender_id, idB);
    assert.equal(realtimeAtA.content, messageB);
    const spoofedSender = await b.from('messages').insert({
      conversation_id: conversationId, sender_id: idA, content: `Spoofed sender ${Date.now()}`,
    });
    assert.ok(spoofedSender.error, 'a member cannot send a message using another Auth user id');
    assert.equal(spoofedSender.error.code, '42501', 'spoofed sender must be rejected by authorization');

    const [readAtA, readAtB] = await Promise.all([
      a.from('messages').select('id,content,sender_id').eq('conversation_id', conversationId).in('id', [insertedA.data.id, insertedB.data.id]).order('created_at'),
      b.from('messages').select('id,content,sender_id').eq('conversation_id', conversationId).in('id', [insertedA.data.id, insertedB.data.id]).order('created_at'),
    ]);
    assert.ifError(readAtA.error);
    assert.ifError(readAtB.error);
    assert.deepEqual(readAtA.data.map((row) => row.id), [insertedA.data.id, insertedB.data.id]);
    assert.deepEqual(readAtB.data.map((row) => row.id), [insertedA.data.id, insertedB.data.id]);
    assert.deepEqual(readAtB.data.map((row) => row.sender_id), [idA, idB]);
    for (const id of [insertedA.data.id, insertedB.data.id]) {
      const count = await b.from('messages').select('id', { count: 'exact', head: true }).eq('id', id);
      assert.ifError(count.error);
      assert.equal(count.count, 1, 'a message must persist exactly once');
    }

    const refreshedB = client();
    try {
      const login = await refreshedB.auth.signInWithPassword({ email: normalB[0], password: normalB[1] });
      assert.ifError(login.error);
      const refreshRead = await refreshedB.from('messages').select('id,content,sender_id')
        .eq('conversation_id', conversationId).in('id', [insertedA.data.id, insertedB.data.id]).order('created_at');
      assert.ifError(refreshRead.error);
      assert.deepEqual(refreshRead.data.map((row) => row.id), [insertedA.data.id, insertedB.data.id]);
    } finally { await refreshedB.auth.signOut(); }

    await assertAnonymousDenied(conversationId);
  } finally { await Promise.all([a.auth.signOut(), b.auth.signOut()]); }
});

test('opt-in disposable-account security checks: request ownership, decline, duplicates, membership and sender enforcement, and rate limit', { skip: !securityConfigured }, async () => {
  const { a, b, idA, idB } = await signInPair(securityA, securityB);
  try {
    const normalEmails = new Set([normalA[0], normalB[0]].filter(Boolean).map((value) => value.toLowerCase()));
    assert.ok(!normalEmails.has(securityA[0].toLowerCase()) && !normalEmails.has(securityB[0].toLowerCase()), 'security accounts must not be used for normal messaging');
    await assertAuthProfiles(a, b, idA, idB);
    const contactStatus = await a.rpc('direct_chat_contact_status', { target_user_id: idB });
    assert.ifError(contactStatus.error);
    assert.equal(contactStatus.data, 'available', 'security test requires a fresh disposable Auth account pair');
    const request = await a.rpc('request_direct_conversation', { target_user_id: idB, request_message: 'Security decline test' });
    assert.ifError(request.error);
    const duplicate = await a.rpc('request_direct_conversation', { target_user_id: idB, request_message: 'Duplicate pending probe' });
    assert.ok(duplicate.error, 'duplicate pending request must fail');
    const wrongAccept = await a.rpc('respond_to_conversation_request', { request_id: request.data, decision: 'accepted' });
    assert.ok(wrongAccept.error, 'requester cannot accept');
    const wrongCancel = await b.rpc('cancel_conversation_request', { request_id: request.data });
    assert.ok(wrongCancel.error, 'recipient cannot cancel');
    const decline = await b.rpc('respond_to_conversation_request', { request_id: request.data, decision: 'declined' });
    assert.ifError(decline.error);
    assert.equal(decline.data, null);
    const afterDecline = await a.rpc('direct_chat_contact_status', { target_user_id: idB });
    assert.ifError(afterDecline.error);
    assert.equal(afterDecline.data, 'available', 'decline must not create a conversation');

    // Request counts are based on all requests in 24 hours. Use one disposable pair only.
    for (let index = 0; index < 9; index += 1) {
      const row = await a.rpc('request_direct_conversation', {
        target_user_id: idB, request_message: `Rate limit probe ${index + 1}`,
      });
      assert.ifError(row.error);
      const cancelled = await a.rpc('cancel_conversation_request', { request_id: row.data });
      assert.ifError(cancelled.error);
    }
    const limit = await a.rpc('request_direct_conversation', {
      target_user_id: idB, request_message: 'Eleventh request must be rate limited',
    });
    assert.ok(limit.error, 'request throttle must reject after ten requests in 24 hours');
    assert.match(limit.error.message, /limit|later|rate/i);
  } finally { await Promise.all([a.auth.signOut(), b.auth.signOut()]); }
});

test('opt-in blocking test uses a separate, disposable pair with explicit authorization', { skip: !blockConfigured }, async () => {
  const { a, b, idA, idB } = await signInPair(blockA, blockB);
  assert.notEqual(idA, idB);
  const otherEmails = new Set([normalA[0], normalB[0], securityA[0], securityB[0]].filter(Boolean).map((value) => value.toLowerCase()));
  assert.ok(!otherEmails.has(blockA[0].toLowerCase()) && !otherEmails.has(blockB[0].toLowerCase()), 'blocking identities must be separate from normal/security pairs');
  try {
    await assertAuthProfiles(a, b, idA, idB);
    const status = await a.rpc('direct_chat_contact_status', { target_user_id: idB });
    assert.ifError(status.error);
    assert.equal(status.data, 'available', 'blocking test requires a fresh disposable Auth pair');
    const request = await a.rpc('request_direct_conversation', { target_user_id: idB, request_message: 'Disposable blocking test' });
    assert.ifError(request.error);
    const accepted = await b.rpc('respond_to_conversation_request', { request_id: request.data, decision: 'accepted' });
    assert.ifError(accepted.error);
    const conversationId = accepted.data;
    assert.ok(conversationId);
    const block = await b.rpc('block_chat_user', { target_user_id: idA });
    assert.ifError(block.error);
    const unavailable = await a.rpc('direct_chat_contact_status', { target_user_id: idB });
    assert.ifError(unavailable.error);
    assert.equal(unavailable.data, 'unavailable');
    const blockedSend = await a.from('messages').insert({ conversation_id: conversationId, sender_id: idA, content: 'Blocked send probe' });
    assert.ok(blockedSend.error, 'block must prevent messaging in the existing direct conversation');
  } finally { await Promise.all([a.auth.signOut(), b.auth.signOut()]); }
});
