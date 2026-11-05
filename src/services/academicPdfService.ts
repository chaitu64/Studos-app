import { AcademicPdf, AcademicPdfCategory, AcademicPdfSubject } from '../types';
import { requireSupabase } from './supabase';

const ACADEMIC_PDF_COLUMNS = [
  'id', 'title', 'subject_name', 'subject_code', 'academic_year', 'semester',
  'year_semester', 'category', 'description', 'original_file_name', 'pdf_url',
  'preview_url', 'file_size', 'page_count', 'university', 'college', 'degree',
  'regulation', 'source_created_at', 'source_modified_at', 'is_verified',
  'is_published', 'extraction_status', 'created_at',
].join(',');

export type AcademicPdfFilters = {
  academicYear: number;
  semester: number;
  subjectName?: string | null;
  category?: AcademicPdfCategory | 'all';
  search?: string;
  offset?: number;
  limit?: number;
};

export type AcademicPdfPage = { items: AcademicPdf[]; total: number };

export async function listAcademicPdfSubjects(academicYear: number, semester: number): Promise<AcademicPdfSubject[]> {
  const { data, error } = await requireSupabase().rpc('get_academic_pdf_subjects', {
    p_year: academicYear,
    p_semester: semester,
  });
  if (error) throw new Error(error.code === '42883' || error.code === 'PGRST202'
    ? 'VVIT Academic Library migration 003 has not been applied to Supabase yet.'
    : error.message);
  return (data || []) as AcademicPdfSubject[];
}

export async function listAcademicPdfs(filters: AcademicPdfFilters): Promise<AcademicPdfPage> {
  const db = requireSupabase();
  const offset = filters.offset ?? 0;
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 50);
  let query = db.from('academic_pdfs')
    .select(ACADEMIC_PDF_COLUMNS, { count: 'exact' })
    .eq('is_published', true)
    .eq('is_verified', true)
    .eq('academic_year', filters.academicYear)
    .eq('semester', filters.semester)
    .order('subject_name', { ascending: true })
    .order('title', { ascending: true })
    .range(offset, offset + limit - 1);

  if (filters.subjectName) query = query.eq('subject_name', filters.subjectName);
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.search?.trim()) {
    query = query.textSearch('search_document', filters.search.trim(), { type: 'websearch', config: 'english' });
  }

  const { data, error, count } = await query;
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') throw new Error('VVIT Academic Library migration 003 has not been applied to Supabase yet.');
    throw new Error(error.message);
  }
  return { items: (data || []) as unknown as AcademicPdf[], total: count || 0 };
}

export async function getAcademicPdf(id: string): Promise<AcademicPdf> {
  const { data, error } = await requireSupabase().from('academic_pdfs')
    .select(ACADEMIC_PDF_COLUMNS)
    .eq('id', id)
    .eq('is_published', true)
    .eq('is_verified', true)
    .single();
  if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
    ? 'VVIT Academic Library migration 003 has not been applied to Supabase yet.'
    : error.message);
  return data as unknown as AcademicPdf;
}

export async function createAcademicPdfViewerUrl(pdf: AcademicPdf): Promise<string> {
  if (!pdf.pdf_url) throw new Error('This PDF is not accessible yet. Please try again later.');
  const { data, error } = await requireSupabase().storage
    .from('academic-pdf-files')
    .createSignedUrl(pdf.pdf_url, 60 * 60);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not create a secure PDF viewing link.');
  return data.signedUrl;
}
