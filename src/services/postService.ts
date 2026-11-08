import { CommunityPost, CommunityPostComment, CommunityPostType } from '../types';
import { requireSupabase } from './supabase';
import { signPostImagePaths } from './postMediaService';

const isMissingRelation = (error: { code?: string }) => error.code === '42P01' || error.code === 'PGRST205';
const unavailableRelations = new Set<string>();
const reportedMissingRelations = new Set<string>();
const optionalRelationRequests = new Map<string, Promise<any>>();
function reportPostQueryError(relation: string, error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  if (__DEV__) console.warn('[Supabase query failed]', { feature: 'post feed engagement', relation, code: error.code || 'unknown', message: error.message, details: error.details, hint: error.hint });
}
function unavailableInteraction(relation: string, error: { code?: string; message?: string; details?: string | null; hint?: string | null }): Error | null {
  if (!isMissingRelation(error)) return null;
  unavailableRelations.add(relation);
  if (!reportedMissingRelations.has(relation)) { reportPostQueryError(relation, error); reportedMissingRelations.add(relation); }
  return new Error(`${relation} is not available in the current database schema.`);
}

function queryOptionalRelation(relation: string, requestKey: string, makeQuery: () => PromiseLike<any>): Promise<any> {
  if (unavailableRelations.has(relation)) return Promise.resolve({ data: null, error: null, disabled: true });
  const pending = optionalRelationRequests.get(requestKey);
  if (pending) return pending;
  const request = Promise.resolve(makeQuery()).then((result) => {
    if (result.error && isMissingRelation(result.error)) {
      unavailableRelations.add(relation);
      if (!reportedMissingRelations.has(relation)) { reportPostQueryError(relation, result.error); reportedMissingRelations.add(relation); }
    } else if (!result.error) {
      unavailableRelations.delete(relation);
      reportedMissingRelations.delete(relation);
    }
    return result;
  }).finally(() => optionalRelationRequests.delete(requestKey));
  optionalRelationRequests.set(requestKey, request);
  return request;
}

