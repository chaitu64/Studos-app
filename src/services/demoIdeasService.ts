import type { Idea } from '../types';
import { resolveStudentIdentity } from './studentIdentity';
import { requireSupabase } from './supabase';
import { studentIdeaBookmarksService } from './studentIdeaBookmarksService';

export type DemoIdeaAuthor = {
  id: string;
  name: string;
  avatarUrl: string | null;
  college: string | null;
  branch: string | null;
  studyYear: string | null;
};

export type DemoIdea = {
  id: string;
  demoAuthorId: string;
  author: DemoIdeaAuthor;
  title: string;
  description: string;
  category: string | null;
  ideaType: string | null;
  stage: string | null;
  tags: string[];
  skillsNeeded: string[];
  collaborationOpen: boolean;
  githubUrl: string | null;
  youtubeUrl: string | null;
  createdAt: string;
  sparkCount: number | null;
  commentCount: number | null;
  collaboratorCount: number | null;
  isSparkedByViewer: boolean;
  isSavedByViewer: boolean;
  bookmarkAvailable: boolean;
  requestStatus: 'pending' | 'accepted' | 'rejected' | null;
};

export type DemoIdeaComment = {
  id: string;
  ideaId: string;
  authorId: string;
  authorName: string;
  avatarUrl: string | null;
  branch: string | null;
  createdAt: string;
  body: string;
  isMine: boolean;
  isDemo: boolean;
};

export type DemoIdeaCollaborator = {
  id: string;
  name: string;
  avatarUrl: string | null;
  branch: string | null;
  skills: string[];
  role: string | null;
  joinedAt: string;
  isDemo: boolean;
};

export type DemoIdeaLoadResult = {
  items: DemoIdea[];
  total: number;
  hasMore: boolean;
  interactionErrors: string[];
};

export type DemoIdeaInteractionState = {
  isSparked: boolean;
  isSaved: boolean;
  requestStatus: 'pending' | 'accepted' | 'rejected' | null;
};

export type DemoIdeaPaginationOptions = {
  offset?: number;
  limit?: number;
  search?: string;
  category?: string;
};

export const toAppIdea = (idea: DemoIdea): Idea => ({
  id: idea.id,
  title: idea.title,
  tagline: idea.ideaType ? `${idea.ideaType} · ${idea.category || 'Idea'}` : idea.category || '',
  problemStatement: idea.description,
  proposedSolution: '',
  targetAudience: '',
  category: (idea.category || 'Other') as Idea['category'],
  ideaType: idea.ideaType || undefined,
  stage: (idea.stage || 'Concept') as Idea['stage'],
  visibility: 'Public',
  requiredSkills: idea.skillsNeeded,
  rolesNeeded: [],
  roadmap: [],
  teamSizeNeeded: Math.max(1, idea.collaboratorCount || 1),
  currentTeamSize: Math.max(1, idea.collaboratorCount || 1),
  tags: idea.tags,
  upvotes: idea.sparkCount || 0,
  commentsCount: idea.commentCount || 0,
  createdAt: idea.createdAt,
  isUpvoted: idea.isSparkedByViewer,
  isBookmarked: idea.isSavedByViewer,
  bookmarkAvailable: idea.bookmarkAvailable,
  collaborationOpen: idea.collaborationOpen,
  resources: [
    ...(validWebUrl(idea.githubUrl) ? [{ label: 'GitHub repository', url: idea.githubUrl! }] : []),
    ...(validWebUrl(idea.youtubeUrl) ? [{ label: 'YouTube video', url: idea.youtubeUrl! }] : []),
  ],
  creator: {
    id: idea.author.id,
    name: idea.author.name,
    avatar: idea.author.avatarUrl || '',
    college: idea.author.college || '',
    role: idea.author.branch || '',
    studyYear: idea.author.studyYear ? `Year ${idea.author.studyYear}` : undefined,
    identity: resolveStudentIdentity('student_profiles', idea.author.id),
  },
});

