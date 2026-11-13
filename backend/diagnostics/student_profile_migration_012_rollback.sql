-- Non-destructive operational rollback for migration 012.
-- First roll the application back to a build that edits public.profiles directly.
-- This intentionally retains added columns, Auth links, indexes, FKs, and user data.
-- Restore any pre-migration student_profiles grants/policies from the preflight snapshot
-- only if the old application requires them; do not delete canonical rows or demo rows.
begin;

drop trigger if exists profiles_sync_student_profile on public.profiles;
drop function if exists public.sync_compat_profile_to_student_profile();
revoke all on function public.save_student_profile(jsonb) from public, anon, authenticated;
revoke all on function public.ensure_student_profile() from public, anon, authenticated;

-- Restore the known 005 compatibility-table permissions and owner policies for the old client.
drop policy if exists profiles_compat_authenticated_read on public.profiles;
drop policy if exists profiles_compat_owner_insert on public.profiles;
drop policy if exists profiles_compat_owner_update on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated with check (id=auth.uid());
create policy profiles_self_update on public.profiles
  for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
grant select (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,created_at,updated_at,github_url,linkedin_url,portfolio_url)
  on public.profiles to authenticated;
grant insert (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url)
  on public.profiles to authenticated;
grant update (first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,updated_at,github_url,linkedin_url,portfolio_url)
  on public.profiles to authenticated;

drop policy if exists profile_private_phone_owner on public.profile_private;
create policy profile_private_self on public.profile_private
  for all to authenticated using (id=auth.uid()) with check (id=auth.uid());

commit;

-- Keep initialize_student_profile() with its hardened search_path. It is safe for the
-- existing Auth compatibility trigger and equivalent to the previous trigger behavior.
-- Leave the student_profiles read policy and additive schema in place to preserve demo access/data.
