-- Read-only migration 012 preflight. Run in Supabase SQL Editor before deployment.
-- Returns schema/security metadata and counts only; no emails, phones, or profile text.

-- 1) Column compatibility, including columns the trigger/backfill/save functions use.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name in ('student_profiles','profiles','profile_private','posts','study_resources')
order by table_name, ordinal_position;

-- Required student_profiles columns that the migration's inserts would not supply.
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='student_profiles'
  and is_nullable='NO' and column_default is null
  and column_name not in ('id','auth_user_id','first_name','last_name','college','degree','branch',
    'study_year','graduation_year','bio','skills','interests','avatar_url','onboarding_completed')
order by ordinal_position;

-- 2) Row and mapping counts. User-reported live baseline: Auth=4, profiles=4,
-- each Auth user already linked once, and 20 demo profiles with auth_user_id NULL.
-- Treat SQL Editor output as authoritative; abort any write migration if it differs.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as compatibility_profiles,
  (select count(*) from auth.users u join public.profiles p on p.id=u.id) as auth_users_with_profile,
  (select count(*) from auth.users u left join public.profiles p on p.id=u.id where p.id is null) as auth_users_missing_profile,
  (select count(*) from public.student_profiles) as student_profiles_total,
  (select count(*) from public.student_profiles where auth_user_id is not null) as auth_linked_student_profiles,
  (select count(*) from public.student_profiles where auth_user_id is null) as unlinked_demo_candidates;

-- Save this digest, then compare it with the same query after deployment. It fingerprints demo identity/content fields only.
select count(*) as demo_row_count,
       md5(coalesce(string_agg(to_jsonb(x)::text,E'\n' order by x.id::text),'')) as demo_identity_digest
from (
  select id,first_name,last_name,college,degree,branch,study_year,graduation_year,bio,skills,interests,avatar_url
  from public.student_profiles where auth_user_id is null
) x;

select auth_user_id, count(*) as rows_per_auth_user
from public.student_profiles where auth_user_id is not null
group by auth_user_id having count(*) > 1;

-- Confirms every current Auth user will be sourced by the profiles-based backfill.
select count(*) as auth_users_with_compatibility_profile,
       count(*) filter (where p.id is null) as auth_users_without_compatibility_profile
from auth.users u left join public.profiles p on p.id=u.id;

-- Record aggregate baselines to compare after deployment; no row contents are exposed.
select 'posts' as relation_name,count(*) as row_count from public.posts
union all select 'study_resources',count(*) from public.study_resources
union all select 'conversations',count(*) from public.conversations
union all select 'conversation_members',count(*) from public.conversation_members
union all select 'messages',count(*) from public.messages;

-- 3) Existing PKs, FKs, unique constraints, indexes, and references to profile tables.
select tc.table_name, tc.constraint_name, tc.constraint_type, kcu.column_name,
       ccu.table_name as referenced_table, ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_name=tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
where tc.constraint_schema='public'
  and (tc.table_name in ('student_profiles','profiles','profile_private','posts','study_resources')
       or ccu.table_name in ('student_profiles','profiles','profile_private'))
order by tc.table_name, tc.constraint_type, tc.constraint_name;

select schemaname, tablename, indexname, indexdef
from pg_indexes where schemaname='public' and tablename in ('student_profiles','profiles','profile_private','posts','study_resources')
order by tablename,indexname;

-- 4) RLS flags, policies, and table/column grants. Inspect profile_private for owner-only predicates.
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and (c.relname in ('student_profiles','profiles','profile_private','posts','study_resources')
  or c.relname like '%chat%' or c.relname like 'conversation%'
  or c.relname in ('messages','room_members','room_messages'))
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
  and (tablename in ('student_profiles','profiles','profile_private','posts','study_resources')
       or tablename like '%chat%' or tablename like 'conversation%'
       or tablename in ('messages','room_members','room_messages'))
order by tablename,policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('student_profiles','profiles','profile_private')
  and grantee in ('PUBLIC','anon','authenticated')
order by table_name,grantee,privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name in ('student_profiles','profiles','profile_private')
  and grantee in ('PUBLIC','anon','authenticated')
order by table_name,column_name,grantee,privilege_type;

-- 5) Auth triggers/functions. Look for any existing trigger that also inserts into student_profiles.
select count(*) as user_auth_trigger_count,
       count(*) filter (where t.tgname in ('on_auth_user_created','on_auth_user_created_studos','studos_create_canonical_profile_trigger')) as supplied_trigger_names_found,
       array_agg(t.tgname order by t.tgname) as trigger_names
from pg_trigger t join pg_class r on r.oid=t.tgrelid join pg_namespace n on n.oid=r.relnamespace
where not t.tgisinternal and n.nspname='auth' and r.relname='users';

select t.tgname, t.tgenabled, pg_get_triggerdef(t.oid,true) as trigger_definition,
       p.oid::regprocedure as trigger_function,p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class r on r.oid=t.tgrelid join pg_namespace n on n.oid=r.relnamespace
join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and ((n.nspname='auth' and r.relname='users')
  or (n.nspname='public' and r.relname in ('profiles','student_profiles')))
order by n.nspname,r.relname,t.tgname;

select p.oid::regprocedure as function_name, p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and (p.proname in ('handle_new_user','initialize_student_profile','studos_create_canonical_profile')
       or p.proname ilike '%profile%' or p.prosrc ilike '%student_profiles%')
order by p.proname;

-- 6) Preserve the exact dependency definitions for posts.author_id and study_resources.user_id.
select tc.table_name, kcu.column_name, ccu.table_name as referenced_table,
       ccu.column_name as referenced_column, rc.update_rule, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_catalog=tc.constraint_catalog and kcu.constraint_schema=tc.constraint_schema
 and kcu.constraint_name=tc.constraint_name and kcu.table_name=tc.table_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_catalog=tc.constraint_catalog and ccu.constraint_schema=tc.constraint_schema
 and ccu.constraint_name=tc.constraint_name
join information_schema.referential_constraints rc
  on rc.constraint_catalog=tc.constraint_catalog and rc.constraint_schema=tc.constraint_schema
 and rc.constraint_name=tc.constraint_name
where tc.constraint_schema='public' and tc.constraint_type='FOREIGN KEY'
  and ((tc.table_name='posts' and kcu.column_name='author_id')
       or (tc.table_name='study_resources' and kcu.column_name='user_id'))
order by tc.table_name,kcu.column_name;
