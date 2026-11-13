-- Run after migration 014. Compare post/resource counts and demo digest with preflight.
select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.student_profiles where auth_user_id is not null) as linked_profiles,
       (select count(distinct auth_user_id) from public.student_profiles where auth_user_id is not null) as distinct_users,
       (select count(*) from auth.users u left join public.student_profiles s on s.auth_user_id=u.id where s.id is null) as missing_profiles,
       (select count(*) from public.student_profiles where auth_user_id is null) as demo_profiles,
       (select count(*) from public.posts) as posts,
       (select count(*) from public.study_resources) as study_resources;

select count(*) as demo_rows,
       md5(coalesce(string_agg(to_jsonb(x)::text,E'\n' order by x.id::text),'')) as demo_digest
from (select id,first_name,middle_name,last_name,college,degree,branch,study_year,graduation_year,bio,skills,interests,avatar_url
      from public.student_profiles where auth_user_id is null) x;

select c.conrelid::regclass as source_table,c.conname,pg_get_constraintdef(c.oid,true) as definition,c.convalidated
from pg_constraint c where c.contype='f' and c.confrelid='public.profiles'::regclass;

select n.nspname as schema_name,c.relname as view_name,c.relkind
from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class c on c.oid=r.ev_class join pg_namespace n on n.oid=c.relnamespace
where d.refobjid='public.profiles'::regclass;

select p.oid::regprocedure as function_name,pg_get_functiondef(p.oid) as definition
from pg_proc p where p.prosrc ~ '(^|[^a-z_])profiles([^a-z_]|$)';

select schemaname,tablename,policyname,qual,with_check
from pg_policies where schemaname='public' and tablename<>'profiles'
and (coalesce(qual,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)' or coalesce(with_check,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)');

select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('student_profiles','profile_private');
select schemaname,tablename,policyname,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in ('student_profiles','profile_private') order by tablename,policyname;
