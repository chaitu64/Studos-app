import { CommunityPost, CommunityPostComment, CommunityPostType } from '../types';
import { requireSupabase } from './supabase';
import { signPostImagePaths } from './postMediaService';

function mapPost(row: any, profile: any = {}): CommunityPost {
  const supportedTypes = ['idea','service','story','event_collab','project','question','study_material','achievement'];
  const type = (supportedTypes.includes(row.category) ? row.category : 'story') as CommunityPostType;
  return {
    id: row.id, type, title: row.title || '', content: row.content || '',
    author: { id: row.author_id || row.user_id, identity: { type: 'real', id: row.author_id || row.user_id }, name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student', avatar: profile.avatar_url || '', college: profile.college || undefined, role: profile.branch || undefined },
    createdAt: row.created_at, createdAtTimestamp: new Date(row.created_at).getTime(), category: supportedTypes.includes(row.category) ? undefined : row.category || undefined,
    tags: row.tags || [], images: row.image_urls || (row.image_url ? [row.image_url] : []),
  };
}

async function mapRows(rows: any[]): Promise<CommunityPost[]> {
  if (!rows.length) return [];
  const db = requireSupabase(); const ids = [...new Set(rows.map((row) => row.author_id || row.user_id).filter(Boolean))];
  const result = ids.length ? await db.from('profiles').select('id,first_name,last_name,avatar_url,college,branch').in('id', ids) : { data: [], error: null };
  if (result.error) throw result.error;
  const profiles = new Map((result.data || []).map((profile: any) => [profile.id, profile]));
  return Promise.all(rows.map(async (row) => ({ ...mapPost(row, profiles.get(row.author_id || row.user_id)), images: await signPostImagePaths(row.image_urls || (row.image_url ? [row.image_url] : [])) })));
}

export const postService = {
  async feed(page = 1, perPage = 20, _type?: CommunityPostType, authorId?: string) {
    const start = Math.max(0, (page - 1) * perPage); let query = requireSupabase().from('posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(start, start + perPage - 1);
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
    const { data, error } = await db.from('posts').insert({ author_id: user.id, user_id: user.id, title: input.title, content: input.content, category: input.type, tags, image_urls: input.image_urls || [] }).select('*').single();
    if (error) throw error; return (await mapRows([data]))[0];
  },
  async toggleLike(_postId: string): Promise<boolean> { throw new Error('Post likes are unavailable in the current database schema.'); },
  async toggleSave(_postId: string): Promise<boolean> { throw new Error('Post saves are unavailable in the current database schema.'); },
  async comments(_postId: string): Promise<CommunityPostComment[]> { throw new Error('Post comments are unavailable in the current database schema.'); },
  async saved(): Promise<CommunityPost[]> { throw new Error('Saved posts are unavailable in the current database schema.'); },
  async addComment(_postId: string, _content: string): Promise<CommunityPostComment> { throw new Error('Post comments are unavailable in the current database schema.'); },
  async remove(postId: string) { const { error } = await requireSupabase().from('posts').delete().eq('id', postId); if (error) throw error; },
  async update(postId: string, patch: { title?: string; content?: string; category?: string | null; tags?: string[]; image_urls?: string[] }) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to edit posts.');
    const { data, error } = await db.from('posts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', postId).eq('author_id', user.id).select('*').single();
    if (error) throw error; return (await mapRows([data]))[0];
  },
};
