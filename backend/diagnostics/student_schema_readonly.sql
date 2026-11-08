-- Read-only schema diagnostics for the consolidated STUDOS Supabase schema.
-- Run in the Supabase SQL editor as a schema-inspection role. This script
-- returns metadata and aggregate counts only; it does not alter any objects.

with target(table_name) as (
  values
    ('student_services'), ('student_ideas'), ('student_ideas_feed'),
    ('student_profiles'), ('student_idea_actors'), ('student_idea_sparks'),
    ('student_idea_comments'), ('student_idea_requests'),
    ('student_idea_live_sparks'), ('student_idea_live_comments'),
    ('student_idea_live_requests'), ('student_idea_live_collaborators'),
    ('study_resources'), ('notifications')
)
select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default
from information_schema.columns c
join target t on t.table_name = c.table_name
where c.table_schema = 'public'
order by c.table_name, c.ordinal_position;

with target(table_name) as (
  values
    ('student_services'), ('student_ideas'), ('student_ideas_feed'),
    ('student_profiles'), ('student_idea_actors'), ('student_idea_sparks'),
    ('student_idea_comments'), ('student_idea_requests'),
    ('student_idea_live_sparks'), ('student_idea_live_comments'),
    ('student_idea_live_requests'), ('student_idea_live_collaborators'),
    ('study_resources'), ('notifications')
)
select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_schema as foreign_table_schema,
       ccu.table_name as foreign_table_name, ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
join target t on t.table_name = tc.table_name
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
 and kcu.table_name = tc.table_name
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
order by tc.table_name, tc.constraint_type, tc.constraint_name;

with target(table_name) as (
  values
    ('student_services'), ('student_ideas'), ('student_ideas_feed'),
    ('student_profiles'), ('student_idea_actors'), ('student_idea_sparks'),
    ('student_idea_comments'), ('student_idea_requests'),
    ('student_idea_live_sparks'), ('student_idea_live_comments'),
    ('student_idea_live_requests'), ('student_idea_live_collaborators'),
    ('study_resources'), ('notifications')
)
select c.relname as relation_name, c.relkind, c.relrowsecurity as rls_enabled,
       pg_get_viewdef(c.oid, true) as view_definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join target t on t.table_name = c.relname
where n.nspname = 'public'
order by c.relname;

with target(table_name) as (
  values
    ('student_services'), ('student_ideas'), ('student_ideas_feed'),
    ('student_profiles'), ('student_idea_actors'), ('student_idea_sparks'),
    ('student_idea_comments'), ('student_idea_requests'),
    ('student_idea_live_sparks'), ('student_idea_live_comments'),
    ('student_idea_live_requests'), ('student_idea_live_collaborators'),
    ('study_resources'), ('notifications')
)
select p.schemaname, p.tablename, p.policyname, p.permissive, p.roles,
       p.cmd, p.qual, p.with_check
from pg_policies p
join target t on t.table_name = p.tablename
where p.schemaname = 'public'
order by p.tablename, p.policyname;

with target(table_name) as (
  values
    ('student_services'), ('student_ideas'), ('student_ideas_feed'),
    ('student_profiles'), ('student_idea_actors'), ('student_idea_sparks'),
    ('student_idea_comments'), ('student_idea_requests'),
    ('student_idea_live_sparks'), ('student_idea_live_comments'),
    ('student_idea_live_requests'), ('student_idea_live_collaborators'),
    ('study_resources'), ('notifications')
)
select table_schema, table_name, grantee, privilege_type
from information_schema.role_table_grants g
join target t using (table_name)
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Aggregate data presence. A Supabase SQL editor role may see more rows than
-- anon/authenticated; compare with PostgREST behavior when reviewing RLS.
select 'student_services' as table_name, count(*) as row_count from public.student_services
union all select 'student_ideas', count(*) from public.student_ideas
union all select 'student_profiles', count(*) from public.student_profiles
union all select 'student_idea_actors', count(*) from public.student_idea_actors
union all select 'student_idea_sparks', count(*) from public.student_idea_sparks
union all select 'student_idea_comments', count(*) from public.student_idea_comments
union all select 'student_idea_requests', count(*) from public.student_idea_requests
union all select 'student_idea_live_sparks', count(*) from public.student_idea_live_sparks
union all select 'student_idea_live_comments', count(*) from public.student_idea_live_comments
union all select 'student_idea_live_requests', count(*) from public.student_idea_live_requests
union all select 'student_idea_live_collaborators', count(*) from public.student_idea_live_collaborators
union all select 'study_resources', count(*) from public.study_resources;
