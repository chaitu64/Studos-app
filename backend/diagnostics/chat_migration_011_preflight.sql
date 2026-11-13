-- Run before migration 011. Review function bodies and policy expressions before deployment.
-- Metadata and aggregate counts only; no message bodies or private profile fields are returned.

select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in (
  'conversations','conversation_members','messages','profiles',
  'conversation_requests','chat_blocks','user_blocks','user_chat_preferences','user_chat_settings'
)
order by table_name,ordinal_position;

select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
  'conversations','conversation_members','messages','conversation_requests','chat_blocks','user_blocks','user_chat_preferences','user_chat_settings'
)
order by c.relname;

-- The four live-verified functions plus any SECURITY DEFINER routine that touches chat relations.
select n.nspname as schema_name,p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and (
  p.proname in ('create_direct_conversation','start_direct_conversation','is_conversation_member','studos_chat_member_check')
  or (p.prosecdef and (pg_get_functiondef(p.oid) ilike '%conversation_members%'
    or pg_get_functiondef(p.oid) ilike '%public.conversations%'
    or pg_get_functiondef(p.oid) ilike '%public.messages%'))
)
order by p.proname,pg_get_function_identity_arguments(p.oid);

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
  and tablename in ('conversations','conversation_members','messages')
order by tablename,cmd,policyname;

select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in ('conversations','conversation_members','messages')
  and grantee in ('anon','authenticated','public')
order by table_name,grantee,privilege_type;

select table_name,column_name,grantee,privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name='messages'
  and grantee in ('anon','authenticated','public')
order by grantee,column_name,privilege_type;

select 'conversations' as table_name,count(*) as row_count from public.conversations
union all select 'conversation_members',count(*) from public.conversation_members
union all select 'messages',count(*) from public.messages;

select conname,conrelid::regclass as table_name,confrelid::regclass as referenced_table,pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.profiles'::regclass,'public.conversations'::regclass,'public.conversation_members'::regclass)
order by table_name::text,conname;

select to_regclass('public.conversation_requests') as conversation_requests,
       to_regclass('public.user_blocks') as user_blocks,
       to_regclass('public.user_chat_settings') as user_chat_settings,
       to_regclass('public.chat_blocks') as chat_blocks_candidate,
       to_regclass('public.user_chat_preferences') as user_chat_preferences_candidate;

-- Migration 011 is based only on the existing chat tables and Auth-backed profiles;
-- this query shows whether optional 009 group prerequisites exist without making them required.
select to_regclass('public.teams') as teams,to_regclass('public.team_members') as team_members,
       to_regprocedure('public.open_team_conversation(uuid)') as open_team_conversation,
       exists(select 1 from information_schema.columns where table_schema='public'
         and table_name='conversations' and column_name='team_id') as conversations_has_team_id;
