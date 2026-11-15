-- Read-only diagnostics for "Database error saving new user" and the OAuth
-- profile callback. Run in Supabase SQL Editor; this script reads metadata and
-- counts only. It does not create, update, or delete anything.

-- 1) Confirm canonical relations and the private profile relation are present.
select relation_name, to_regclass('public.' || relation_name) as relation
from (values ('profiles'), ('student_profiles'), ('profile_private'), ('posts'), ('study_resources')) as expected(relation_name)
order by relation_name;

-- 2) Verify the fields queried by profileService and required by signup RPCs.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'profile_private')
order by table_name, ordinal_position;

-- 3) List every non-internal trigger on auth.users, its enabled state, and its
-- complete function definition. Check for old relation names and duplicate
-- profile writers; do not infer trigger state from migration filenames.
select t.tgname as trigger_name,
       t.tgenabled as enabled_state,
       pg_get_triggerdef(t.oid, true) as trigger_definition,
       p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,
       p.proconfig as function_settings,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class r on r.oid = t.tgrelid
join pg_namespace n on n.oid = r.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal and n.nspname = 'auth' and r.relname = 'users'
order by t.tgname;

-- 4) Find public functions that still contain any retired relation reference.
-- Function names such as ensure_student_profile are intentionally not matches.
select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       p.prosrc as function_source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and p.prosrc ~* '(^|[^a-z_])student_(profiles|ideas|problems|help_requests|services)([^a-z_]|$)'
order by p.proname, p.oid::regprocedure::text;

-- 5) Inspect the profile creation/repair RPCs, trigger functions, fixed search
-- paths, and execute grants. The signup trigger should write one row to
-- public.profiles with auth_user_id = auth.users.id after migration 016.
select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       pg_get_userbyid(p.proowner) as function_owner,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'handle_new_user', 'initialize_student_profile', 'studos_create_canonical_profile',
    '_create_student_profile_for_auth_user', 'ensure_student_profile',
    'save_student_profile'
  )
order by p.proname, p.oid::regprocedure::text;

-- 6) Profile mapping invariant: each Auth user should have exactly one
-- canonical row. Return counts only, not user identifiers or personal fields.
select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.profiles) as canonical_profiles,
       (select count(*) from public.profiles where auth_user_id is not null) as auth_linked_profiles,
       (select count(distinct auth_user_id) from public.profiles where auth_user_id is not null) as unique_auth_links,
       (select count(*) from auth.users u left join public.profiles p on p.auth_user_id = u.id where p.id is null) as auth_users_without_profile,
       (select count(*) from (select auth_user_id from public.profiles where auth_user_id is not null group by auth_user_id having count(*) > 1) d) as duplicate_auth_links;

-- 7) Confirm Auth UUID relationship, uniqueness, RLS, grants and policies.
select tc.constraint_name, tc.constraint_type, kcu.column_name,
       ccu.table_schema as referenced_schema, ccu.table_name as referenced_table,
       ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name and kcu.table_name = tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.constraint_schema = 'public' and tc.table_name in ('profiles', 'profile_private')
  and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
order by tc.constraint_type, tc.constraint_name;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'profiles'
  and indexdef ilike '%auth_user_id%'
order by indexname;

select c.relname as relation_name, c.relrowsecurity as rls_enabled,
       has_table_privilege('anon', c.oid, 'INSERT') as anon_can_insert,
       has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_can_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_can_update
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('profiles', 'profile_private')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'profile_private')
order by tablename, policyname;

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('profiles', 'profile_private')
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by table_name, grantee, privilege_type;

select table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name in ('profiles', 'profile_private')
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by table_name, column_name, grantee, privilege_type;

-- 8) Inspect avatar/post storage bucket visibility and storage.objects policies.
-- No bucket, object, or policy is changed by this query.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'studos-media';

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 9) Show migration versions only when the migration history relation exists.
do $$
declare v_versions text;
begin
  if to_regclass('supabase_migrations.schema_migrations') is null then
    raise notice 'Supabase migration history is not visible; compare live schema and function definitions directly.';
  else
    execute $query$
      select string_agg(version::text, ', ' order by version)
      from supabase_migrations.schema_migrations
      where version::text in ('012', '013', '014', '015', '016', '017', '018', '019', '020', '021', '022')
         or version::text ~ '^(012|013|014|015|016|017|018|019|020|021|022)'
    $query$ into v_versions;
    raise notice 'Recorded migration versions 012-017: %', coalesce(v_versions, '(none found)');
  end if;
end $$;