function validWebUrl(value: string | null): boolean {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; }
  catch { return false; }
}

// Live PostgREST confirms these base-table columns. Avoid the optional feed
// view until its definition and security behavior are reconciled in SQL.
const IDEA_FIELDS = 'id,demo_author_id,title,description,category,idea_type,stage,tags,skills_needed,collaboration_open,created_at,github_url,youtube_url';
const BASE_FIELDS = IDEA_FIELDS;
const authorIdOf = (row: any): string => typeof row?.demo_author_id === 'string' ? row.demo_author_id : '';
export function demoIdeaActorProfileId(row: any): string | null {
  return typeof row?.demo_profile_id === 'string' ? row.demo_profile_id : null;
}
const isIdeaOwnerActor = (row: any, ideaAuthorId: string) => {
  const role = String(row?.role || '').toLowerCase();
  return ['author', 'owner', 'creator', 'lead'].includes(role) || Boolean(ideaAuthorId && demoIdeaActorProfileId(row) === ideaAuthorId);
};
const isSeededCollaboratorActor = (row: any) => String(row?.role || '').trim().toLowerCase() === 'collaborator';

const normalizeStrings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
  : typeof value === 'string' ? value.split(/[\s,]+/).filter(Boolean) : [];

const countMap = (rows: any[] | null | undefined) => {
  const result = new Map<string, number>();
  for (const row of rows || []) result.set(row.idea_id, (result.get(row.idea_id) || 0) + 1);
  return result;
};

async function fetchAll(build: (from: number, to: number) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await build(from, from + 499);
    if (error) return { data: null as any[] | null, error };
    rows.push(...(data || []));
    if (!data || data.length < 500) return { data: rows, error: null };
  }
}

function report(feature: string, relation: string, error: { code?: string; message?: string; details?: string | null; hint?: string | null }) {
  if (__DEV__) console.warn('[Supabase query failed]', { feature, relation, code: error.code || 'unknown', message: error.message, details: error.details, hint: error.hint });
}

function throwQuery(feature: string, relation: string, error: { code?: string }) {
  report(feature, relation, error);
  throw error;
}

async function currentUserId(expected?: string) {
  try {
    const { data: { user }, error } = await requireSupabase().auth.getUser();
    if (error || !user) return null;
    if (expected && expected !== user.id) throw new Error('The requested interaction user does not match the signed-in account.');
    return user.id;
  } catch {
    return null;
  }
}

export async function getSavedDemoIdeaIds(userId?: string | null): Promise<string[]> {
  const current = await currentUserId(userId || undefined);
  return current ? studentIdeaBookmarksService.allSavedIds() : [];
}

async function readAuthors(authorIds: string[]) {
  const db = requireSupabase();
  const ids = [...new Set(authorIds.filter(Boolean))];
  if (!ids.length) return new Map<string, any>();
  const { data, error } = await db.from('student_profiles')
    .select('id,first_name,last_name,college,degree,branch,study_year,skills,interests,github_url,portfolio_url')
    .in('id', ids);
  if (error) throwQuery('read student idea authors', 'student_profiles', error);
  const authors = new Map((data || []).map((row: any) => [row.id, row]));
  const missing = ids.filter((id) => !authors.has(id));
  if (missing.length) throw new Error(`Could not read ${missing.length} student idea author profile(s) from student_profiles. Check SELECT grants and RLS.`);
  return authors;
}

function mapAuthor(id: string, row: any): DemoIdeaAuthor {
  return {
    id,
    name: [row?.first_name, row?.last_name].filter(Boolean).join(' ') || 'Student',
    avatarUrl: row?.avatar_url || null,
    college: row?.college || null,
    branch: row?.branch || null,
    studyYear: row?.study_year == null ? null : String(row.study_year),
  };
}