function mapPost(row: any, profile: any = {}): CommunityPost {
  const supportedTypes = ['idea','service','story','event_collab','project','question','study_material','achievement'];
  const postType = row.post_type || row.category;
  const type = (supportedTypes.includes(postType) ? postType : 'story') as CommunityPostType;
  return {
    id: row.id, type, title: row.title || '', content: row.content || '',
    author: { id: row.author_id || row.user_id, identity: { type: 'real', id: row.author_id || row.user_id }, name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student', avatar: profile.avatar_url || '', college: profile.college || undefined, role: profile.branch || undefined },
    createdAt: row.created_at, createdAtTimestamp: new Date(row.created_at).getTime(), category: row.category && row.category !== postType ? row.category : undefined,
    tags: row.tags || [], images: row.image_urls || (row.image_url ? [row.image_url] : []),
  };
}

async function mapRows(rows: any[]): Promise<CommunityPost[]> {
  if (!rows.length) return [];
  const db = requireSupabase();
  // author_id is canonical (posts RLS uses it); user_id remains a legacy fallback only.
  const ids = [...new Set(rows.flatMap((row) => [row.author_id, row.user_id]).filter(Boolean))];
  const { data: { user } } = await db.auth.getUser();
  const result = ids.length ? await db.from('profiles').select('id,first_name,last_name,avatar_url,college,branch').in('id', ids) : { data: [], error: null };
  if (result.error) throw result.error;
  const profiles = new Map((result.data || []).map((profile: any) => [profile.id, profile]));
  const postIds = rows.map((row) => row.id).sort();
  const [likes, comments, saves] = await Promise.all([
    queryOptionalRelation('post_likes', `post_likes:${postIds.join(',')}`, () => db.from('post_likes').select('post_id,user_id').in('post_id', postIds)),
    queryOptionalRelation('post_comments', `post_comments:${postIds.join(',')}`, () => db.from('post_comments').select('post_id').in('post_id', postIds)),
    user ? queryOptionalRelation('saved_posts', `saved_posts:${user.id}:${postIds.join(',')}`, () => db.from('saved_posts').select('post_id').eq('user_id', user.id).in('post_id', postIds)) : Promise.resolve({ data: [], error: null }),
  ]);
  const optionalRows = (relation: string, result: { data: any[] | null; error: any; disabled?: boolean }) => {
    if (result.disabled) return null;
    if (!result.error) return result.data || [];
    if (isMissingRelation(result.error)) { unavailableInteraction(relation, result.error); return null; }
    reportPostQueryError(relation, result.error);
    throw result.error;
  };
  const likeRows = optionalRows('post_likes', likes);
  const commentRows = optionalRows('post_comments', comments);
  const saveRows = optionalRows('saved_posts', saves);
  return Promise.all(rows.map(async (row) => {
    const profile: any = profiles.get(row.author_id) || profiles.get(row.user_id);
    const resolvedAuthorId = profile?.id || row.author_id || row.user_id;
    return ({
    ...mapPost({ ...row, author_id: resolvedAuthorId }, profile),
    images: await signPostImagePaths(row.image_urls || (row.image_url ? [row.image_url] : [])),
    likesCount: likeRows ? likeRows.filter((entry: any) => entry.post_id === row.id).length : undefined,
    commentsCount: commentRows ? commentRows.filter((entry: any) => entry.post_id === row.id).length : undefined,
    isLiked: likeRows ? likeRows.some((entry: any) => entry.post_id === row.id && entry.user_id === user?.id) : undefined,
    isSaved: saveRows ? saveRows.some((entry: any) => entry.post_id === row.id) : undefined,
    likesAvailable: likeRows !== null,
    commentsAvailable: commentRows !== null,
    savesAvailable: saveRows !== null,
    });
  }));
}

export const postService = {
  async feed(page = 1, perPage = 20, type?: CommunityPostType, authorId?: string) {
    const start = Math.max(0, (page - 1) * perPage); let query = requireSupabase().from('posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(start, start + perPage - 1);
    if (type) query = query.eq('post_type', type);
    if (authorId) query = query.eq('author_id', authorId);
    const { data, error, count } = await query; if (error) throw error;
    return { posts: await mapRows(data || []), total: count || 0, hasMore: start + (data?.length || 0) < (count || 0) };
  },
  async getById(id: string) {
    const { data, error } = await requireSupabase().from('posts').select('*').eq('id', id).single(); if (error) throw error;
    return (await mapRows([data]))[0];
  },
  async byIds(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await requireSupabase().from('posts').select('*').in('id', ids).order('created_at', { ascending: false });
    if (error) throw error;
    return mapRows(data || []);
  },
  async create(input: { title: string; content: string; type: CommunityPostType; category?: string; tags?: string[]; image_urls?: string[] }) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to post.');
    const tags = [...(input.tags || []), ...(input.category ? [input.category] : [])];
    const { data, error } = await db.from('posts').insert({ author_id: user.id, user_id: user.id, title: input.title, content: input.content, post_type: input.type, category: input.category || null, tags, image_urls: input.image_urls || [] }).select('*').single();
    if (error) throw error; return (await mapRows([data]))[0];
  },
  async toggleLike(postId: string): Promise<boolean> {
    if (unavailableRelations.has('post_likes')) throw new Error('Post reactions are not available in the current database schema.');
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to react to posts.');
    const existing = await db.from('post_likes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
    if (existing.error) throw unavailableInteraction('post_likes', existing.error) || existing.error;
    if (existing.data) {
      const { error } = await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) throw unavailableInteraction('post_likes', error) || error;
      return false;
    }
    const { error } = await db.from('post_likes').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
    if (error && error.code !== '23505') throw unavailableInteraction('post_likes', error) || error;
    return true;
  },
  async toggleSave(postId: string): Promise<boolean> {
    if (unavailableRelations.has('saved_posts')) throw new Error('Saved posts are not available in the current database schema.');
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to save posts.');
    const existing = await db.from('saved_posts').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
    if (existing.error) throw unavailableInteraction('saved_posts', existing.error) || existing.error;
    if (existing.data) {
      const { error } = await db.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) throw unavailableInteraction('saved_posts', error) || error;
      return false;
    }
    const { error } = await db.from('saved_posts').upsert({ post_id: postId, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
    if (error && error.code !== '23505') throw unavailableInteraction('saved_posts', error) || error;
    return true;
  },
  async comments(postId: string): Promise<CommunityPostComment[]> {
    if (unavailableRelations.has('post_comments')) throw new Error('Post comments are not available in the current database schema.');
    const db = requireSupabase();
    const { data, error } = await db.from('post_comments').select('id,user_id,body,created_at,updated_at').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) throw unavailableInteraction('post_comments', error) || error;
    const ids = [...new Set((data || []).map((row: any) => row.user_id))];
    const profiles = ids.length ? await db.from('profiles').select('id,first_name,last_name,avatar_url,branch').in('id', ids) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const byId = new Map((profiles.data || []).map((row: any) => [row.id, row]));
    const { data: { user } } = await db.auth.getUser();
    return (data || []).map((row: any) => { const profile: any = byId.get(row.user_id) || {}; return { id: row.id, userId: row.user_id, userName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student', userAvatar: profile.avatar_url || '', userRole: profile.branch || '', content: row.body, createdAt: row.created_at, updatedAt: row.updated_at, isOwn: row.user_id === user?.id }; });
  },
  async saved(): Promise<CommunityPost[]> {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to view saved posts.');
    const { data, error } = await db.from('saved_posts').select('post_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) throw unavailableInteraction('saved_posts', error) || error;
    const posts = await this.byIds((data || []).map((row: any) => row.post_id));
    const order = new Map((data || []).map((row: any, index: number) => [row.post_id, index]));
    return posts.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  },
  async addComment(postId: string, content: string): Promise<CommunityPostComment> {
    const value = content.trim();
    if (!value || value.length > 3000) throw new Error('Comments must be between 1 and 3000 characters.');
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to comment on posts.');
    const { data, error } = await db.from('post_comments').insert({ post_id: postId, user_id: user.id, body: value }).select('id,user_id,body,created_at,updated_at').single();
    if (error) throw unavailableInteraction('post_comments', error) || error;
    const { data: profile } = await db.from('profiles').select('first_name,last_name,avatar_url,branch').eq('id', user.id).maybeSingle();
    return { id: data.id, userId: user.id, userName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student', userAvatar: profile?.avatar_url || '', userRole: profile?.branch || '', content: data.body, createdAt: data.created_at, updatedAt: data.updated_at, isOwn: true };
  },
  async updateComment(commentId: string, content: string): Promise<CommunityPostComment> {
    const value = content.trim();
    if (!value || value.length > 3000) throw new Error('Comments must be between 1 and 3000 characters.');
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to edit your comment.');
    const { data, error } = await db.from('post_comments').update({ body: value, updated_at: new Date().toISOString() }).eq('id', commentId).eq('user_id', user.id).select('id,user_id,body,created_at,updated_at').maybeSingle();
    if (error) throw unavailableInteraction('post_comments', error) || error;
    if (!data) throw new Error('Comment could not be updated. You may not have permission to edit it.');
    const { data: profile } = await db.from('profiles').select('first_name,last_name,avatar_url,branch').eq('id', user.id).maybeSingle();
    return { id: data.id, userId: user.id, userName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student', userAvatar: profile?.avatar_url || '', userRole: profile?.branch || '', content: data.body, createdAt: data.created_at, updatedAt: data.updated_at, isOwn: true };
  },
  async deleteComment(commentId: string): Promise<void> {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser();
    if (!user) throw new Error('Sign in to delete your comment.');
    const { data, error } = await db.from('post_comments').delete().eq('id', commentId).eq('user_id', user.id).select('id');
    if (error) throw unavailableInteraction('post_comments', error) || error;
    if (!data?.length) throw new Error('Comment could not be deleted. You may not have permission to delete it.');
  },
  async remove(postId: string) { const { error } = await requireSupabase().from('posts').delete().eq('id', postId); if (error) throw error; },
  async update(postId: string, patch: { title?: string; content?: string; category?: string | null; tags?: string[]; image_urls?: string[] }) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to edit posts.');
    const { data, error } = await db.from('posts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', postId).eq('author_id', user.id).select('*').single();
    if (error) throw error; return (await mapRows([data]))[0];
  },
};
