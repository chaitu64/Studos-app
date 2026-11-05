import { requireSupabase } from './supabase';
import type { StudentService, StudentSpotlight } from './homeDiscoveryData';

export const studentServicesService = {
  async list(options: { providerId?: string; ids?: string[] } = {}): Promise<StudentService[]> {
    if (options.ids && !options.ids.length) return [];
    const db = requireSupabase();
    let query = db.from('student_services').select('id,provider_id,title,description,category,is_active,created_at').eq('is_active', true).order('created_at', { ascending: false });
    if (options.providerId) query = query.eq('provider_id', options.providerId);
    if (options.ids) query = query.in('id', options.ids);
    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];
    const providerIds = [...new Set(rows.map((row) => row.provider_id).filter((id): id is string => Boolean(id)))];
    const profiles = providerIds.length ? await db.from('profiles').select('id,first_name,last_name,college,branch,degree,avatar_url,skills,interests,bio').in('id', providerIds) : { data: [], error: null };
    if (profiles.error) throw profiles.error;
    const profileById = new Map((profiles.data || []).map((profile: any) => [profile.id, profile]));
    return rows.flatMap((row) => {
      const profile: any = profileById.get(row.provider_id);
      if (!profile || !row.provider_id || !row.title) return [];
      const provider: StudentSpotlight = { id: profile.id, identity: { type: 'real', id: profile.id }, name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student', avatar: profile.avatar_url || '', branchYear: [profile.branch, profile.degree, profile.college].filter(Boolean).join(' · '), role: profile.branch || profile.degree || 'Student', intro: profile.bio || '', skills: Array.isArray(profile.skills) ? profile.skills : [], currentWork: Array.isArray(profile.interests) ? profile.interests.join(' · ') : '' };
      return [{ id: row.id, title: row.title, description: row.description || '', provider, category: row.category || '', skills: [], availability: '' }];
    });
  },
};
