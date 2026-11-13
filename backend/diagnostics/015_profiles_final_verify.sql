-- Run after migration 015. Compare post/resource counts with the saved preflight output.
select to_regclass('public.profiles') as legacy_profiles,
       to_regclass('public.student_profiles') as canonical_profiles,
       to_regclass('public.profile_private') as private_profiles;

select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.student_profiles where auth_user_id is not null) as linked_profiles,
       (select count(distinct auth_user_id) from public.student_profiles where auth_user_id is not null) as distinct_auth_users,
       (select count(*) from auth.users u left join public.student_profiles s on s.auth_user_id=u.id where s.id is null) as auth_without_profile,
       (select count(*) from public.student_profiles where auth_user_id is null) as demo_profiles,
       (select count(*) from public.posts) as posts,
       (select count(*) from public.study_resources) as study_resources;

select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('student_profiles','profile_private');
select schemaname,tablename,policyname,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in ('student_profiles','profile_private') order by tablename,policyname;
