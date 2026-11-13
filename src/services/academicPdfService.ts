import { AcademicPdf } from '../types';
import { requireSupabase } from './supabase';

const ACADEMIC_PDF_COLUMNS = [
  'id', 'title', 'subject_name', 'subject_code', 'academic_year', 'semester',
  'year_semester', 'category', 'description', 'original_file_name', 'pdf_url',
  'preview_url', 'file_size', 'page_count', 'university', 'college', 'degree',
  'regulation', 'source_created_at', 'source_modified_at', 'is_verified',
  'is_published', 'extraction_status', 'created_at',
].join(',');

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
