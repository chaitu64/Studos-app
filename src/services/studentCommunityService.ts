import { requireSupabase } from './supabase';
import { resolveStudentIdentity } from './studentIdentity';
import type { StudentIdentity } from '../types';

export type StudentCommunityAuthor = {
  id: string;
  identity: StudentIdentity;
  name: string;
  avatar: string;
  college: string;
  degree: string;
  branch: string;
  studyYear: string;
  isDemo: boolean;
};

export type StudentProblem = {
  id: string; authorId: string | null; demoProfileId: string | null; isDemo: boolean;
  title: string; description: string; context: string; expectedSolution: string; attachments: string[]; category: string; tags: string[]; status: string;
  createdAt: string; updatedAt: string; author: StudentCommunityAuthor;
};

export type StudentHelpRequest = {
  id: string; authorId: string | null; demoProfileId: string | null; isDemo: boolean;
  title: string; description: string; attachments: string[]; category: string; skillsNeeded: string[]; helpType: string; status: string;
  createdAt: string; updatedAt: string; author: StudentCommunityAuthor;
};

export type StudentTeamOpening = {
  id: string; authorId: string | null; demoProfileId: string | null; isDemo: boolean;
  eventName: string; roleTitle: string; description: string; skillsNeeded: string[]; openings: number; status: string;
  createdAt: string; author: StudentCommunityAuthor;
};

type IdentityRow = { id: string; first_name?: string | null; last_name?: string | null; avatar_url?: string | null; college?: string | null; degree?: string | null; branch?: string | null; study_year?: string | number | null };

function authorFrom(row: any, profiles: Map<string, IdentityRow>, demos: Map<string, IdentityRow>): StudentCommunityAuthor {
  const demoId = typeof row.demo_profile_id === 'string' ? row.demo_profile_id : null;
  const authId = typeof row.author_id === 'string' ? row.author_id : null;
  const isDemo = row.is_demo === true || Boolean(demoId);
  const id = (isDemo ? demoId : authId) || demoId || authId || '';
  const profile = (isDemo && demoId ? demos.get(demoId) : undefined) || (authId ? profiles.get(authId) : undefined);
  return {
    id,
    identity: resolveStudentIdentity(isDemo ? 'profiles' : 'auth', id),
    name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'STUDOS student',
    avatar: profile?.avatar_url || '', college: profile?.college || '', degree: profile?.degree || '',
    branch: profile?.branch || '', studyYear: profile?.study_year == null ? '' : String(profile.study_year), isDemo,
  };
}

async function resolveAuthors(rows: any[]) {
  const db = requireSupabase();
  const authIds = [...new Set(rows.filter((row) => row.is_demo !== true && !row.demo_profile_id).map((row) => row.author_id).filter((id): id is string => typeof id === 'string'))];
  const demoIds = [...new Set(rows.map((row) => row.demo_profile_id).filter((id): id is string => typeof id === 'string'))];
  const [authResult, demoResult] = await Promise.all([
    authIds.length ? db.from('profiles').select('id:auth_user_id,first_name,last_name,avatar_url,college,degree,branch,study_year').in('auth_user_id', authIds) : Promise.resolve({ data: [], error: null }),
    demoIds.length ? db.from('profiles').select('id,first_name,last_name,avatar_url,college,degree,branch,study_year').in('id', demoIds) : Promise.resolve({ data: [], error: null }),
  ]);
  // Keep records visible if an optional author lookup is restricted; expose the query failure in dev logs.
  for (const [relation, error] of [['profiles (Auth mappings)', authResult.error], ['profiles (demo)', demoResult.error]] as const) {
    if (error && __DEV__) console.warn('[Supabase query failed]', { feature: 'resolve community authors', relation, code: error.code, message: error.message, details: error.details, hint: error.hint });
  }
  return {
    auth: new Map(((authResult.data || []) as IdentityRow[]).map((profile) => [profile.id, profile])),
    demos: new Map(((demoResult.data || []) as IdentityRow[]).map((profile) => [profile.id, profile])),
  };
}

async function readRows(relation: string, select: string, limit = 60, offset = 0) {
  const { data, error } = await requireSupabase().from(relation).select(select).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) {
    if (__DEV__) console.warn('[Supabase query failed]', { feature: `load ${relation}`, relation, code: error.code, message: error.message, details: error.details, hint: error.hint });
    throw error;
  }
  return data || [];
}

