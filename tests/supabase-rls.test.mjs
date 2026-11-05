import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.STUDOS_TEST_SUPABASE_URL;
const key = process.env.STUDOS_TEST_SUPABASE_ANON_KEY;
const emailA = process.env.STUDOS_TEST_USER_A_EMAIL;
const passwordA = process.env.STUDOS_TEST_USER_A_PASSWORD;
const emailB = process.env.STUDOS_TEST_USER_B_EMAIL;
const passwordB = process.env.STUDOS_TEST_USER_B_PASSWORD;
const configured = Boolean(url && key && emailA && passwordA && emailB && passwordB);

test('two authenticated identities cannot read private data or mutate another owner’s rows', { skip: !configured }, async () => {
  const a = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const b = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const loginA = await a.auth.signInWithPassword({ email: emailA, password: passwordA });
  const loginB = await b.auth.signInWithPassword({ email: emailB, password: passwordB });
  assert.ifError(loginA.error); assert.ifError(loginB.error);
  const idA = loginA.data.user.id; const idB = loginB.data.user.id;
  assert.notEqual(idA, idB, 'test accounts must be distinct');
  const ownPublicProfile = await a.from('profiles').select('id,first_name').eq('id', idA).single();
  assert.ifError(ownPublicProfile.error);
  const otherPublicProfile = await a.from('profiles').select('id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url').eq('id', idB).single();
  assert.ifError(otherPublicProfile.error);
  assert.equal(otherPublicProfile.data.id, idB, 'authenticated students should discover another real profile');
  const reversePublicProfile = await b.from('profiles').select('id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url').eq('id', idA).single();
  assert.ifError(reversePublicProfile.error);
  assert.equal(reversePublicProfile.data.id, idA, 'profile visibility should work in both directions');
  const privateProfileColumns = await b.from('profiles').select('email,date_of_birth').eq('id', idA).maybeSingle();
  assert.ok(privateProfileColumns.error, 'private fields must not be selectable through profiles');

  const privateProfile = await b.from('profile_private').select('id,date_of_birth,college_email').eq('id', idA);
  assert.ifError(privateProfile.error);
  assert.equal(privateProfile.data.length, 0, 'private profile rows must be invisible across accounts');

  const title = `RLS test ${Date.now()}`;
  const created = await a.from('posts').insert({ author_id: idA, user_id: idA, title, content: 'Disposable authorization test', category: 'story', tags: [], image_urls: [] }).select('id').single();
  assert.ifError(created.error);
  const postId = created.data.id;
  let ideaId;
  let projectId;
  try {
    const visible = await b.from('posts').select('id').eq('id', postId).single();
    assert.ifError(visible.error);
    const idea = await a.from('ideas').insert({ user_id: idA, title: `RLS idea ${Date.now()}`, payload: { description: 'Temporary RLS verification' } }).select('id').single();
    assert.ifError(idea.error); ideaId = idea.data.id;
    const visibleIdea = await b.from('ideas').select('id').eq('id', ideaId).single();
    assert.ifError(visibleIdea.error); assert.equal(visibleIdea.data.id, ideaId);
    const ideaMutation = await b.from('ideas').update({ title: 'forbidden' }).eq('id', ideaId).select('id');
    assert.ifError(ideaMutation.error); assert.equal(ideaMutation.data.length, 0, 'ideas remain owner-editable');
    const project = await a.from('projects').insert({ owner_id: idA, title: `RLS project ${Date.now()}`, payload: { description: 'Temporary RLS verification' } }).select('id').single();
    assert.ifError(project.error); projectId = project.data.id;
    const visibleProject = await b.from('projects').select('id').eq('id', projectId).single();
    assert.ifError(visibleProject.error); assert.equal(visibleProject.data.id, projectId);
    const projectMutation = await b.from('projects').update({ title: 'forbidden' }).eq('id', projectId).select('id');
    assert.ifError(projectMutation.error); assert.equal(projectMutation.data.length, 0, 'projects remain owner-editable');
    const like = await b.from('post_likes').insert({ post_id: postId, user_id: idB });
    assert.ifError(like.error);
    const comment = await b.from('post_comments').insert({ post_id: postId, user_id: idB, content: 'RLS comment test' }).select('id').single();
    assert.ifError(comment.error);
    const crossDeleteComment = await a.from('post_comments').delete().eq('id', comment.data.id).select('id');
    assert.ifError(crossDeleteComment.error); assert.equal(crossDeleteComment.data.length, 0);
    await b.from('post_comments').delete().eq('id', comment.data.id);
    await b.from('post_likes').delete().eq('post_id', postId).eq('user_id', idB);
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
      await a.from('study_resources').delete().eq('id', resource.data.id);
    }
    const mediaPath = `${idA}/rls-test.txt`;
    const ownUpload = await a.storage.from('studos-media').upload(mediaPath, new Blob(['owned by user A'], { type: 'text/plain' }), { upsert: true });
    assert.ifError(ownUpload.error);
    try {
      const crossOwnerUpload = await b.storage.from('studos-media').upload(mediaPath, new Blob(['forbidden'], { type: 'text/plain' }), { upsert: true });
      assert.ok(crossOwnerUpload.error, 'users must not write into another user’s media folder');
    } finally {
      await a.storage.from('studos-media').remove([mediaPath]);
    }
  } finally {
    if (ideaId) await a.from('ideas').delete().eq('id', ideaId);
    if (projectId) await a.from('projects').delete().eq('id', projectId);
    await a.from('posts').delete().eq('id', postId);
    await a.auth.signOut(); await b.auth.signOut();
  }
});
