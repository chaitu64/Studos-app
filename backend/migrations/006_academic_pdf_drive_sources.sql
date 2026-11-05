-- Add provenance and parent-resource metadata for Drive-discovered PDFs.
-- Source folders remain in study_resources; PDFs stay unpublished until a
-- permitted document delivery path and verification have been configured.
begin;

alter table public.academic_pdfs
  add column if not exists source_file_id text,
  add column if not exists parent_resource_id uuid references public.study_resources(id) on delete set null,
  add column if not exists college text,
  add column if not exists degree text,
  add column if not exists regulation text,
  add column if not exists source_created_at timestamptz,
  add column if not exists source_modified_at timestamptz,
  add column if not exists source_thumbnail_url text;

create unique index if not exists academic_pdfs_source_file_id_idx
  on public.academic_pdfs(source_file_id)
  where source_file_id is not null;
create index if not exists academic_pdfs_parent_resource_idx
  on public.academic_pdfs(parent_resource_id)
  where parent_resource_id is not null;

grant select (college, degree, regulation, source_created_at, source_modified_at)
  on public.academic_pdfs to anon, authenticated;

-- Provenance and institutional metadata remain outside the client SELECT grant.
commit;
