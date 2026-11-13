import type { StudyResourceLink, StudyResourceLinkType } from '../types';
import { requireSupabase } from './supabase';
import { validateStudyResourceLinkDraft } from './studyResourceLinkValidation';

const LINK_COLUMNS = 'id,study_resource_id,resource_type,title,url,submitted_by,created_at,updated_at';
export { normalizeResourceLinkUrl } from './studyResourceLinkValidation';

async function authenticatedUserId() {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in to share a learning link.');
  return data.user.id;
}

function duplicateError(error: any): never {
  if (error?.code === '23505') throw new Error('This learning link has already been shared for this PDF.');
  throw error;
}

export const studyResourceLinksService = {
  async list(studyResourceId: string): Promise<StudyResourceLink[]> {
    const db = requireSupabase();
    const { data, error } = await db.from('study_resource_links')
      .select(LINK_COLUMNS)
      .eq('study_resource_id', studyResourceId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;

    const rows = data || [];
    const contributorIds = [...new Set(rows.map((row: any) => row.submitted_by).filter((id: unknown): id is string => typeof id === 'string'))];
    const profileResult = contributorIds.length
      ? await db.from('profiles').select('id:auth_user_id,first_name,last_name').in('auth_user_id', contributorIds)
      : { data: [], error: null };
    // Link rows remain useful when profile names are hidden by RLS.
    const names = new Map((profileResult.data || []).map((profile: any) => [profile.id, [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()]));
    const viewer = await db.auth.getUser();
    const viewerId = viewer.data.user?.id;
    return rows.map((row: any) => ({
      ...row,
      resource_type: row.resource_type as StudyResourceLinkType,
      contributorName: names.get(row.submitted_by) || undefined,
      isMine: Boolean(viewerId && row.submitted_by === viewerId),
    }));
  },

  async add(studyResourceId: string, type: StudyResourceLinkType, title: string, rawUrl: string): Promise<void> {
    const userId = await authenticatedUserId();
    const input = validateStudyResourceLinkDraft(type, title, rawUrl);
    const db = requireSupabase();
    const duplicate = await db.from('study_resource_links').select('id').eq('study_resource_id', studyResourceId).eq('url', input.url).limit(1).maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data) throw new Error('This learning link has already been shared for this PDF.');
    const { error } = await db.from('study_resource_links').insert({
      study_resource_id: studyResourceId,
      resource_type: type,
      title: input.title,
      url: input.url,
      submitted_by: userId,
    });
    if (error) duplicateError(error);
  },

  async update(linkId: string, studyResourceId: string, type: StudyResourceLinkType, title: string, rawUrl: string): Promise<void> {
    const userId = await authenticatedUserId();
    const input = validateStudyResourceLinkDraft(type, title, rawUrl);
    const db = requireSupabase();
    const duplicate = await db.from('study_resource_links').select('id').eq('study_resource_id', studyResourceId).eq('url', input.url).neq('id', linkId).limit(1).maybeSingle();
    if (duplicate.error) throw duplicate.error;
    if (duplicate.data) throw new Error('This learning link has already been shared for this PDF.');
    const { data, error } = await db.from('study_resource_links')
      .update({ resource_type: type, title: input.title, url: input.url, updated_at: new Date().toISOString() })
      .eq('id', linkId)
      .eq('submitted_by', userId)
      .select('id')
      .maybeSingle();
    if (error) duplicateError(error);
    if (!data) throw new Error('You can edit only links you shared.');
  },

  async remove(linkId: string): Promise<void> {
    const userId = await authenticatedUserId();
    const { data, error } = await requireSupabase().from('study_resource_links')
      .delete()
      .eq('id', linkId)
      .eq('submitted_by', userId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('You can delete only links you shared.');
  },
};
