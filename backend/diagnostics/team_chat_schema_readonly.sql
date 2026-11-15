-- Read-only catalog diagnostics for team and topic-chat relations.
-- Run in the Supabase SQL Editor. Returns schema metadata and aggregate counts
-- only; it does not expose message bodies or alter database objects.

with expected(name) as (
  values
    ('teams'), ('team_members'), ('team_applications'),
    ('messages'), ('chat_rooms'), ('chat_room_members'), ('chat_room_messages')
)
select n.nspname as schema_name, c.relname as relation_name, c.relkind,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
       pg_get_userbyid(c.relowner) as relation_owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join expected e on e.name = c.relname
order by c.relname, n.nspname;

with expected(name) as (
  values
    ('teams'), ('team_members'), ('team_applications'),
    ('messages'), ('chat_rooms'), ('chat_room_members'), ('chat_room_messages')
)
select c.table_schema, c.table_name, c.column_name, c.data_type, c.udt_name,
       c.is_nullable, c.column_default
from information_schema.columns c
left join expected e on e.name = c.table_name
where (c.table_schema = 'public' and e.name is not null)
   or (c.table_schema = 'auth' and c.table_name = 'users' and c.column_name = 'id')
order by c.table_schema, c.table_name, c.ordinal_position;

with expected(name) as (
  values
    ('teams'), ('team_members'), ('team_applications'),
    ('messages'), ('chat_rooms'), ('chat_room_members'), ('chat_room_messages')
)
select n.nspname as schema_name, r.relname as relation_name,
       con.conname as constraint_name, con.contype as constraint_type,
       pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con
join pg_class r on r.oid = con.conrelid
join pg_namespace n on n.oid = r.relnamespace
join expected e on e.name = r.relname
where n.nspname in ('public', 'auth')
order by n.nspname, r.relname, con.contype, con.conname;

with expected(name) as (
  values
    ('teams'), ('team_members'), ('team_applications'),
    ('messages'), ('chat_rooms'), ('chat_room_members'), ('chat_room_messages')
)
select p.schemaname, p.tablename, p.policyname, p.permissive, p.roles,
       p.cmd, p.qual, p.with_check
from pg_policies p
join expected e on e.name = p.tablename
where p.schemaname = 'public'
order by p.tablename, p.cmd, p.policyname;

with expected(name) as (
  values
    ('teams'), ('team_members'), ('team_applications'),
    ('messages'), ('chat_rooms'), ('chat_room_members'), ('chat_room_messages')
)
select g.table_schema, g.table_name, g.grantee, g.privilege_type
from information_schema.role_table_grants g
join expected e on e.name = g.table_name
where g.table_schema = 'public'
  and g.grantee in ('PUBLIC', 'anon', 'authenticated')
order by g.table_name, g.grantee, g.privilege_type;

select current_setting('pgrst.db_schemas', true) as pgrst_db_schemas_setting;

select s.setdatabase, s.setrole, s.setconfig
from pg_db_role_setting s
where array_to_string(s.setconfig, ',') ilike '%pgrst.db_schemas%'
order by s.setdatabase, s.setrole;

select pub.pubname, pt.schemaname, pt.tablename
from pg_publication pub
left join pg_publication_tables pt on pt.pubname = pub.pubname
where pub.pubname = 'supabase_realtime'
  and (pt.tablename is null or pt.tablename in ('messages', 'chat_room_messages'))
order by pt.tablename;

select p.oid::regprocedure as function_name, p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('respond_to_team_application', 'respond_to_team_application_020',
                    'respond_to_team_application_021')
order by p.proname, p.oid::regprocedure::text;

-- This count is aggregate-only and is run by the SQL Editor role, not anon.
select count(*) as study_resources_total
from public.study_resources;
