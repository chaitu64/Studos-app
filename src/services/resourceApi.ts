import { Linking } from 'react-native';
import { StudyResource } from '../types';
import { requireSupabase } from './supabase';
import { normalizeDriveUrl } from './driveUrl';
import { buildStudyHubPdfQuery, dedupeStudyPdfs, isIndividualStudyPdf, StudyHubPdfRow, toStudyHubPdfResource } from './studyHubPdf';
export { normalizeDriveUrl } from './driveUrl';

export type ResourceInput = {
  title: string; category: StudyResource['type']; college?: string; university?: string; degree?: string; branch?: string;
  study_year?: string; semester?: string; subject: string; subject_code?: string; academic_year: string; regulation?: string;
  unit_module?: string; description?: string; language?: string; drive_url: string; rights_confirmed: boolean;
};

const toResource = (row: any): StudyResource => ({
  id: row.id, type: row.category, title: row.title, subject: row.subject, academicYear: row.academic_year,
  college: row.college, university: row.university, degree: row.degree, studyYear: row.study_year ? String(row.study_year) : undefined,
  regulation: row.regulation, unitModule: row.unit_module, branch: row.branch, semester: row.semester, subjectCode: row.subject_code, language: row.language,
  pageCount: 0, description: row.description || '', topics: [row.branch, row.semester, row.subject_code, row.regulation].filter(Boolean),
  fileName: row.original_file_name || row.title, pdfUrl: row.drive_url, fileType: 'application/pdf', thumbnailStatus: 'failed',
  resourceKind: row.resource_kind || (/\/drive\/folders\//.test(row.drive_url || '') ? 'folder' : 'link'),
  parentResourceId: row.parent_resource_id || null, driveMimeType: row.drive_mime_type || null,
  driveThumbnailUrl: row.drive_thumbnail_url || null, thumbnailUrl: row.drive_thumbnail_url || undefined,
  driveFileSize: row.drive_file_size == null ? null : Number(row.drive_file_size), driveCreatedAt: row.drive_created_at || null, driveModifiedAt: row.drive_modified_at || null,
  uploader: { id: row.user_id, name: row.resource_kind === 'pdf' ? 'STUDOS' : [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ') || 'Student', avatar: row.profiles?.avatar_url || '', college: row.profiles?.college },
  uploadedAt: row.drive_created_at || row.created_at, isBookmarked: Boolean(row.is_saved),
});

export async function createStudyResource(input: ResourceInput) {
  if (!input.rights_confirmed) throw new Error('Confirm that you have the right to share this material.');
  const drive = normalizeDriveUrl(input.drive_url);
  const db = requireSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('Sign in to share a resource.');
  const { rights_confirmed, ...fields } = input;
  const { data, error } = await db.from('study_resources').insert({ ...fields, user_id: user.id, drive_url: drive.url, drive_file_id: drive.id, rights_confirmed_at: new Date().toISOString(), study_year: fields.study_year ? Number(fields.study_year) : null }).select('*,profiles(first_name,last_name,avatar_url,college)').single();
  if (error?.code === '23505') throw new Error('This Google Drive file is already listed in Study Hub.');
  if (error) throw error;
  return toResource(data);
}

export type StudyResourceFilters = { search?: string; college?: string; branch?: string; studyYear?: number; semester?: string; subject?: string; category?: string; regulation?: string; ownerId?: string; ids?: string[]; parentResourceId?: string; offset?: number; limit?: number };
export type StudyResourcePage = { items: StudyResource[]; total: number; hasMore: boolean; rawCount?: number };

export async function listStudyHubPdfPage(options: StudyResourceFilters = {}): Promise<StudyResourcePage> {
  const offset = Math.max(0, options.offset || 0);
  const db = requireSupabase();
  if (options.ids && !options.ids.length) return { items: [], total: 0, hasMore: false };
  let result = await buildStudyHubPdfQuery(db, options);
  if (result.error && result.error.code === 'PGRST200') result = await buildStudyHubPdfQuery(db, options, false);
  if (result.error && ['42703', 'PGRST204'].includes(result.error.code || '')) return listLegacyStudyHubPdfPage(options, offset);
  const { data, error, count } = result;
  if (error) throw error;
  const rows = dedupeStudyPdfs((data || []) as unknown as StudyHubPdfRow[]);
  const total = count || 0;
  const rawCount = data?.length || 0;
  if (!rows.length && total === 0) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) throw new Error('Sign in to view Study Hub resources. This project restricts resource reads to authenticated users.');
  }
  return { items: rows.map(toStudyHubPdfResource), total, rawCount, hasMore: offset + rawCount < total };
}

async function listLegacyStudyHubPdfPage(options: StudyResourceFilters, offset: number): Promise<StudyResourcePage> {
  const db = requireSupabase();
  const limit = Math.min(Math.max(options.limit || 24, 1), 50);
  const run = async (columns: string) => {
    let query = db.from('study_resources').select(columns, { count: 'exact' })
      .not('drive_url', 'is', null).neq('drive_url', '')
      .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (options.category && options.category !== 'all') query = query.eq('category', options.category);
    if (options.studyYear) query = query.eq('study_year', options.studyYear);
    if (options.semester?.trim()) query = query.ilike('semester', `%${options.semester.trim()}%`);
    if (options.subject?.trim()) query = query.ilike('subject', `%${options.subject.trim()}%`);
    if (options.college?.trim()) query = query.ilike('college', `%${options.college.trim()}%`);
    if (options.branch?.trim()) query = query.ilike('branch', `%${options.branch.trim()}%`);
    if (options.regulation?.trim()) query = query.ilike('regulation', `%${options.regulation.trim()}%`);
    if (options.search?.trim()) {
      const term = options.search.trim().replace(/[\\%,*()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      if (term) query = query.or(`title.ilike.%${term}%,subject.ilike.%${term}%,description.ilike.%${term}%`);
    }
    return query;
  };
  const extendedColumns = 'id,user_id,title,category,subject,academic_year,study_year,semester,college,university,degree,branch,subject_code,regulation,unit_module,description,language,drive_url,drive_file_id,resource_kind,drive_mime_type,drive_thumbnail_url,drive_file_size,drive_created_at,drive_modified_at,created_at';
  const baseColumns = 'id,user_id,title,category,subject,academic_year,study_year,semester,college,university,degree,branch,subject_code,regulation,unit_module,description,language,drive_url,drive_file_id,created_at';
  let result = await run(extendedColumns);
  if (result.error && ['42703', 'PGRST204'].includes(result.error.code || '')) result = await run(baseColumns);
  const { data, error, count } = result;
  if (error) throw error;
  const items = (data || []).flatMap((row: any) => {
    const url = typeof row.drive_url === 'string' ? row.drive_url : '';
    const fileName = String(row.title || '').trim();
    const isPdf = row.drive_mime_type === 'application/pdf' || row.resource_kind === 'pdf' || /\.pdf$/i.test(fileName);
    if (!url || !isPdf || /\/drive\/folders\//i.test(url)) return [];
    let driveFileId = row.drive_file_id || '';
    if (!driveFileId) {
      try { driveFileId = normalizeDriveUrl(url).id; } catch { return []; }
    }
    if (!driveFileId) return [];
    const resource = toResource({ ...row, pdf_link: url, pdf_file_name: fileName, drive_file_id: driveFileId, resource_kind: 'pdf' });
    return [{ ...resource, pdfUrl: url, pdfFileName: fileName, driveFileId, resourceKind: 'pdf' as const }];
  });
  const rawCount = data?.length || 0;
  return { items, total: count || 0, rawCount, hasMore: offset + rawCount < (count || 0) };
}

export async function fetchStudyHubPdf(id: string): Promise<StudyResource | null> {
  const db = requireSupabase();
  const columns = 'id,user_id,title,subject,category,study_year,semester,college,degree,regulation,pdf_file_name,pdf_link,file_size_mb,source_folder_url,drive_file_id,created_at';
  const run = (withRelations: boolean) => db.from('study_resources')
    .select(`${columns}${withRelations ? ',profiles(first_name,last_name,college),saved_resources(user_id)' : ''}`)
    .eq('id', id).not('pdf_link', 'is', null).not('pdf_file_name', 'is', null)
    .neq('pdf_link', '').neq('pdf_file_name', '').maybeSingle();
  let result = await run(true);
  if (result.error?.code === 'PGRST200') result = await run(false);
  const { data, error } = result;
  if (error) {
    if (error.code === '42703' || error.code === 'PGRST204') {
      throw new Error('Study Hub PDF schema mismatch: study_resources must include pdf_file_name, pdf_link, file_size_mb, and source_folder_url.');
    }
    throw error;
  }
  if (!data) return null;
  if (!isIndividualStudyPdf(data as unknown as StudyHubPdfRow)) throw new Error('This record is not an individual PDF or its Drive file link is invalid.');
  return toStudyHubPdfResource(data as unknown as StudyHubPdfRow);
}

export async function listStudyResourcePage(options: StudyResourceFilters = {}): Promise<StudyResourcePage> {
  const db = requireSupabase();
  const offset = Math.max(0, options.offset || 0);
  const limit = Math.min(Math.max(options.limit || 24, 1), 50);
  const run = async (withProfile: boolean, useSearchDocument: boolean) => {
  let query = db.from('study_resources').select(withProfile ? '*,profiles(first_name,last_name,avatar_url,college),saved_resources(user_id)' : '*,saved_resources(user_id)', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (options.search?.trim()) {
    if (useSearchDocument) query = query.textSearch('search_document', options.search.trim(), { type: 'websearch', config: 'english' });
    else {
      const term = options.search.trim().replace(/[\\%,*()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
      if (term) query = query.or(`title.ilike.%${term}%,subject.ilike.%${term}%`);
    }
  }
  if (options.college) query = query.ilike('college', `%${options.college}%`);
  if (options.branch) query = query.ilike('branch', `%${options.branch}%`);
  if (options.studyYear) query = query.eq('study_year', options.studyYear);
  if (options.semester) query = query.eq('semester', options.semester);
  if (options.subject) query = query.ilike('subject', `%${options.subject}%`);
  if (options.category && options.category !== 'all') query = query.eq('category', options.category);
  if (options.ownerId) query = query.eq('user_id', options.ownerId);
  if (options.ids) query = query.in('id', options.ids);
  if (options.parentResourceId) query = query.eq('parent_resource_id', options.parentResourceId).eq('resource_kind', 'pdf');
  if (options.regulation?.trim()) query = query.ilike('regulation', `%${options.regulation.trim()}%`);
  return query;
  };
  let withProfile = true;
  let useSearchDocument = true;
  let result = await run(withProfile, useSearchDocument);
  if (result.error?.code === '42703' && options.search?.trim() && /search_document/i.test(result.error.message || '')) {
    useSearchDocument = false;
    result = await run(withProfile, useSearchDocument);
  }
  // Some existing Supabase projects have the earlier profiles schema without
  // avatar_url. The resources remain readable without the optional author join.
  if (result.error?.code === '42703' || result.error?.code === 'PGRST200') {
    withProfile = false;
    result = await run(withProfile, useSearchDocument);
    if (result.error?.code === '42703' && options.search?.trim() && /search_document/i.test(result.error.message || '')) result = await run(withProfile, false);
  }
  if (result.error) throw result.error;
  const items = (result.data || []).map((row: any) => toResource({ ...row, is_saved: row.saved_resources?.length > 0 }));
  const total = result.count || 0;
  return { items, total, hasMore: offset + items.length < total };
}

export async function listStudyResources(options: StudyResourceFilters = {}) {
  return (await listStudyResourcePage({ ...options, limit: options.limit || 40 })).items;
}
export async function listSavedResources() {
  const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to view saved resources.');
  const saved = await db.from('saved_resources').select('resource_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false });
  if (saved.error) throw saved.error; const ids = (saved.data || []).map((item) => item.resource_id); if (!ids.length) return [];
  const rows = await db.from('study_resources').select('*,profiles(first_name,last_name,avatar_url,college)').in('id', ids); if (rows.error) throw rows.error;
  const order = new Map(ids.map((id, index) => [id, index]));
  return (rows.data || []).map((row: any) => {
    const savedPdfRow = { ...row, saved_resources: [{ user_id: user.id }] } as StudyHubPdfRow;
    return isIndividualStudyPdf(savedPdfRow) ? toStudyHubPdfResource(savedPdfRow) : toResource({ ...row, is_saved: true });
  }).sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0));
}

export async function fetchResource(id: string) {
  const db = requireSupabase();
  let pdfResource: StudyResource | null = null;
  try { pdfResource = await fetchStudyHubPdf(id); }
  catch (cause) {
    if (!(cause instanceof Error) || !cause.message.startsWith('Study Hub PDF schema mismatch:')) throw cause;
  }
  if (pdfResource) return pdfResource;
  const { data, error } = await db.from('study_resources').select('*').eq('id', id).single();
  if (error) throw error;
  const resource = toResource(data);
  return { ...resource, pdfUrl: data.drive_url || resource.pdfUrl, driveFileId: data.drive_file_id || resource.driveFileId, resourceKind: data.resource_kind || resource.resourceKind, driveMimeType: data.drive_mime_type || resource.driveMimeType, pdfFileName: data.title || resource.pdfFileName };
}
export async function updateStudyResource(id: string, input: Partial<ResourceInput>) {
  const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to edit this resource.');
  const { rights_confirmed, drive_url, ...fields } = input;
  const patch: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
  if (drive_url) { const drive = normalizeDriveUrl(drive_url); patch.drive_url = drive.url; patch.drive_file_id = drive.id; }
  if (fields.study_year) patch.study_year = Number(fields.study_year);
  if (rights_confirmed === true) patch.rights_confirmed_at = new Date().toISOString();
  const { data, error } = await db.from('study_resources').update(patch).eq('id', id).eq('user_id', user.id).select('*,profiles(first_name,last_name,avatar_url,college)').single();
  if (error?.code === '23505') throw new Error('This Google Drive file is already listed in Study Hub.'); if (error) throw error;
  return toResource(data);
}
export async function removeStudyResource(id: string) {
  const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in to delete this resource.');
  const { error } = await db.from('study_resources').delete().eq('id', id).eq('user_id', user.id); if (error) throw error;
}
export const saveResource = async (id: string, saved: boolean) => {
  const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in required.');
  const result = saved ? await db.from('saved_resources').upsert({ user_id: user.id, resource_id: id }) : await db.from('saved_resources').delete().eq('user_id', user.id).eq('resource_id', id);
  if (result.error) throw result.error;
};
export const isResourceSaved = async (id: string) => {
  const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) return false;
  const { data, error } = await db.from('saved_resources').select('resource_id').eq('user_id', user.id).eq('resource_id', id).maybeSingle(); if (error) throw error; return Boolean(data);
};
export const reportBrokenResource = async (id: string) => {
  const db = requireSupabase(); const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('Sign in required.');
  const { error } = await db.from('resource_reports').insert({ resource_id: id, reporter_id: user.id, reason: 'broken_link' });
  if (error?.code === '23505') return;
  if (error) throw error;
};
export const openDriveResource = (url: string) => Linking.openURL(normalizeDriveUrl(url).url);