async function loadInteractionMaps(ideaIds: string[], userId: string | null) {
  const db = requireSupabase();
  const [
    demoSparks,
    demoComments,
    demoActors,
    liveSparksPrimary,
    liveCommentsPrimary,
    liveCollaboratorsPrimary,
    liveRequestsPrimary,
    savedResult,
  ] = await Promise.all([
    fetchAll((from, to) => db.from('student_idea_sparks').select('idea_id').in('idea_id', ideaIds).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_comments').select('idea_id').in('idea_id', ideaIds).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_actors').select('idea_id,demo_profile_id,role,created_at').in('idea_id', ideaIds).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_live_sparks').select('idea_id,user_id').in('idea_id', ideaIds).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_live_comments').select('idea_id').in('idea_id', ideaIds).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_live_collaborators').select('idea_id,user_id,joined_at').in('idea_id', ideaIds).range(from, to)),
    userId ? fetchAll((from, to) => db.from('student_idea_live_requests').select('idea_id,status,created_at').eq('user_id', userId).in('idea_id', ideaIds).order('created_at', { ascending: false }).range(from, to)) : Promise.resolve({ data: [], error: null }),
    studentIdeaBookmarksService.savedIds(ideaIds),
  ]);

  const liveSparks = liveSparksPrimary;
  const liveComments = liveCommentsPrimary;
  const liveCollaborators = liveCollaboratorsPrimary;
  const liveRequests = liveRequestsPrimary;

  const errors = new Set<string>();
  for (const [relation, result] of [
    ['student_idea_sparks', demoSparks], ['student_idea_comments', demoComments], ['student_idea_actors', demoActors],
    ['student_idea_live_sparks', liveSparks], ['student_idea_live_comments', liveComments], ['student_idea_live_collaborators', liveCollaborators],
    ...(userId ? [['student_idea_live_requests', liveRequests]] as const : []),
  ] as const) {
    if (result.error) { report('read demo idea interactions', relation, result.error); errors.add(relation); }
  }
  const sparked = new Set((liveSparks.data || []).filter((row: any) => row.user_id === userId).map((row: any) => row.idea_id));
  const requestStatus = new Map<string, DemoIdea['requestStatus']>();
  for (const request of liveRequests.data || []) {
    if (!requestStatus.has(request.idea_id)) requestStatus.set(request.idea_id, request.status);
  }
  const actors = demoActors.error ? null : demoActors.data || [];

  return {
    errors,
    demoSparks: demoSparks.error ? null : countMap(demoSparks.data),
    liveSparks: liveSparks.error ? null : countMap(liveSparks.data),
    demoComments: demoComments.error ? null : countMap(demoComments.data),
    liveComments: liveComments.error ? null : countMap(liveComments.data),
    actors,
    liveCollaborators: liveCollaborators.error ? null : countMap(liveCollaborators.data),
    sparked,
    saved: savedResult.ids,
    bookmarkAvailable: savedResult.available,
    requestStatus,
  };
}

