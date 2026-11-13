-- Run after migration 011 commits. Any exception is a failed verification.

do $$ begin
  if not (select relrowsecurity from pg_class where oid='public.conversations'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.conversation_members'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.messages'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.conversation_requests'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.user_blocks'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.user_chat_settings'::regclass) then
    raise exception 'RLS is disabled on a chat relation';
  end if;
  if has_function_privilege('authenticated','public.create_direct_conversation(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.start_direct_conversation(uuid)','EXECUTE') then
    raise exception 'Authenticated can still execute a consent-free direct-conversation RPC';
  end if;
  if has_function_privilege('anon','public.create_direct_conversation(uuid)','EXECUTE')
     or has_function_privilege('anon','public.start_direct_conversation(uuid)','EXECUTE') then
    raise exception 'Anonymous can still execute a consent-free direct-conversation RPC';
  end if;
  if not has_function_privilege('authenticated','public.request_direct_conversation(uuid,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.respond_to_conversation_request(uuid,text)','EXECUTE')
     or not has_function_privilege('authenticated','public.cancel_conversation_request(uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.block_chat_user(uuid)','EXECUTE') then
    raise exception 'A required authenticated chat-request RPC is unavailable';
  end if;
  if has_function_privilege('anon','public.request_direct_conversation(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.respond_to_conversation_request(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.block_chat_user(uuid)','EXECUTE') then
    raise exception 'Anonymous can execute a private chat RPC';
  end if;
  if not has_column_privilege('authenticated','public.messages','conversation_id','INSERT')
     or not has_column_privilege('authenticated','public.messages','sender_id','INSERT')
     or not has_column_privilege('authenticated','public.messages','content','INSERT') then
    raise exception 'Authenticated message INSERT column grants are incomplete';
  end if;
  if has_table_privilege('anon','public.messages','INSERT') then raise exception 'Anonymous can insert messages'; end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='messages'
      and policyname='messages_insert_consent_guard_011' and permissive='RESTRICTIVE' and cmd='INSERT') then
    raise exception 'Restrictive chat member/block INSERT guard is missing';
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='messages'
      and policyname='messages_member_guard_011' and permissive='RESTRICTIVE' and cmd='SELECT') then
    raise exception 'Restrictive chat member SELECT guard is missing';
  end if;
end $$;

-- Review all policies and effective grants, including legacy policies retained by the migration.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
  and tablename in ('conversations','conversation_members','messages','conversation_requests','user_blocks','user_chat_settings')
order by tablename,cmd,policyname;

select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public' and table_name in
  ('conversations','conversation_members','messages','conversation_requests','user_blocks','user_chat_settings')
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;

select has_column_privilege('authenticated','public.messages','conversation_id','INSERT') as can_insert_conversation_id,
       has_column_privilege('authenticated','public.messages','sender_id','INSERT') as can_insert_sender_id,
       has_column_privilege('authenticated','public.messages','content','INSERT') as can_insert_content,
       has_table_privilege('authenticated','public.messages','INSERT') as has_table_wide_insert;

select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and p.proname in (
  'create_direct_conversation','start_direct_conversation','is_conversation_member','studos_chat_member_check',
  'is_chat_conversation_member_011','can_send_chat_message_011','direct_chat_contact_status',
  'request_direct_conversation','respond_to_conversation_request','cancel_conversation_request',
  'set_chat_request_preference','block_chat_user','refresh_conversation_preview_011'
)
order by p.proname,pg_get_function_identity_arguments(p.oid);

select (select count(*) from public.conversations) as conversations,
       (select count(*) from public.conversation_members) as memberships,
       (select count(*) from public.messages) as messages,
       (select count(*) from public.conversation_requests) as requests;

select count(*) as duplicate_pending_pairs
from (
  select least(requester_id,recipient_id),greatest(requester_id,recipient_id)
  from public.conversation_requests where status='pending'
  group by 1,2 having count(*)>1
) duplicates;

select count(*) as direct_conversations_with_wrong_member_count
from (
  select c.id,count(m.user_id) as member_count
  from public.conversations c left join public.conversation_members m on m.conversation_id=c.id
  where c.kind='direct' group by c.id having count(m.user_id)<>2
) invalid_directs;
