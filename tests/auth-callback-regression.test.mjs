import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const authScreen = await readFile(new URL('../src/components/auth/AuthScreen.tsx', import.meta.url), 'utf8');
const authCallback = await readFile(new URL('../src/app/auth-callback.tsx', import.meta.url), 'utf8');
const authService = await readFile(new URL('../src/services/authService.ts', import.meta.url), 'utf8');
const supabase = await readFile(new URL('../src/services/supabase.ts', import.meta.url), 'utf8');

test('Google OAuth always returns to the app callback route on web and native', () => {
  assert.match(authScreen, /const redirectTo = Linking\.createURL\('auth-callback'\)/);
  assert.doesNotMatch(authScreen, /Platform\.OS === 'web' \? undefined : Linking\.createURL/);
  assert.match(authScreen, /signInWithGoogle\(redirectTo, Platform\.OS !== 'web'\)/);
});

test('OAuth callback exchanges its code once and surfaces callback or exchange errors', () => {
  assert.match(authCallback, /error_description \|\| error/);
  assert.match(authCallback, /completeOAuthSignIn\(code\)/);
  assert.match(authCallback, /catch \(cause\)/);
  assert.match(authCallback, /router\.replace\('\/(?:\(tabs\))'\)/);
  assert.match(authScreen, /finally \{\s*setBusy\(false\)/);
});

test('session URL parsing remains disabled so the explicit PKCE callback owns code exchange', () => {
  assert.match(supabase, /detectSessionInUrl:\s*false/);
  assert.match(authService, /exchangeCodeForSession\(code\)/);
});

test('email signup sends confirmations through the app callback and OAuth exchange does not wait on profile repair', () => {
  assert.match(authScreen, /authService\.signUp\(payload, Linking\.createURL\('auth-callback'\)\)/);
  assert.match(authService, /emailRedirectTo/);
  const completion = authService.match(/completeOAuthSignIn: \(code: string\) => \{([\s\S]*?)\n  \},/);
  assert.ok(completion, 'OAuth completion method should remain explicit');
  assert.doesNotMatch(completion[1], /rpc\(['"]ensure_student_profile/);
});
