-- Restore the exact identity/profile columns consumed by the application.
-- Safe on databases that already received migration 002; no profile rows are replaced.
begin;

alter table public.profiles add column if not exists first_name text not null default '';
alter table public.profiles add column if not exists middle_name text;
alter table public.profiles add column if not exists last_name text not null default '';
alter table public.profiles add column if not exists college text;
alter table public.profiles add column if not exists branch text;
alter table public.profiles add column if not exists degree text;
alter table public.profiles add column if not exists study_year smallint;
alter table public.profiles add column if not exists graduation_year smallint;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profile_private add column if not exists college_email text;
alter table public.profile_private add column if not exists date_of_birth date;
alter table public.profile_private add column if not exists updated_at timestamptz not null default now();

-- Keep personal-data ownership enforced even on older partially migrated projects.
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profile_private_self on public.profile_private;
create policy profile_private_self on public.profile_private
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

grant select (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,created_at,updated_at)
  on public.profiles to authenticated;
grant insert (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url)
  on public.profiles to authenticated;
grant update (first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,updated_at)
  on public.profiles to authenticated;
grant select,insert,update on public.profile_private to authenticated;

commit;
