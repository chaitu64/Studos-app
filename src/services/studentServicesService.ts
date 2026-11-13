import { requireSupabase } from './supabase';
import type { StudentService, StudentSpotlight } from './homeDiscoveryData';
const ownerId = (row: any): string => typeof row?.provider_id === 'string' ? row.provider_id : '';

async function readActiveServices(options: { providerId?: string; ids?: string[]; limit?: number } = {}) {
  const db = requireSupabase();
  let query = db.from('services')
    .select('id,provider_id,title,description,category,price_from,is_active,created_at')
    .eq('is_active', true).order('created_at', { ascending: false });
  if (options.providerId) query = query.eq('provider_id', options.providerId);
  if (options.ids) query = query.in('id', options.ids);
  if (options.limit) query = query.limit(options.limit);
  return query;
}

function logLookupFailure(relation: string, error: any) {
  if (__DEV__) console.warn('[Supabase query failed]', {
    feature: 'resolve student service providers', relation,
    code: error?.code || 'unknown', message: error?.message,
    details: error?.details, hint: error?.hint,
  });
}

async function mapActiveServices(rows: any[], options: { providerId?: string; ids?: string[]; limit?: number } = {}): Promise<StudentService[]> {
  const db = requireSupabase();
  const idFilter = options.ids ? new Set(options.ids) : null;
  const services = rows.filter((row) => row.is_active === true && (!options.providerId || ownerId(row) === options.providerId) && (!idFilter || idFilter.has(row.id)));
  const providerIds = [...new Set(services.map(ownerId).filter(Boolean))];
  const authProfiles = providerIds.length
    ? await db.from('profiles').select('id:auth_user_id,first_name,last_name,college,branch,degree,study_year,avatar_url,skills,interests,bio').in('auth_user_id', providerIds)
    : { data: [], error: null };
  if (authProfiles.error) logLookupFailure('profiles', authProfiles.error);

  // provider_id is an Auth UUID; resolve only canonical authenticated profiles.
  const byId = new Map<string, { row: any; kind: 'real' }>();
  for (const profile of authProfiles.data || []) byId.set(profile.id, { row: profile, kind: 'real' });

  return services.flatMap((row) => {
    const providerId = ownerId(row);
    if (!providerId || !row.title) return [];
    const resolved = byId.get(providerId);
    const profile = resolved?.row;
    const identity = resolved ? { type: resolved.kind, id: providerId } as const : undefined;
    const provider: StudentSpotlight = {
      id: providerId, identity, isDemo: false,
      name: profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student' : 'Provider details unavailable',
      avatar: profile?.avatar_url || '',
      branchYear: profile ? [profile.college, profile.degree, profile.branch, profile.study_year ? `Year ${profile.study_year}` : ''].filter(Boolean).join(' · ') : '',
      role: profile?.branch || profile?.degree || 'Student', intro: profile?.bio || '',
      skills: Array.isArray(profile?.skills) ? profile.skills : [],
      currentWork: Array.isArray(profile?.interests) ? profile.interests.join(' · ') : '',
    };
    return [{ id: row.id, title: row.title, description: row.description || '', provider,
      category: row.category || '', skills: [], availability: '',
      startingPrice: Number(row.price_from), createdAt: row.created_at || undefined, isActive: row.is_active === true }];
  });
}

async function list(options: { providerId?: string; ids?: string[]; limit?: number } = {}): Promise<StudentService[]> {
  if (options.ids?.length === 0) return [];
  const { data, error } = await readActiveServices(options);
  if (error) {
    if (__DEV__) console.warn('[Supabase query failed]', { feature: 'Student services', relation: 'services', code: error.code || 'unknown', message: error.message, details: error.details, hint: error.hint });
    throw error;
  }
  if (__DEV__ && data?.length === 0) console.info('[Student services] Query succeeded with no rows for authenticated discovery.', { relation: 'services', activeOnly: true, ownerFilter: Boolean(options.providerId) });
  return mapActiveServices(data || [], options);
}

export const studentServicesService = {
  async listHomeServices(): Promise<StudentService[]> {
    try {
      const { data, error } = await readActiveServices({ limit: 4 });
      if (error) throw error;
      return mapActiveServices(data || [], { limit: 4 });
    } catch (error: any) {
      if (__DEV__) console.warn('[Supabase query failed]', { feature: 'Home services', relation: 'services', code: error?.code || 'unknown', message: error?.message, details: error?.details, hint: error?.hint });
      throw error;
    }
  },
  async listDiscoverable(): Promise<StudentService[]> { return list(); },
  list,
};