function makeIdea(row: any, authors: Map<string, any>, stats: Awaited<ReturnType<typeof loadInteractionMaps>>): DemoIdea {
  const authorId = authorIdOf(row);
  const demoCollaborators = (stats.actors || []).filter((actor: any) => actor.idea_id === row.id && !isIdeaOwnerActor(actor, authorId) && isSeededCollaboratorActor(actor)).length;

  const countFor = (viewVal: unknown, demoCount: number | null, liveCount: number | null) => {
    const viewCount = viewVal != null && Number.isFinite(Number(viewVal)) ? Number(viewVal) : null;
    if (viewCount !== null) return viewCount;
    if (demoCount !== null && liveCount !== null) return demoCount + liveCount;
    return null;
  };

  return {
    id: String(row.id),
    demoAuthorId: authorId,
    author: mapAuthor(authorId, authors.get(authorId)),
    title: String(row.title || ''),
    description: String(row.description || ''),
    category: row.category || null,
    ideaType: row.idea_type || null,
    stage: row.stage || null,
    tags: normalizeStrings(row.tags),
    skillsNeeded: normalizeStrings(row.skills_needed),
    collaborationOpen: Boolean(row.collaboration_open),
    githubUrl: typeof row.github_url === 'string' ? row.github_url : null,
    youtubeUrl: typeof row.youtube_url === 'string' ? row.youtube_url : null,
    createdAt: row.created_at || new Date().toISOString(),
    sparkCount: countFor(row.spark_count, stats.demoSparks ? stats.demoSparks.get(row.id) || 0 : null, stats.liveSparks ? stats.liveSparks.get(row.id) || 0 : null),
    commentCount: countFor(row.comment_count, stats.demoComments ? stats.demoComments.get(row.id) || 0 : null, stats.liveComments ? stats.liveComments.get(row.id) || 0 : null),
    collaboratorCount: countFor(row.collaborator_count, stats.actors ? demoCollaborators : null, stats.liveCollaborators ? stats.liveCollaborators.get(row.id) || 0 : null),
    isSparkedByViewer: stats.sparked.has(row.id),
    isSavedByViewer: stats.saved.has(row.id),
    bookmarkAvailable: stats.bookmarkAvailable,
    requestStatus: stats.requestStatus.get(row.id) || null,
  };
}

