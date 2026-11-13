-- Stage 0: safe, read-only inventory before deciding whether migrations 012/013 are needed.
-- Contains no PII or private field values. Run this before any migration script.
select to_regclass('auth.users') as auth_users,
       to_regclass('public.profiles') as legacy_profiles,
       to_regclass('public.student_profiles') as canonical_profiles,
       to_regclass('public.profile_private') as private_profiles,
       to_regclass('public.posts') as posts,
       to_regclass('public.study_resources') as study_resources,
       to_regclass('supabase_migrations.schema_migrations') as migration_history_table;

select table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public'
  and table_name in ('profiles','student_profiles','profile_private','posts','study_resources')
order by table_name,ordinal_position;

select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.profiles) as legacy_profiles,
       (select count(*) from public.student_profiles) as all_student_profiles,
       (select count(*) from public.posts) as posts,
       (select count(*) from public.study_resources) as study_resources;

-- Mapping and demo aggregates are emitted as NOTICE only when the column exists.
do $$
declare v_linked bigint; v_distinct bigint; v_missing bigint; v_demo bigint;
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='student_profiles' and column_name='auth_user_id') then
    execute 'select count(*),count(distinct auth_user_id),count(*) filter (where auth_user_id is null) from public.student_profiles' into v_linked,v_distinct,v_demo;
    execute 'select count(*) from auth.users u left join public.student_profiles s on s.auth_user_id=u.id where s.id is null' into v_missing;
    raise notice 'student_profile_mapping linked_rows=%, distinct_auth_ids=%, auth_users_missing=%, null_auth_user_demo_rows=%',v_linked,v_distinct,v_missing,v_demo;
  else
    raise notice 'student_profiles.auth_user_id is absent; migration 012 schema is not present';
  end if;
end $$;

-- If migration_history_table above is non-NULL, run:
-- select version,name from supabase_migrations.schema_migrations
-- where version like '012%' or version like '013%' order by version;

select t.tgname,t.tgenabled,pg_get_triggerdef(t.oid,true) as trigger_definition,
       p.oid::regprocedure as function_name,p.prosecdef as security_definer,
       p.proconfig as function_settings,pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and n.nspname='auth' and c.relname='users' order by t.tgname;

select c.conrelid::regclass as source_relation,c.conname,pg_get_constraintdef(c.oid,true) as definition,c.convalidated
from pg_constraint c where c.contype='f' and c.confrelid='public.profiles'::regclass order by 1,2;

select n.nspname as schema_name,p.proname as function_name,pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef,p.proconfig,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname ilike '%profile%' or p.proname ilike '%chat%' or p.proname ilike '%contact%'
   or p.prosrc ~* '(^|[^a-z_])profiles([^a-z_]|$)' order by 1,2;

select n.nspname as schema_name,c.relname as view_name,c.relkind,pg_get_viewdef(c.oid,true) as definition
from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class c on c.oid=r.ev_class join pg_namespace n on n.oid=c.relnamespace
where d.refobjid='public.profiles'::regclass order by 1,2;

select schemaname,tablename,policyname,cmd,qual,with_check
from pg_policies where schemaname='public' and (tablename='profiles'
  or coalesce(qual,'') ilike '%public.profiles%' or coalesce(with_check,'') ilike '%public.profiles%')
order by tablename,policyname;
