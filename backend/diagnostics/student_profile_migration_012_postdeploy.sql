-- Read-only post-deployment verification for migration 012.
-- Expected currently: 4 Auth users linked, no duplicate links, and 20 null-linked demos.

-- One linked canonical row per existing Auth user that has a compatibility profile.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as compatibility_profiles,
  (select count(*) from auth.users u join public.profiles p on p.id=u.id) as auth_users_with_profile,
  (select count(*) from public.student_profiles where auth_user_id is not null) as linked_student_profiles,
  (select count(distinct auth_user_id) from public.student_profiles where auth_user_id is not null) as distinct_linked_users,
  (select count(*) from public.student_profiles where auth_user_id is null) as null_linked_demo_profiles;

-- Compare with the corresponding preflight result; migration 012 must leave these counts unchanged.
select 'posts' as relation_name,count(*) as row_count from public.posts
union all select 'study_resources',count(*) from public.study_resources
union all select 'conversations',count(*) from public.conversations
union all select 'conversation_members',count(*) from public.conversation_members
union all select 'messages',count(*) from public.messages;

-- Must return zero rows.
select auth_user_id, count(*) as linked_rows
from public.student_profiles where auth_user_id is not null
group by auth_user_id having count(*) <> 1;

-- Must return zero if every current Auth account has a compatibility profile and backfill succeeded.
select count(*) as auth_users_without_canonical_profile
from auth.users u
left join public.student_profiles s on s.auth_user_id=u.id
where s.id is null;

-- Check the existing 20 demo rows remain present and unlinked.
select count(*) as demo_profiles_still_unlinked
from public.student_profiles where auth_user_id is null;

-- Compare row count and digest to the preflight snapshot; values should match exactly.
select count(*) as demo_row_count,
       md5(coalesce(string_agg(to_jsonb(x)::text,E'\n' order by x.id::text),'')) as demo_identity_digest
from (
  select id,first_name,last_name,college,degree,branch,study_year,graduation_year,bio,skills,interests,avatar_url
  from public.student_profiles where auth_user_id is null
) x;

-- No completed profile may have required fields missing or outside accepted bounds.
select count(*) as invalid_completed_profiles
from public.student_profiles
where onboarding_completed is true
  and auth_user_id is not null
  and (nullif(trim(coalesce(first_name,'')),'') is null
    or nullif(trim(coalesce(last_name,'')),'') is null
    or nullif(trim(coalesce(college,'')),'') is null
    or nullif(trim(coalesce(degree,'')),'') is null
    or nullif(trim(coalesce(branch,'')),'') is null
    or study_year is null or study_year not between 1 and 8
    or graduation_year is null or graduation_year not between 2000 and 2200);

-- Grants and policies: authenticated may read public fields; direct writes are absent.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('student_profiles','profiles','profile_private')
  and grantee in ('PUBLIC','anon','authenticated')
order by grantee,privilege_type;

select table_name,column_name,grantee,privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name in ('student_profiles','profiles','profile_private')
  and grantee in ('PUBLIC','anon','authenticated')
order by table_name,column_name,grantee,privilege_type;

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
  and tablename in ('student_profiles','profiles','profile_private')
order by tablename,policyname;

-- Phone is present only in the private table, whose RLS policy must be owner-scoped.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('student_profiles','profile_private');

select tc.constraint_name,tc.constraint_type,kcu.column_name,ccu.table_schema as referenced_schema,
       ccu.table_name as referenced_table,ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_name=tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
where tc.constraint_schema='public' and tc.table_name='student_profiles'
order by tc.constraint_type,tc.constraint_name;

select indexname,indexdef from pg_indexes
where schemaname='public' and tablename='student_profiles'
  and indexname='student_profiles_auth_user_id_uidx';

-- The three reported Auth triggers are not to be supplemented; compare names and enabled state.
select count(*) as user_auth_trigger_count,
       count(*) filter (where t.tgname in ('on_auth_user_created','on_auth_user_created_studos','studos_create_canonical_profile_trigger')) as supplied_trigger_names_found,
       array_agg(t.tgname order by t.tgname) as trigger_names
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and n.nspname='auth' and c.relname='users';

select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) as trigger_definition,
       p.oid::regprocedure as trigger_function,p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and n.nspname='auth' and c.relname='users'
order by t.tgname;

-- Data dependencies must remain unchanged: public.profiles remains a table and FK targets stay intact.
select to_regclass('public.profiles') as compatibility_table,
       to_regclass('public.posts') as posts_table,
       to_regclass('public.study_resources') as study_resources_table;

select tc.table_name,kcu.column_name,ccu.table_name as referenced_table,ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema=tc.constraint_schema and kcu.constraint_name=tc.constraint_name and kcu.table_name=tc.table_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema=tc.constraint_schema and ccu.constraint_name=tc.constraint_name
where tc.constraint_schema='public' and tc.constraint_type='FOREIGN KEY'
  and ((tc.table_name='posts' and kcu.column_name='author_id')
       or (tc.table_name='study_resources' and kcu.column_name='user_id'))
order by tc.table_name,kcu.column_name;

-- SECURITY DEFINER and fixed search_path checks for migration 012 RPCs.
select p.oid::regprocedure as function_name,p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,p.proconfig as function_settings,p.proacl,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('handle_new_user','initialize_student_profile','studos_create_canonical_profile',
  '_create_student_profile_for_auth_user','ensure_student_profile','save_student_profile','sync_compat_profile_to_student_profile')
order by p.proname;

-- Compare this output with the preflight snapshot to confirm chat policies remain unchanged.
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
  and (tablename like '%chat%' or tablename like 'conversation%'
       or tablename in ('messages','room_members','room_messages'))
order by tablename,policyname;
