import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const local = Object.create(null);
for (const filename of ['.env.test', '.env.test.local']) {
  const fullPath = path.join(root, filename);
  if (!existsSync(fullPath)) continue;
  try { execFileSync('git', ['check-ignore', '--quiet', '--', filename], { cwd: root, stdio: 'ignore' }); }
  catch { continue; }
  for (const line of readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    local[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const config = (name) => process.env[name] || local[name] || '';
const url = config('STUDOS_TEST_SUPABASE_URL');
const key = config('STUDOS_TEST_SUPABASE_ANON_KEY');
const emailA = config('STUDOS_TEST_USER_A_EMAIL');
const passwordA = config('STUDOS_TEST_USER_A_PASSWORD');
const emailB = config('STUDOS_TEST_USER_B_EMAIL');
const passwordB = config('STUDOS_TEST_USER_B_PASSWORD');
const writeAuthorized = config('STUDOS_TEST_ENVIRONMENT') === 'disposable-staging'
  && config('STUDOS_TEST_ALLOW_WRITES') === 'true';
const configured = Boolean(writeAuthorized && url && key && emailA && passwordA && emailB && passwordB);

test('two authenticated identities keep private data scoped and student idea interactions self-owned', { skip: !configured }, async () => {
  const a = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const b = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const loginA = await a.auth.signInWithPassword({ email: emailA, password: passwordA });
  const loginB = await b.auth.signInWithPassword({ email: emailB, password: passwordB });
  assert.ifError(loginA.error); assert.ifError(loginB.error);
  const idA = loginA.data.user.id; const idB = loginB.data.user.id;
  assert.notEqual(idA, idB, 'test accounts must be distinct');
  const ownPublicProfile = await a.from('profiles').select('id,auth_user_id,first_name').eq('auth_user_id', idA).single();
  assert.ifError(ownPublicProfile.error);
  const otherPublicProfile = await a.from('profiles').select('id,auth_user_id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url').eq('auth_user_id', idB).single();
  assert.ifError(otherPublicProfile.error);
  assert.equal(otherPublicProfile.data.auth_user_id, idB, 'authenticated students should discover another real profile');
  const reversePublicProfile = await b.from('profiles').select('id,auth_user_id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url').eq('auth_user_id', idA).single();
  assert.ifError(reversePublicProfile.error);
  assert.equal(reversePublicProfile.data.auth_user_id, idA, 'profile visibility should work in both directions');
  const crossProfileEdit = await b.from('profiles').update({ bio: 'unauthorized cross-user edit' }).eq('auth_user_id', idA).select('auth_user_id');
  assert.ok(crossProfileEdit.error || crossProfileEdit.data.length === 0, 'a user cannot edit another Auth user\'s student profile');
  const privateProfileColumns = await b.from('profiles').select('phone_number').eq('auth_user_id', idA).maybeSingle();
  assert.ok(privateProfileColumns.error, 'phone numbers must not be selectable through profiles');

  const privateProfile = await b.from('profile_private').select('id,date_of_birth,college_email').eq('id', idA);
  assert.ifError(privateProfile.error);
  assert.equal(privateProfile.data.length, 0, 'private profile rows must be invisible across accounts');

  const title = `RLS test ${Date.now()}`;
  const created = await a.from('posts').insert({ author_id: idA, user_id: idA, title, content: 'Disposable authorization test', category: 'story', tags: [], image_urls: [] }).select('id').single();
  assert.ifError(created.error);
  const postId = created.data.id;
  try {
    const visible = await b.from('posts').select('id').eq('id', postId).single();
    assert.ifError(visible.error);
    const sampleIdea = await b.from('ideas').select('id,demo_author_id,title').limit(1).maybeSingle();
    assert.ifError(sampleIdea.error);
    if (sampleIdea.data) {
      const studentAuthor = await b.from('profiles').select('id').eq('id', sampleIdea.data.demo_author_id).single();
      assert.ifError(studentAuthor.error);
      assert.equal(studentAuthor.data.id, sampleIdea.data.demo_author_id, 'sample authors remain separate from Auth identities');
      const existingSpark = await b.from('idea_live_sparks').select('idea_id').eq('idea_id', sampleIdea.data.id).eq('user_id', idB).maybeSingle();
      assert.ifError(existingSpark.error);
      let insertedSpark = false;
      let commentId;
      try {
        if (!existingSpark.data) {
          const spark = await b.from('idea_live_sparks').insert({ idea_id: sampleIdea.data.id, user_id: idB }).select('idea_id').single();
          assert.ifError(spark.error);
          insertedSpark = true;
          const crossDeleteSpark = await a.from('idea_live_sparks').delete().eq('idea_id', sampleIdea.data.id).eq('user_id', idB).select('idea_id');
          assert.ifError(crossDeleteSpark.error); assert.equal(crossDeleteSpark.data.length, 0, 'users cannot remove another account’s Spark');
        }
        const comment = await b.from('idea_live_comments').insert({ idea_id: sampleIdea.data.id, user_id: idB, body: `RLS comment test ${Date.now()}` }).select('id').single();
        assert.ifError(comment.error); commentId = comment.data.id;
        const crossDeleteComment = await a.from('idea_live_comments').delete().eq('id', commentId).select('id');
        assert.ifError(crossDeleteComment.error); assert.equal(crossDeleteComment.data.length, 0, 'users cannot remove another account’s comment');
      } finally {
        if (commentId) {
          const cleanup = await b.from('idea_live_comments').delete().eq('id', commentId).eq('user_id', idB).select('id');
          assert.ifError(cleanup.error);
          assert.equal(cleanup.data.length, 1, 'the test must remove its own idea comment');
        }
        if (insertedSpark) {
          const cleanup = await b.from('idea_live_sparks').delete().eq('idea_id', sampleIdea.data.id).eq('user_id', idB).select('idea_id');
          assert.ifError(cleanup.error);
          assert.equal(cleanup.data.length, 1, 'the test must remove its own Spark');
        }
      }
    }
    const like = await b.from('post_likes').insert({ post_id: postId, user_id: idB });
    assert.ifError(like.error);
    const crossDeleteLike = await a.from('post_likes').delete().eq('post_id', postId).eq('user_id', idB).select('post_id');
    assert.ifError(crossDeleteLike.error); assert.equal(crossDeleteLike.data.length, 0, 'users cannot remove another account\'s post like');
    const saved = await b.from('saved_posts').insert({ post_id: postId, user_id: idB });
    assert.ifError(saved.error);
    const crossDeleteSaved = await a.from('saved_posts').delete().eq('post_id', postId).eq('user_id', idB).select('post_id');
    assert.ifError(crossDeleteSaved.error); assert.equal(crossDeleteSaved.data.length, 0, 'users cannot remove another account\'s saved post');
    const comment = await b.from('post_comments').insert({ post_id: postId, user_id: idB, body: 'RLS comment test' }).select('id').single();
    assert.ifError(comment.error);
    const crossUpdateComment = await a.from('post_comments').update({ body: 'cross-owner edit' }).eq('id', comment.data.id).select('id');
    assert.ifError(crossUpdateComment.error); assert.equal(crossUpdateComment.data.length, 0, 'users cannot edit another account\'s comment');
    const crossDeleteComment = await a.from('post_comments').delete().eq('id', comment.data.id).select('id');
    assert.ifError(crossDeleteComment.error); assert.equal(crossDeleteComment.data.length, 0);
    const [commentCleanup, likeCleanup, savedCleanup] = await Promise.all([
      b.from('post_comments').delete().eq('id', comment.data.id).select('id'),
      b.from('post_likes').delete().eq('post_id', postId).eq('user_id', idB).select('post_id'),
      b.from('saved_posts').delete().eq('post_id', postId).eq('user_id', idB).select('post_id'),
    ]);
    assert.ifError(commentCleanup.error);
    assert.ifError(likeCleanup.error);
    assert.ifError(savedCleanup.error);
    assert.equal(commentCleanup.data.length, 1);
    assert.equal(likeCleanup.data.length, 1);
    assert.equal(savedCleanup.data.length, 1);
    const changed = await b.from('posts').update({ content: 'cross-owner write' }).eq('id', postId).select('id');
    assert.ifError(changed.error); assert.equal(changed.data.length, 0);
    const deleted = await b.from('posts').delete().eq('id', postId).select('id');
    assert.ifError(deleted.error); assert.equal(deleted.data.length, 0);
    const unchanged = await a.from('posts').select('content').eq('id', postId).single();
    assert.ifError(unchanged.error); assert.equal(unchanged.data.content, 'Disposable authorization test');

    const driveId = `RLS${Date.now()}_STUDOS_TEST_FILE_ID`;
    const resource = await a.from('study_resources').insert({ user_id: idA, title: 'RLS resource test', category: 'notes', subject: 'Test', academic_year: '2026', drive_url: `https://drive.google.com/file/d/${driveId}/view`, drive_file_id: driveId, rights_confirmed_at: new Date().toISOString() }).select('id').single();
    assert.ifError(resource.error);
    try {
      const duplicate = await b.from('study_resources').insert({ user_id: idB, title: 'Duplicate RLS test', category: 'notes', subject: 'Test', academic_year: '2026', drive_url: `https://drive.google.com/file/d/${driveId}/view`, drive_file_id: driveId, rights_confirmed_at: new Date().toISOString() });
      assert.equal(duplicate.error?.code, '23505', 'Drive IDs must be unique to prevent cross-account duplicates');
      const attemptedDelete = await b.from('study_resources').delete().eq('id', resource.data.id).select('id');
      assert.ifError(attemptedDelete.error); assert.equal(attemptedDelete.data.length, 0);
      const stillThere = await a.from('study_resources').select('id').eq('id', resource.data.id).single();
      assert.ifError(stillThere.error);
      const visibleResource = await b.from('study_resources').select('id,title,subject,academic_year,drive_url').eq('id', resource.data.id).single();
      assert.ifError(visibleResource.error); assert.equal(visibleResource.data.id, resource.data.id, 'authorized users should be able to read Study Hub records');
    } finally {
      const cleanup = await a.from('study_resources').delete().eq('id', resource.data.id).select('id');
      assert.ifError(cleanup.error);
      assert.equal(cleanup.data.length, 1, 'the test must remove its own resource');
    }
    const mediaPath = `${idA}/rls-test.txt`;
    const ownUpload = await a.storage.from('studos-media').upload(mediaPath, new Blob(['owned by user A'], { type: 'text/plain' }), { upsert: true });
    assert.ifError(ownUpload.error);
    try {
      const crossOwnerUpload = await b.storage.from('studos-media').upload(mediaPath, new Blob(['forbidden'], { type: 'text/plain' }), { upsert: true });
      assert.ok(crossOwnerUpload.error, 'users must not write into another user’s media folder');
    } finally {
      const cleanup = await a.storage.from('studos-media').remove([mediaPath]);
      assert.ifError(cleanup.error);
    }
  } finally {
    const cleanup = await a.from('posts').delete().eq('id', postId).select('id');
    assert.ifError(cleanup.error);
    assert.equal(cleanup.data.length, 1, 'the test must remove its own post');
    await a.auth.signOut(); await b.auth.signOut();
  }
});

test('team application acceptance is owner-checked and cleans up its own team', { skip: !configured }, async () => {
  const a = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const b = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [loginA, loginB] = await Promise.all([
    a.auth.signInWithPassword({ email: emailA, password: passwordA }),
    b.auth.signInWithPassword({ email: emailB, password: passwordB }),
  ]);
  assert.ifError(loginA.error);
  assert.ifError(loginB.error);
  const idA = loginA.data.user.id;
  const idB = loginB.data.user.id;
  assert.notEqual(idA, idB, 'test accounts must be distinct');

  const teamIds = [];
  try {
    const created = await a.from('teams')
      .insert({ owner_id: idA, title: `Disposable team application test ${Date.now()}`, payload: {} })
      .select('id').single();
    assert.ifError(created.error);
    const teamId = created.data.id;
    teamIds.push(teamId);

    const application = await b.from('team_applications')
      .insert({ team_id: teamId, applicant_id: idB, requested_role: 'Test member', message: 'Disposable integration test' })
      .select('id').single();
    assert.ifError(application.error);

    const nonOwnerDecision = await b.rpc('respond_to_team_application_021', {
      target_team_id: teamId,
      target_applicant_id: idB,
      decision: 'accepted',
      member_role: null,
    });
    assert.ok(nonOwnerDecision.error, 'an applicant must not decide their own application');

    const accepted = await a.rpc('respond_to_team_application_021', {
      target_team_id: teamId,
      target_applicant_id: idB,
      decision: 'accepted',
      member_role: null,
    });
    assert.ifError(accepted.error);

    const [applicationState, membership] = await Promise.all([
      b.from('team_applications').select('status').eq('id', application.data.id).single(),
      b.from('team_members').select('team_id,user_id,role').eq('team_id', teamId).eq('user_id', idB).single(),
    ]);
    assert.ifError(applicationState.error);
    assert.ifError(membership.error);
    assert.equal(applicationState.data.status, 'accepted');
    assert.equal(membership.data.user_id, idB);
    assert.equal(membership.data.team_id, teamId);

    const declinedTeam = await a.from('teams')
      .insert({ owner_id: idA, title: `Disposable team decline test ${Date.now()}`, payload: {} })
      .select('id').single();
    assert.ifError(declinedTeam.error);
    teamIds.push(declinedTeam.data.id);
    const declinedApplication = await b.from('team_applications')
      .insert({ team_id: declinedTeam.data.id, applicant_id: idB, requested_role: 'Test member', message: 'Disposable decline test' })
      .select('id').single();
    assert.ifError(declinedApplication.error);
    const declined = await a.rpc('respond_to_team_application_021', {
      target_team_id: declinedTeam.data.id,
      target_applicant_id: idB,
      decision: 'declined',
      member_role: null,
    });
    assert.ifError(declined.error);
    const [declinedState, noMembership] = await Promise.all([
      b.from('team_applications').select('status').eq('id', declinedApplication.data.id).single(),
      b.from('team_members').select('team_id').eq('team_id', declinedTeam.data.id).eq('user_id', idB).maybeSingle(),
    ]);
    assert.ifError(declinedState.error);
    assert.ifError(noMembership.error);
    assert.equal(declinedState.data.status, 'declined');
    assert.equal(noMembership.data, null);
  } finally {
    for (const teamId of teamIds) {
      const cleanup = await a.from('teams').delete().eq('id', teamId).eq('owner_id', idA);
      assert.ifError(cleanup.error);
    }
    await Promise.all([a.auth.signOut(), b.auth.signOut()]);
  }
});
