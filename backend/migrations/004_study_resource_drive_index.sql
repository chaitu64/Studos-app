-- Add Drive folder/file indexing to the existing Study Hub resource catalog.
-- This migration is additive: existing rows, IDs, URLs, and RLS policies remain.
begin;

alter table public.study_resources
  add column if not exists resource_kind text not null default 'link',
  add column if not exists parent_resource_id uuid references public.study_resources(id) on delete set null,
  add column if not exists drive_mime_type text,
  add column if not exists drive_thumbnail_url text,
  add column if not exists drive_file_size bigint,
  add column if not exists drive_created_at timestamptz,
  add column if not exists drive_modified_at timestamptz;

alter table public.study_resources
  drop constraint if exists study_resources_resource_kind_check;
alter table public.study_resources
  add constraint study_resources_resource_kind_check
  check (resource_kind in ('folder', 'pdf', 'link'));

alter table public.study_resources
  drop constraint if exists study_resources_drive_file_size_check;
alter table public.study_resources
  add constraint study_resources_drive_file_size_check
  check (drive_file_size is null or drive_file_size >= 0);

-- Only mark links whose URL explicitly identifies a Drive folder.
update public.study_resources
set resource_kind = 'folder'
where drive_url ~* '^https://drive\.google\.com/drive/folders/'
  and resource_kind = 'link';

create index if not exists study_resources_parent_resource_idx
  on public.study_resources(parent_resource_id);
create index if not exists study_resources_browse_idx
  on public.study_resources(resource_kind, study_year, semester, subject);
create index if not exists study_resources_drive_modified_idx
  on public.study_resources(drive_modified_at desc)
  where drive_modified_at is not null;

commit;
