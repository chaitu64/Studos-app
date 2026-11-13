-- Run in the Supabase SQL Editor before and after migration 011.
-- Read-only metadata only; no message bodies, emails, phone numbers, or DOB values.

select c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
from information_schema.columns c
where c.table_schema='public' and c.table_name in
  ('conversations','conversation_members','messages','conversation_requests','user_chat_settings','user_blocks')
order by c.table_name,c.ordinal_position;

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and p.proname in
  ('start_direct_conversation','create_direct_conversation','open_team_conversation',
   'is_conversation_member','studos_chat_member_check','is_chat_conversation_member_011',
   'can_send_chat_message_011','request_direct_conversation',
   'direct_chat_contact_status','respond_to_conversation_request','cancel_conversation_request',
   'set_chat_request_preference','block_chat_user','notify_message_participants','touch_conversation_from_message')
order by p.proname,pg_get_function_identity_arguments(p.oid);

select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where schemaname='public' and tablename in
  ('conversations','conversation_members','messages','conversation_requests','user_chat_settings','user_blocks')
order by tablename,policyname;

select c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('conversations','conversation_members','messages','conversation_requests','user_chat_settings','user_blocks')
order by c.relname;

select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in
  ('conversations','conversation_members','messages','conversation_requests','user_chat_settings','user_blocks')
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

select indexname,indexdef
from pg_indexes
where schemaname='public' and tablename in ('conversations','messages','conversation_requests','user_blocks')
order by tablename,indexname;
