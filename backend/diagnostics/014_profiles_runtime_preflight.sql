-- Run read-only in Supabase SQL Editor before staging cutover. Save the complete output.
select to_regclass('auth.users') as auth_users,
       to_regclass('public.profiles') as legacy_profiles,
       to_regclass('public.student_profiles') as canonical_profiles,
       to_regclass('public.profile_private') as private_profiles,
       to_regclass('public.posts') as posts,
       to_regclass('public.study_resources') as study_resources;

-- If migration history is installed, this identifies its table; query versions 012/013 only when non-NULL.
select to_regclass('supabase_migrations.schema_migrations') as migration_history_table;

select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.student_profiles where auth_user_id is not null) as linked_rows,
       (select count(distinct auth_user_id) from public.student_profiles where auth_user_id is not null) as mapped_auth_users,
       (select count(*) from auth.users u left join public.student_profiles s on s.auth_user_id=u.id where s.id is null) as auth_without_profile,
       (select count(*) from public.student_profiles where auth_user_id is null) as demo_rows,
       (select count(*) from public.posts) as posts,
       (select count(*) from public.study_resources) as study_resources;

select auth_user_id,count(*) as linked_rows from public.student_profiles where auth_user_id is not null
group by auth_user_id having count(*)<>1;

select count(*) as demo_rows,
       md5(coalesce(string_agg(to_jsonb(x)::text,E'\n' order by x.id::text),'')) as demo_digest
from (select id,first_name,middle_name,last_name,college,degree,branch,study_year,graduation_year,bio,skills,interests,avatar_url
      from public.student_profiles where auth_user_id is null) x;

select schemaname,tablename,indexname,indexdef from pg_indexes
where schemaname='public' and tablename='student_profiles' and indexdef ilike '%auth_user_id%';

select table_name,column_name,data_type,is_nullable
from information_schema.columns where table_schema='public'
  and ((table_name='student_profiles' and column_name in ('id','auth_user_id','onboarding_completed','phone_number'))
    or (table_name='profile_private' and column_name in ('id','phone_number')))
order by table_name,ordinal_position;

select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) as definition,
       p.oid::regprocedure as function_name,p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and n.nspname='auth' and c.relname='users' order by t.tgname;

select p.oid::regprocedure as function_name,p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as owner,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname ilike '%profile%' or p.proname ilike '%chat%'
  or p.proname ilike '%contact%' or p.prosrc ~ '(^|[^a-z_])profiles([^a-z_]|$)')
order by p.proname;

-- Exact routine inventory for the live audit: this should list each function whose
-- body references the legacy relation, including its identity signature and ACL.
select p.oid::regprocedure as exact_function_name,p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as owner,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as full_definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosrc ~* '(^|[^a-z_])profiles([^a-z_]|$)'
order by p.proname,pg_get_function_identity_arguments(p.oid);

select c.conrelid::regclass as source_table,c.conname,pg_get_constraintdef(c.oid,true) as definition,c.convalidated
from pg_constraint c where c.contype='f' and c.confrelid='public.profiles'::regclass order by 1,2;

select n.nspname as schema_name,c.relname as view_name,c.relkind,pg_get_viewdef(c.oid,true) as definition
from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class c on c.oid=r.ev_class join pg_namespace n on n.oid=c.relnamespace
where d.refobjid='public.profiles'::regclass order by 1,2;

select n.nspname as schema_name,c.relname as relation_name,t.tgname,pg_get_triggerdef(t.oid,true) as definition,
       p.oid::regprocedure as function_name,pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and (t.tgrelid='public.profiles'::regclass or p.prosrc ~ '(^|[^a-z_])profiles([^a-z_]|$)')
order by 1,2,3;

select schemaname,tablename,policyname,cmd,qual,with_check
from pg_policies where schemaname='public' and (tablename='profiles'
  or coalesce(qual,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)'
  or coalesce(with_check,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)')
order by tablename,policyname;

select table_name,grantee,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('profiles','student_profiles','profile_private')
order by table_name,grantee,privilege_type;

select tc.table_name,kcu.column_name,ccu.table_name as target_table,ccu.column_name as target_column,rc.delete_rule
from information_schema.table_constraints tc join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_name=tc.table_name
join information_schema.constraint_column_usage ccu on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
join information_schema.referential_constraints rc on rc.constraint_schema=tc.constraint_schema and rc.constraint_name=tc.constraint_name
where tc.constraint_schema='public' and tc.constraint_type='FOREIGN KEY'
  and tc.table_name in ('posts','study_resources','profile_private','student_contact_requests','conversation_requests')
order by tc.table_name,kcu.column_name;