export const studentCommunityService = {
  async problem(id: string): Promise<StudentProblem> {
    const { data, error } = await requireSupabase().from('problems').select('id,author_id,demo_profile_id,is_demo,title,description,context,expected_solution,attachments,category,tags,status,created_at,updated_at').eq('id', id).single();
    if (error) throw error;
    const identities = await resolveAuthors([data]);
    return { id: data.id, authorId: data.author_id, demoProfileId: data.demo_profile_id, isDemo: data.is_demo === true, title: data.title, description: data.description, context: data.context || '', expectedSolution: data.expected_solution || '', attachments: data.attachments || [], category: data.category || '', tags: Array.isArray(data.tags) ? data.tags : [], status: data.status || '', createdAt: data.created_at, updatedAt: data.updated_at, author: authorFrom(data, identities.auth, identities.demos) };
  },

  async helpRequest(id: string): Promise<StudentHelpRequest> {
    const { data, error } = await requireSupabase().from('help_requests').select('id,author_id,demo_profile_id,is_demo,title,description,attachments,category,skills_needed,help_type,status,created_at,updated_at').eq('id', id).single();
    if (error) throw error;
    const identities = await resolveAuthors([data]);
    return { id: data.id, authorId: data.author_id, demoProfileId: data.demo_profile_id, isDemo: data.is_demo === true, title: data.title, description: data.description, attachments: data.attachments || [], category: data.category || '', skillsNeeded: Array.isArray(data.skills_needed) ? data.skills_needed : [], helpType: data.help_type || '', status: data.status || '', createdAt: data.created_at, updatedAt: data.updated_at, author: authorFrom(data, identities.auth, identities.demos) };
  },

  async problems(offset = 0, limit = 60): Promise<StudentProblem[]> {
    const rows = await readRows('problems', 'id,author_id,demo_profile_id,is_demo,title,description,context,expected_solution,attachments,category,tags,status,created_at,updated_at', limit, offset);
    const identities = await resolveAuthors(rows);
    return rows.map((row: any) => ({
      id: row.id, authorId: row.author_id, demoProfileId: row.demo_profile_id, isDemo: row.is_demo === true,
      title: row.title, description: row.description, context: row.context || '', expectedSolution: row.expected_solution || '', attachments: row.attachments || [], category: row.category || '', tags: Array.isArray(row.tags) ? row.tags : [],
      status: row.status || '', createdAt: row.created_at, updatedAt: row.updated_at, author: authorFrom(row, identities.auth, identities.demos),
    }));
  },

  async helpRequests(offset = 0, limit = 60): Promise<StudentHelpRequest[]> {
    const rows = await readRows('help_requests', 'id,author_id,demo_profile_id,is_demo,title,description,attachments,category,skills_needed,help_type,status,created_at,updated_at', limit, offset);
    const identities = await resolveAuthors(rows);
    return rows.map((row: any) => ({
      id: row.id, authorId: row.author_id, demoProfileId: row.demo_profile_id, isDemo: row.is_demo === true,
      title: row.title, description: row.description, attachments: row.attachments || [], category: row.category || '', skillsNeeded: Array.isArray(row.skills_needed) ? row.skills_needed : [],
      helpType: row.help_type || '', status: row.status || '', createdAt: row.created_at, updatedAt: row.updated_at, author: authorFrom(row, identities.auth, identities.demos),
    }));
  },

  async teamOpenings(): Promise<StudentTeamOpening[]> {
    const rows = await readRows('team_openings', 'id,author_id,demo_profile_id,is_demo,event_name,role_title,description,skills_needed,openings,status,created_at', 80);
    const identities = await resolveAuthors(rows);
    return rows.map((row: any) => ({
      id: row.id, authorId: row.author_id, demoProfileId: row.demo_profile_id, isDemo: row.is_demo === true,
      eventName: row.event_name || '', roleTitle: row.role_title, description: row.description, skillsNeeded: Array.isArray(row.skills_needed) ? row.skills_needed : [],
      openings: Number(row.openings || 0), status: row.status || '', createdAt: row.created_at, author: authorFrom(row, identities.auth, identities.demos),
    })).filter((row: StudentTeamOpening) => row.status.toLowerCase() === 'open');
  },

  async createProblem(input: { title: string; description: string; context?: string; expectedSolution?: string; attachments?: string[]; category: string; tags: string[] }): Promise<StudentProblem> {
    const db = requireSupabase(); const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError; if (!user) throw new Error('Sign in to post a problem.');
    const title = input.title.trim(); const description = input.description.trim();
    if (title.length < 8 || title.length > 180) throw new Error('Titles must be 8 to 180 characters.');
    if (description.length < 80 || description.length > 6000) throw new Error('Describe the problem in 80 to 6000 characters.');
    if (!input.category.trim()) throw new Error('Choose a category.');
    const { data, error } = await db.from('problems').insert({
      author_id: user.id, demo_profile_id: null, is_demo: false, title, description,
      category: input.category.trim(), context: input.context?.trim() || '', expected_solution: input.expectedSolution?.trim() || '', attachments: input.attachments || [], tags: input.tags.map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
    }).select('id,author_id,demo_profile_id,is_demo,title,description,context,expected_solution,attachments,category,tags,status,created_at,updated_at').single();
    if (error) throw error;
    const identities = await resolveAuthors([data]);
    return { ...data, authorId: data.author_id, demoProfileId: data.demo_profile_id, isDemo: false, context: data.context || '', expectedSolution: data.expected_solution || '', attachments: data.attachments || [], category: data.category || '', tags: data.tags || [], status: data.status || '', createdAt: data.created_at, updatedAt: data.updated_at, author: authorFrom(data, identities.auth, identities.demos) };
  },

  async createHelpRequest(input: { title: string; description: string; attachments?: string[]; category: string; skillsNeeded: string[]; helpType: string }): Promise<StudentHelpRequest> {
    const db = requireSupabase(); const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError) throw authError; if (!user) throw new Error('Sign in to request help.');
    const title = input.title.trim(); const description = input.description.trim();
    if (title.length < 8 || title.length > 180) throw new Error('Titles must be 8 to 180 characters.');
    if (description.length < 80 || description.length > 6000) throw new Error('Describe your request in 80 to 6000 characters.');
    if (!input.category.trim() || !input.helpType.trim()) throw new Error('Choose a category and type of help.');
    const { data, error } = await db.from('help_requests').insert({
      author_id: user.id, demo_profile_id: null, is_demo: false, title, description,
      category: input.category.trim(), attachments: input.attachments || [], help_type: input.helpType.trim(), skills_needed: input.skillsNeeded.map((skill) => skill.trim()).filter(Boolean),
    }).select('id,author_id,demo_profile_id,is_demo,title,description,attachments,category,skills_needed,help_type,status,created_at,updated_at').single();
    if (error) throw error;
    const identities = await resolveAuthors([data]);
    return { id: data.id, authorId: data.author_id, demoProfileId: data.demo_profile_id, isDemo: false, title: data.title, description: data.description, attachments: data.attachments || [], category: data.category || '', skillsNeeded: data.skills_needed || [], helpType: data.help_type || '', status: data.status || '', createdAt: data.created_at, updatedAt: data.updated_at, author: authorFrom(data, identities.auth, identities.demos) };
  },

  async updateProblem(id: string, patch: { title: string; description: string; context?: string; expectedSolution?: string; attachments?: string[]; category: string; tags: string[] }) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to edit this problem.');
    if (patch.title.trim().length < 8 || patch.title.trim().length > 180 || patch.description.trim().length < 80 || patch.description.trim().length > 6000 || !patch.category.trim()) throw new Error('Use a title of 8–180 characters, description of 80–6000 characters, and a category.');
    const { data, error } = await db.from('problems').update({ title: patch.title.trim(), description: patch.description.trim(), context: patch.context?.trim() || '', expected_solution: patch.expectedSolution?.trim() || '', attachments: patch.attachments || [], category: patch.category.trim(), tags: patch.tags }).eq('id', id).eq('author_id', user.id).eq('is_demo', false).select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This problem could not be updated. You may not own it.');
  },
  async deleteProblem(id: string) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to delete this problem.');
    const { data, error } = await db.from('problems').delete().eq('id', id).eq('author_id', user.id).eq('is_demo', false).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('This problem could not be deleted. You may not own it.');
  },

  async updateHelpRequest(id: string, patch: { title: string; description: string; attachments?: string[]; category: string; skillsNeeded: string[]; helpType: string }) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to edit this help request.');
    if (patch.title.trim().length < 8 || patch.title.trim().length > 180 || patch.description.trim().length < 80 || patch.description.trim().length > 6000 || !patch.category.trim()) throw new Error('Use a title of 8–180 characters, description of 80–6000 characters, and a category.');
    if (!['collaboration', 'technical', 'mentorship', 'feedback', 'other'].includes(patch.helpType)) throw new Error('Choose a valid help type.');
    const { data, error } = await db.from('help_requests').update({ title: patch.title.trim(), description: patch.description.trim(), attachments: patch.attachments || [], category: patch.category.trim(), skills_needed: patch.skillsNeeded, help_type: patch.helpType, updated_at: new Date().toISOString() }).eq('id', id).eq('author_id', user.id).eq('is_demo', false).select('id').maybeSingle();
    if (error) throw error; if (!data) throw new Error('This help request could not be updated. You may not own it.');
  },
  async deleteHelpRequest(id: string) {
    const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to delete this help request.');
    const { data, error } = await db.from('help_requests').delete().eq('id', id).eq('author_id', user.id).eq('is_demo', false).select('id');
    if (error) throw error; if (!data?.length) throw new Error('This help request could not be deleted. You may not own it.');
  },
};
