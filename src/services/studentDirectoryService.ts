import type { Idea, TeamListing, CommunityPost, StudentDirectoryProfile, StudentIdentity, StudyResource } from '../types';
import { requireSupabase } from './supabase';
import { sharedContentService } from './sharedContentService';
import { postService } from './postService';
import { studentServicesService } from './studentServicesService';
import { listStudyResources } from './resourceApi';
import { getDemoIdeas, toAppIdea } from './demoIdeasService';
import { resolveStudentIdentity } from './studentIdentity';

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const asProfile = (row: any, type: 'real' | 'demo'): StudentDirectoryProfile => {
  const id = String(row.id);
  const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Student';
  return { id, identity: type === 'real' ? { type: 'real', id } : resolveStudentIdentity('profiles', id), isDemo: type === 'demo', name, avatar: row.avatar_url || '', college: row.college || '', branch: row.branch || '', degree: row.degree || '', studyYear: row.study_year == null ? '' : String(row.study_year), gradYear: row.graduation_year == null ? '' : String(row.graduation_year), shortBio: row.bio || '', skills: strings(row.skills), interests: strings(row.interests), githubUrl: row.github_url || undefined, linkedinUrl: row.linkedin_url || undefined, portfolioUrl: row.portfolio_url || undefined };
};
const profileColumns = 'id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url';
async function getAll(query: any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query.range(from, from + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

export const studentDirectoryService = {
  async list(options: { search?: string; college?: string; branch?: string; studyYear?: string; offset?: number; limit?: number } = {}) {
    const db = requireSupabase();
    const [realResult, demoResult] = await Promise.all([
      getAll(db.from('profiles').select(`id:auth_user_id,${profileColumns.slice(3)}`).not('auth_user_id', 'is', null).order('created_at', { ascending: false })),
      getAll(db.from('profiles').select('id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,github_url,linkedin_url,portfolio_url').is('auth_user_id', null).order('last_name', { ascending: true })),
    ].map((request) => request.then((rows) => ({ rows, error: null as unknown })).catch((error: unknown) => ({ rows: [] as any[], error }))));
    if (realResult.error && __DEV__) console.warn('[Connect directory] Auth profile query failed.', realResult.error);
    if (demoResult.error && __DEV__) console.warn('[Connect directory] Student profile query failed.', demoResult.error);
    if (realResult.error && demoResult.error) throw realResult.error;
    const realRows = realResult.rows;
    const demoRows = demoResult.rows;
    const all: StudentDirectoryProfile[] = [...realRows.map((row) => asProfile(row, 'real')), ...demoRows.map((row) => asProfile(row, 'demo'))];
    const term = options.search?.trim().toLocaleLowerCase();
    const filtered = all.filter((student) => (!term || [student.name, student.college, student.branch, ...student.skills, ...student.interests].join(' ').toLocaleLowerCase().includes(term)) && (!options.college || student.college === options.college) && (!options.branch || student.branch === options.branch) && (!options.studyYear || student.studyYear === options.studyYear));
    const offset = Math.max(0, options.offset || 0); const limit = Math.max(1, options.limit || 30);
    return { students: filtered.slice(offset, offset + limit), total: filtered.length, hasMore: offset + limit < filtered.length, colleges: [...new Set(all.map((student) => student.college).filter(Boolean))].sort(), branches: [...new Set(all.map((student) => student.branch).filter(Boolean))].sort() };
  },

  async portfolio(identity: StudentIdentity): Promise<{ profile: StudentDirectoryProfile; ideas: Idea[]; contributions: Idea[]; posts: CommunityPost[]; services: any[]; teams: TeamListing[]; resources: StudyResource[]; sectionErrors: string[] }> {
    const db = requireSupabase();
    let profile: StudentDirectoryProfile;
    let ids: Record<'ideas' | 'posts' | 'services' | 'teams' | 'study_resources', string[]> | null = null;
    if (identity.type === 'real') {
      const { data, error } = await db.from('profiles').select(`id:auth_user_id,${profileColumns.slice(3)}`).eq('auth_user_id', identity.id).maybeSingle();
      if (error) throw error; if (!data) throw new Error('This student profile could not be found.');
      profile = asProfile(data, 'real');
      const links = await db.from('profiles').select('github_url,linkedin_url,portfolio_url').eq('auth_user_id', identity.id).maybeSingle();
      if (!links.error && links.data) profile = { ...profile, githubUrl: links.data.github_url || undefined, linkedinUrl: links.data.linkedin_url || undefined, portfolioUrl: links.data.portfolio_url || undefined };
    } else {
      const { data, error } = await db.from('profiles').select('id,first_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,github_url,linkedin_url,portfolio_url').eq('id', identity.id).maybeSingle();
      if (error) throw error; if (!data) throw new Error('This student profile could not be found.');
      profile = asProfile(data, 'demo');
      const mapping = await db.from('content').select('content_type,content_id').eq('student_profile_id', identity.id);
      if (mapping.error) throw mapping.error;
      ids = { ideas: [], posts: [], services: [], teams: [], study_resources: [] };
      const aliases: Record<string, keyof typeof ids> = { idea: 'ideas', ideas: 'ideas', post: 'posts', posts: 'posts', service: 'services', services: 'services', student_service: 'services', team: 'teams', teams: 'teams', study_resource: 'study_resources', study_resources: 'study_resources' };
      for (const row of mapping.data || []) { const key = aliases[String(row.content_type).toLowerCase()]; if (key) ids[key].push(String(row.content_id)); }
    }
    const tasks = await Promise.allSettled([
      identity.type === 'demo'
        ? getDemoIdeas({ limit: 30 }).then((page) => page.items.filter((idea) => idea.author.id === identity.id).map(toAppIdea))
        : Promise.resolve([] as Idea[]),
      identity.type === 'real' ? postService.feed(1, 100, undefined, identity.id).then((result) => result.posts) : postService.byIds(ids!.posts),
      studentServicesService.list(identity.type === 'real' ? { providerId: identity.id } : { ids: ids!.services }),
      sharedContentService.list<TeamListing>('teams', identity.type === 'real' ? { ownerId: identity.id } : { ids: ids!.teams }),
      listStudyResources(identity.type === 'real' ? { ownerId: identity.id } : { ids: ids!.study_resources, limit: 100 }),
      (async () => {
        const membership = identity.type === 'demo'
          ? await db.from('idea_actors').select('idea_id,demo_profile_id,role,created_at').eq('demo_profile_id', identity.id)
          : await db.from('idea_live_collaborators').select('idea_id').eq('user_id', identity.id);
        if (membership.error) throw membership.error;
        const ideaIds = new Set((membership.data || []).map((row: any) => row.idea_id));
        if (!ideaIds.size) return [] as Idea[];
        const page = await getDemoIdeas({ limit: 30 });
        return page.items.filter((idea) => ideaIds.has(idea.id)).map(toAppIdea);
      })(),
    ]);
    const sectionErrors = tasks.flatMap((task) => task.status === 'rejected' ? [task.reason instanceof Error ? task.reason.message : 'Some portfolio content could not be loaded.'] : []);
    const values = tasks.map((task) => task.status === 'fulfilled' ? task.value : []);
    const [ideas, posts, services, teams, resources, contributions] = values as [Idea[], CommunityPost[], any[], TeamListing[], StudyResource[], Idea[]];
    const identityAuthor = { ...identity, id: identity.id };
    if (identity.type === 'demo') {
      ideas.forEach((item) => { item.creator = { ...item.creator, id: identity.id, identity: identityAuthor, name: profile.name, avatar: profile.avatar, college: profile.college, role: profile.branch || '' }; });
      posts.forEach((item) => { item.author = { ...item.author, id: identity.id, identity: identityAuthor, name: profile.name, avatar: profile.avatar, college: profile.college, role: profile.branch || '' }; });
      teams.forEach((item) => { item.lead = { ...item.lead, id: identity.id, identity: identityAuthor, name: profile.name, avatar: profile.avatar, role: profile.branch || '' }; });
      services.forEach((item) => { item.provider = { ...item.provider, id: identity.id, identity: identityAuthor, name: profile.name, avatar: profile.avatar, branchYear: [profile.branch, profile.college].filter(Boolean).join(' · '), skills: profile.skills }; });
    }
    return { profile, ideas, contributions, posts, services, teams, resources, sectionErrors };
  },
};
