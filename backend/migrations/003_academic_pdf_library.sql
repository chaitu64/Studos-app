-- VVIT Academic PDF catalog. This migration is additive and safe to re-run.
begin;

create extension if not exists pgcrypto;

-- Keep older deployments compatible with profile cards used elsewhere in app.
alter table public.profiles add column if not exists degree text;
alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.academic_pdfs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject_name text,
  subject_code text,
  academic_year smallint,
  semester smallint,
  year_semester text generated always as (
    case when academic_year is null or semester is null then null
      else academic_year::text || '-' || semester::text end
  ) stored,
  category text not null default 'other',
  description text not null,
  original_file_name text,
  source_url text not null,
  source_key text not null unique,
  pdf_url text,
  preview_url text,
  file_type text not null default 'application/pdf',
  file_size bigint,
  page_count integer,
  file_sha256 text,
  university text not null default 'Vasireddy Venkatadri Institute of Technology',
  is_verified boolean not null default false,
  is_published boolean not null default false,
  extraction_status text not null default 'discovered',
  extraction_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(subject_name, '') || ' ' ||
      coalesce(subject_code, '') || ' ' || coalesce(description, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(academic_year::text || '-' || semester::text, '')
    )
  ) stored,
  constraint academic_pdfs_year_check check (academic_year is null or academic_year between 1 and 4),
  constraint academic_pdfs_semester_check check (semester is null or semester in (1, 2)),
  constraint academic_pdfs_category_check check (category in (
    'important_questions', 'previous_question_paper', 'lecture_notes', 'unit_notes',
    'study_materials', 'assignment', 'laboratory_manual', 'practical_record',
    'syllabus', 'model_question_paper', 'reference_material', 'other'
  )),
  constraint academic_pdfs_file_type_check check (file_type = 'application/pdf'),
  constraint academic_pdfs_file_size_check check (file_size is null or file_size >= 0),
  constraint academic_pdfs_page_count_check check (page_count is null or page_count >= 0),
  constraint academic_pdfs_status_check check (extraction_status in (
    'discovered', 'metadata_extracted', 'downloaded', 'preview_generated',
    'imported', 'needs_review', 'source_failed', 'restricted', 'invalid_pdf', 'oversize', 'excluded'
  ))
);

create index if not exists academic_pdfs_year_idx on public.academic_pdfs (academic_year);
create index if not exists academic_pdfs_semester_idx on public.academic_pdfs (semester);
create index if not exists academic_pdfs_year_semester_idx on public.academic_pdfs (year_semester);
create index if not exists academic_pdfs_subject_idx on public.academic_pdfs (lower(subject_name));
create index if not exists academic_pdfs_category_idx on public.academic_pdfs (category);
create index if not exists academic_pdfs_university_idx on public.academic_pdfs (university);
create index if not exists academic_pdfs_browse_idx on public.academic_pdfs (academic_year, semester, lower(subject_name));
create index if not exists academic_pdfs_search_idx on public.academic_pdfs using gin (search_document);
create index if not exists academic_pdfs_published_idx on public.academic_pdfs (is_published, academic_year, semester, created_at desc);

alter table public.academic_pdfs enable row level security;

drop policy if exists academic_pdfs_read_published on public.academic_pdfs;
create policy academic_pdfs_read_published on public.academic_pdfs
  for select to anon, authenticated using (is_published = true and is_verified = true);

drop policy if exists academic_pdfs_admin_manage on public.academic_pdfs;
create policy academic_pdfs_admin_manage on public.academic_pdfs
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

revoke all on public.academic_pdfs from anon, authenticated;
grant select (
  id, title, subject_name, subject_code, academic_year, semester, year_semester,
  category, description, original_file_name, pdf_url, preview_url, file_type,
  file_size, page_count, file_sha256, university, is_verified, is_published,
  extraction_status, created_at, updated_at, search_document
) on public.academic_pdfs to anon, authenticated;
grant insert, update, delete on public.academic_pdfs to authenticated;

create or replace function public.get_academic_pdf_subjects(p_year smallint, p_semester smallint)
returns table(subject_name text, subject_code text, document_count bigint)
language sql stable security invoker set search_path = '' as $$
  select p.subject_name, p.subject_code, count(*)::bigint
  from public.academic_pdfs p
  where p.is_published = true and p.is_verified = true
    and p.academic_year = p_year and p.semester = p_semester
    and p.subject_name is not null and btrim(p.subject_name) <> ''
  group by p.subject_name, p.subject_code
  order by p.subject_name, p.subject_code nulls first
$$;
grant execute on function public.get_academic_pdf_subjects(smallint, smallint) to anon, authenticated;

-- Expose private import diagnostics and the original source link to admins only.
create or replace function public.get_academic_pdf_admin_details(p_id uuid)
returns table(source_url text, source_key text, extraction_error text, extraction_status text)
language sql stable security definer set search_path = '' as $$
  select p.source_url, p.source_key, p.extraction_error, p.extraction_status
  from public.academic_pdfs p
  where p.id = p_id and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;
revoke all on function public.get_academic_pdf_admin_details(uuid) from public;
grant execute on function public.get_academic_pdf_admin_details(uuid) to authenticated;

create or replace function public.set_academic_pdf_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists academic_pdfs_updated_at on public.academic_pdfs;
create trigger academic_pdfs_updated_at before update on public.academic_pdfs
  for each row execute function public.set_academic_pdf_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('academic-pdf-previews', 'academic-pdf-previews', true, 2097152, array['image/jpeg']),
  ('academic-pdf-files', 'academic-pdf-files', false, 41943040, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists academic_pdf_preview_admin_insert on storage.objects;
create policy academic_pdf_preview_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'academic-pdf-previews' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists academic_pdf_preview_admin_update on storage.objects;
create policy academic_pdf_preview_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'academic-pdf-previews' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'academic-pdf-previews' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists academic_pdf_preview_admin_delete on storage.objects;
create policy academic_pdf_preview_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'academic-pdf-previews' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists academic_pdf_file_read_published on storage.objects;
create policy academic_pdf_file_read_published on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'academic-pdf-files' and exists (
      select 1 from public.academic_pdfs p
      where p.pdf_url = storage.objects.name and p.is_published = true and p.is_verified = true
    )
  );

drop policy if exists academic_pdf_file_admin_insert on storage.objects;
create policy academic_pdf_file_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'academic-pdf-files' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists academic_pdf_file_admin_update on storage.objects;
create policy academic_pdf_file_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'academic-pdf-files' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (bucket_id = 'academic-pdf-files' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists academic_pdf_file_admin_delete on storage.objects;
create policy academic_pdf_file_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'academic-pdf-files' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

commit;
