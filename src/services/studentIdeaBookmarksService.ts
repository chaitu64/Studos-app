import { requireSupabase } from './supabase';

let bookmarkRelationAvailable: boolean | null = null;
let warnedUnavailable = false;
const permanentBookmarkErrors = new Set(['42P01', '42501', '42703', 'PGRST202', 'PGRST204', 'PGRST205']);

function schemaUnavailable(error: { code?: string; message?: string }) {
  if (!permanentBookmarkErrors.has(error.code || '')) return false;
  bookmarkRelationAvailable = false;
  if (__DEV__ && !warnedUnavailable) {
    warnedUnavailable = true;
    console.warn('[Idea bookmark] Persistent bookmark support is unavailable.', { code: error.code, message: error.message });
  }
  return true;
}

export const studentIdeaBookmarksService = {
  async isSaved(ideaId: string): Promise<boolean> {
    if (bookmarkRelationAvailable === false) throw new Error('Idea bookmarks are unavailable until migration 009 is applied.');
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) return false;
    const { data, error } = await db.from('idea_live_saves')
      .select('idea_id').eq('idea_id', ideaId).eq('user_id', user.id).maybeSingle();
    if (error) { schemaUnavailable(error); throw error; }
    bookmarkRelationAvailable = true;
    return Boolean(data);
  },

  async savedIds(ideaIds: string[]): Promise<{ ids: Set<string>; available: boolean }> {
    if (!ideaIds.length || bookmarkRelationAvailable === false) return { ids: new Set(), available: bookmarkRelationAvailable !== false };
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) return { ids: new Set(), available: false };
    const { data, error } = await db.from('idea_live_saves').select('idea_id')
      .eq('user_id', user.id).in('idea_id', ideaIds);
    if (error) {
      const schemaError = schemaUnavailable(error);
      if (__DEV__ && !schemaError) console.warn('[Idea bookmark] Could not read bookmark state.', { code: error.code, message: error.message });
      return { ids: new Set(), available: false };
    }
    bookmarkRelationAvailable = true;
    return { ids: new Set((data || []).map((row: any) => row.idea_id)), available: true };
  },

  async allSavedIds(): Promise<string[]> {
    if (bookmarkRelationAvailable === false) return [];
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sign in to view saved ideas.');
    const ids: string[] = [];
    for (let from = 0; ; from += 500) {
      const result = await db.from('idea_live_saves').select('idea_id').eq('user_id', user.id).range(from, from + 499);
      if (result.error) {
        schemaUnavailable(result.error);
        throw result.error;
      }
      ids.push(...(result.data || []).map((row: any) => row.idea_id));
      if (!result.data || result.data.length < 500) break;
    }
    bookmarkRelationAvailable = true;
    return ids;
  },

  async toggle(ideaId: string): Promise<boolean> {
    if (bookmarkRelationAvailable === false) throw new Error('Idea bookmarks are unavailable until migration 009 is applied.');
    const db = requireSupabase();
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sign in to save an idea.');
    const { data, error } = await db.rpc('toggle_student_idea_save', { target_idea_id: ideaId });
    if (error) { schemaUnavailable(error); throw error; }
    bookmarkRelationAvailable = true;
    return Boolean(data);
  },
};
