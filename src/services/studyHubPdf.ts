import type { StudyResource, StudyResourceType } from '../types';

export type StudyHubPdfFilters = {
  search?: string;
  studyYear?: number;
  semester?: string;
  subject?: string;
  category?: string;
  offset?: number;
  limit?: number;
};

export type StudyHubPdfRow = {
  id: string;
  user_id?: string | null;
  title: string | null;
  subject: string | null;
  category: string | null;
  study_year: number | string | null;
  semester: number | string | null;
  college: string | null;
  degree: string | null;
  regulation: string | null;
  pdf_file_name: string | null;
  pdf_link: string | null;
  file_size_mb: number | string | null;
  source_folder_url: string | null;
  drive_file_id: string | null;
  created_at: string | null;
  profiles?: { first_name?: string | null; last_name?: string | null; college?: string | null } | null;
  saved_resources?: { user_id: string }[];
};

function driveFileIdFromIndividualUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'drive.google.com' || /\/drive\/folders\//i.test(url.pathname)) return null;
    const pathId = url.pathname.match(/\/file\/d\/([\w-]+)/i)?.[1];
    const id = pathId || url.searchParams.get('id');
    return id && /^[\w-]{10,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function isIndividualStudyPdf(row: StudyHubPdfRow): boolean {
  const fileName = row.pdf_file_name?.trim();
  const link = row.pdf_link?.trim();
  const fileId = row.drive_file_id?.trim();
  if (!row.id || !fileName || !link || !fileId) return false;
  return driveFileIdFromIndividualUrl(link) === fileId;
}

export function dedupeStudyPdfs(rows: StudyHubPdfRow[]): StudyHubPdfRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!isIndividualStudyPdf(row)) return false;
    const key = row.drive_file_id!.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function profileName(row: StudyHubPdfRow) {
  const name = [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(' ').trim();
  return name || 'Student';
}

export function toStudyHubPdfResource(row: StudyHubPdfRow): StudyResource {
  const parsedSizeMb = row.file_size_mb == null || row.file_size_mb === '' ? undefined : Number(row.file_size_mb);
  const fileSizeMb = parsedSizeMb != null && Number.isFinite(parsedSizeMb) && parsedSizeMb >= 0 ? parsedSizeMb : undefined;
  const fileSize = fileSizeMb == null ? undefined : fileSizeMb * 1024 * 1024;
  const studyYear = row.study_year == null || row.study_year === '' ? undefined : String(row.study_year);
  const semester = row.semester == null || row.semester === '' ? undefined : String(row.semester);
  const category = (row.category || 'other') as StudyResourceType;
  return {
    id: row.id,
    type: category,
    title: row.title || row.pdf_file_name || 'PDF',
    subject: row.subject || 'Subject not provided',
    college: row.college || undefined,
    degree: row.degree || undefined,
    studyYear,
    academicYear: studyYear || '',
    semester,
    regulation: row.regulation || undefined,
    pageCount: 0,
    description: '',
    topics: row.regulation ? [row.regulation] : [],
    fileName: row.pdf_file_name || row.title || 'PDF',
    pdfUrl: row.pdf_link || undefined,
    pdfFileName: row.pdf_file_name || undefined,
    driveFileId: row.drive_file_id || undefined,
    fileSizeMb,
    driveFileSize: fileSize,
    fileSize,
    sourceFolderUrl: row.source_folder_url || undefined,
    fileType: 'application/pdf',
    thumbnailStatus: 'failed',
    resourceKind: 'pdf',
    uploadedAt: row.created_at || '',
    createdAt: row.created_at || undefined,
    isBookmarked: Boolean(row.saved_resources?.length),
    uploader: {
      id: row.user_id || '',
      name: profileName(row),
      avatar: '',
      college: row.profiles?.college || row.college || undefined,
    },
  };
}

export function buildStudyHubPdfQuery(db: any, filters: StudyHubPdfFilters = {}, includeOptionalRelations = true) {
  const offset = Math.max(0, filters.offset || 0);
  const limit = Math.min(Math.max(filters.limit || 24, 1), 50);
  const columns = 'id,user_id,title,subject,category,study_year,semester,college,degree,regulation,pdf_file_name,pdf_link,file_size_mb,source_folder_url,drive_file_id,created_at';
  const relationships = includeOptionalRelations ? ',profiles(first_name,last_name,college),saved_resources(user_id)' : '';
  let query = db.from('study_resources')
    .select(`${columns}${relationships}`, { count: 'exact' })
    .not('pdf_link', 'is', null)
    .not('pdf_file_name', 'is', null)
    .neq('pdf_link', '')
    .neq('pdf_file_name', '')
    .order('subject', { ascending: true })
    .order('pdf_file_name', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (filters.studyYear) query = query.eq('study_year', filters.studyYear);
  if (filters.semester?.trim()) query = query.ilike('semester', `%${filters.semester.trim()}%`);
  if (filters.subject?.trim()) query = query.ilike('subject', `%${filters.subject.trim()}%`);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  const search = filters.search?.trim().replace(/[^\p{L}\p{N} _-]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (search) query = query.or(`pdf_file_name.ilike.%${search}%,subject.ilike.%${search}%,title.ilike.%${search}%`);
  return query;
}