export async function getDemoIdeas(options: DemoIdeaPaginationOptions = {}): Promise<DemoIdeaLoadResult> {
  const db = requireSupabase();
  const userId = await currentUserId();
  const offset = Math.max(0, options.offset || 0);
  const limit = Math.min(Math.max(options.limit || 8, 1), 30);

  let query = db.from('student_ideas').select(IDEA_FIELDS, { count: 'exact' }).order('created_at', { ascending: false });
  if (options.category && options.category.toLowerCase() !== 'all') query = query.eq('category', options.category);
  if (options.search?.trim()) {
    const search = options.search.trim().replace(/[%,()]/g, ' ');
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throwQuery('load Student Idea Hub', 'student_ideas', error);
  const rows = data || [];
  const total = count ?? rows.length;

  if (!rows.length) {
    return { items: [], total: 0, hasMore: false, interactionErrors: [] };
  }

  const authors = await readAuthors(rows.map(authorIdOf).filter(Boolean));
  const stats = await loadInteractionMaps(rows.map((row: any) => row.id), userId);

  const items = rows.map((row: any) => makeIdea(row, authors, stats));
  const hasMore = offset + items.length < total;

  return { items, total, hasMore, interactionErrors: [...stats.errors] };
}

export async function getDemoIdeaById(id: string): Promise<DemoIdea | null> {
  const db = requireSupabase();
  const userId = await currentUserId();

  const { data, error } = await db.from('student_ideas').select(BASE_FIELDS).eq('id', id).maybeSingle();
  if (error) throwQuery('load student idea details', 'student_ideas', error);
  if (!data) return null;
  const authors = await readAuthors([authorIdOf(data)]);
  const stats = await loadInteractionMaps([data.id], userId);
  return makeIdea(data, authors, stats);
}

export async function toggleDemoIdeaSpark(id: string, userId?: string): Promise<boolean> {
  const authId = await currentUserId(userId);
  if (!authId) throw new Error('Sign in to Spark an idea.');
  const db = requireSupabase();

  const { data, error } = await db.from('student_idea_live_sparks').select('idea_id').eq('idea_id', id).eq('user_id', authId).maybeSingle();
  if (error) throwQuery('read Spark before toggle', 'student_idea_live_sparks', error);
  const result = data
    ? await db.from('student_idea_live_sparks').delete().eq('idea_id', id).eq('user_id', authId)
    : await db.from('student_idea_live_sparks').upsert({ idea_id: id, user_id: authId }, { onConflict: 'idea_id,user_id', ignoreDuplicates: true });
  if (result.error) throwQuery('persist student idea Spark', 'student_idea_live_sparks', result.error);
  return !data;
}

export async function toggleDemoIdeaSave(id: string, userId?: string): Promise<boolean> {
  const authId = await currentUserId(userId);
  if (!authId) throw new Error('Sign in to save an idea.');
  return studentIdeaBookmarksService.toggle(id);
}

export async function getDemoIdeaComments(id: string): Promise<DemoIdeaComment[]> {
  const db = requireSupabase();
  const userId = await currentUserId();

  const [demo, live] = await Promise.all([
    fetchAll((from, to) => db.from('student_idea_comments').select('id,idea_id,demo_profile_id,body,created_at').eq('idea_id', id).order('created_at', { ascending: true }).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_live_comments').select('id,idea_id,user_id,body,created_at').eq('idea_id', id).order('created_at', { ascending: true }).range(from, to)),
  ]);

  if (demo.error) throwQuery('load seeded idea comments', 'student_idea_comments', demo.error);
  if (live.error) throwQuery('load authenticated idea comments', 'student_idea_live_comments', live.error);

  const demoIds = [...new Set((demo.data || []).map((row: any) => row.demo_profile_id).filter(Boolean))];
  const liveIds = [...new Set((live.data || []).map((row: any) => row.user_id).filter(Boolean))];

  const [demoProfiles, liveProfiles] = await Promise.all([
    demoIds.length ? db.from('student_profiles').select('id,first_name,last_name,branch').in('id', demoIds) : Promise.resolve({ data: [], error: null }),
    liveIds.length ? db.from('profiles').select('id,first_name,last_name,branch,avatar_url').in('id', liveIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (demoProfiles.error) throwQuery('resolve seeded idea comment authors', 'student_profiles', demoProfiles.error);
  if (liveProfiles.error) throwQuery('resolve authenticated idea comment authors', 'profiles', liveProfiles.error);

  const demoMap = new Map((demoProfiles.data || []).map((row: any) => [row.id, row]));
  const liveMap = new Map((liveProfiles.data || []).map((row: any) => [row.id, row]));

  const result: DemoIdeaComment[] = [
    ...(demo.data || []).map((row: any) => {
      const profile: any = demoMap.get(row.demo_profile_id) || {};
      return {
        id: row.id,
        ideaId: row.idea_id,
        authorId: row.demo_profile_id,
        authorName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student',
        avatarUrl: profile.avatar_url || null,
        branch: profile.branch || null,
        createdAt: row.created_at,
        body: row.body,
        isMine: false,
        isDemo: true,
      };
    }),
    ...(live.data || []).map((row: any) => {
      const profile: any = liveMap.get(row.user_id) || {};
      return {
        id: row.id,
        ideaId: row.idea_id,
        authorId: row.user_id,
        authorName: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student',
        avatarUrl: profile.avatar_url || null,
        branch: profile.branch || null,
        createdAt: row.created_at,
        body: row.body,
        isMine: row.user_id === userId,
        isDemo: false,
      };
    }),
  ];

  return result.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

export async function addDemoIdeaComment(id: string, content: string): Promise<DemoIdeaComment> {
  const authId = await currentUserId();
  if (!authId) throw new Error('Sign in to comment on an idea.');
  const db = requireSupabase();

  const insertRes = await db.from('student_idea_live_comments')
    .insert({ idea_id: id, user_id: authId, body: content.trim() })
    .select('id,idea_id,user_id,body,created_at')
    .single();
  if (insertRes.error) throwQuery('insert student idea comment', 'student_idea_live_comments', insertRes.error);
  const data = insertRes.data!;

  const { data: profile } = await db.from('profiles').select('first_name,last_name,branch,avatar_url').eq('id', authId).maybeSingle();

  return {
    id: data.id,
    ideaId: data.idea_id,
    authorId: authId,
    authorName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Student',
    avatarUrl: profile?.avatar_url || null,
    branch: profile?.branch || null,
    createdAt: data.created_at,
    body: data.body,
    isMine: true,
    isDemo: false,
  };
}

export async function requestDemoIdeaCollaboration(id: string, message: string): Promise<any> {
  const userId = await currentUserId();
  if (!userId) throw new Error('Sign in to request collaboration.');
  const db = requireSupabase();

  const { data: existing, error: existingError } = await db.from('student_idea_live_requests').select('id,status').eq('idea_id', id).eq('user_id', userId).eq('status', 'pending').maybeSingle();
  if (existingError) throwQuery('check duplicate collaboration request', 'student_idea_live_requests', existingError);
  if (existing) throw new Error('You already have a pending request for this idea.');

  const insertRes = await db.from('student_idea_live_requests').insert({ idea_id: id, user_id: userId, message: message.trim(), status: 'pending' }).select('id,status,created_at').single();
  if (insertRes.error?.code === '23505') throw new Error('You already have a pending request for this idea.');
  if (insertRes.error) throwQuery('submit collaboration request', 'student_idea_live_requests', insertRes.error);

  return insertRes.data;
}

export async function getDemoIdeaCollaborators(id: string): Promise<DemoIdeaCollaborator[]> {
  const db = requireSupabase();
  const [actorsResult, liveResult] = await Promise.all([
    fetchAll((from, to) => db.from('student_idea_actors').select('idea_id,demo_profile_id,role,created_at').eq('idea_id', id).range(from, to)),
    fetchAll((from, to) => db.from('student_idea_live_collaborators').select('idea_id,user_id,joined_at').eq('idea_id', id).range(from, to)),
  ]);

  if (actorsResult.error) throwQuery('load student idea actors', 'student_idea_actors', actorsResult.error);
  if (liveResult.error) throwQuery('load accepted collaborators', 'student_idea_live_collaborators', liveResult.error);
  const { data: idea, error: ideaError } = await db.from('student_ideas').select('demo_author_id').eq('id', id).maybeSingle();
  if (ideaError) throwQuery('load student idea author', 'student_ideas', ideaError);
  const ideaAuthorId = authorIdOf(idea);
  const demoActors = (actorsResult.data || []).filter((row: any) => !isIdeaOwnerActor(row, ideaAuthorId) && isSeededCollaboratorActor(row));
  const demoIds = [...new Set(demoActors.map(demoIdeaActorProfileId).filter((value): value is string => Boolean(value)))];
  const liveIds = [...new Set((liveResult.data || []).map((row: any) => row.user_id).filter(Boolean))];

  const [demoProfiles, profiles] = await Promise.all([
    demoIds.length ? db.from('student_profiles').select('id,first_name,last_name,branch,skills').in('id', demoIds) : Promise.resolve({ data: [], error: null }),
    liveIds.length ? db.from('profiles').select('id,first_name,last_name,branch,skills,avatar_url').in('id', liveIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const demoMap = new Map((demoProfiles.data || []).map((row: any) => [row.id, row]));
  const liveMap = new Map((profiles.data || []).map((row: any) => [row.id, row]));

  return [
    ...demoActors.map((row: any) => {
      const profileId = demoIdeaActorProfileId(row);
      const profile: any = profileId ? demoMap.get(profileId) || {} : {};
      return {
        id: profileId || `${row.idea_id}:${row.role || 'collaborator'}`,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student',
        avatarUrl: profile.avatar_url || null,
        branch: profile.branch || null,
        skills: normalizeStrings(profile.skills),
        role: row.role || null,
        joinedAt: row.created_at || '',
        isDemo: true,
      };
    }),
    ...(liveResult.data || []).map((row: any) => {
      const profile: any = liveMap.get(row.user_id) || {};
      return {
        id: row.user_id,
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Student',
        avatarUrl: profile.avatar_url || null,
        branch: profile.branch || null,
        skills: normalizeStrings(profile.skills),
        role: null,
        joinedAt: row.joined_at || '',
        isDemo: false,
      };
    }),
  ];
}

