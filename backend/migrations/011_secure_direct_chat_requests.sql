-- STUDOS consent-based direct messaging.
-- Apply manually only after reviewing backend/diagnostics/chat_migration_011_preflight.sql.
-- This migration does not replace existing SECURITY DEFINER functions, disable RLS,
-- drop chat tables, or delete chat rows. Existing direct-creation RPCs are revoked.
begin;

-- Fail closed if the verified base is incomplete or any migration-owned table already exists.
do $$
begin
  if to_regclass('public.conversations') is null
     or to_regclass('public.conversation_members') is null
     or to_regclass('public.messages') is null
     or to_regclass('public.profiles') is null then
    raise exception 'Migration 011 requires conversations, conversation_members, messages, and profiles';
  end if;
  if to_regclass('public.conversation_requests') is not null
     or to_regclass('public.user_blocks') is not null
     or to_regclass('public.user_chat_settings') is not null then
    raise exception 'A migration 011 table name already exists; inspect it before applying this migration';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.conversations'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.conversation_members'::regclass)
     or not (select relrowsecurity from pg_class where oid='public.messages'::regclass) then
    raise exception 'RLS must remain enabled on all three existing chat tables';
  end if;
  if not exists (
    select 1 from pg_constraint c
    join pg_attribute src on src.attrelid=c.conrelid and src.attnum=c.conkey[1]
    join pg_attribute dst on dst.attrelid=c.confrelid and dst.attnum=c.confkey[1]
    where c.conrelid='public.profiles'::regclass and c.confrelid='auth.users'::regclass
      and c.contype='f' and c.convalidated and cardinality(c.conkey)=1 and cardinality(c.confkey)=1
      and src.attname='id' and dst.attname='id'
  ) then
    raise exception 'profiles.id must reference auth.users.id before creating chat requests';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name in ('id','created_at') group by table_name having count(*)=2)
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='conversation_members' and column_name in ('conversation_id','user_id') group by table_name having count(*)=2)
     or not exists(select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name in ('id','conversation_id','sender_id','created_at') group by table_name having count(*)=4) then
    raise exception 'A required core chat column is missing; inspect the live schema before proceeding';
  end if;
  if to_regprocedure('public.create_direct_conversation(uuid)') is null
     or to_regprocedure('public.start_direct_conversation(uuid)') is null then
    raise exception 'Expected legacy direct-conversation RPC signatures were not found; inspect live functions before proceeding';
  end if;
  if to_regprocedure('public.direct_chat_contact_status(uuid)') is not null
     or to_regprocedure('public.request_direct_conversation(uuid,text)') is not null
     or to_regprocedure('public.respond_to_conversation_request(uuid,text)') is not null
     or to_regprocedure('public.cancel_conversation_request(uuid)') is not null
     or to_regprocedure('public.set_chat_request_preference(boolean)') is not null
     or to_regprocedure('public.block_chat_user(uuid)') is not null then
    raise exception 'A migration 011 RPC name already exists; inspect it rather than replacing it';
  end if;
  if not exists (
    select 1 from pg_policies p where p.schemaname='public' and p.tablename='messages'
      and p.cmd in ('INSERT','ALL') and ('authenticated'=any(p.roles) or 'public'=any(p.roles))
  ) then
    raise exception 'No authenticated-compatible messages INSERT policy exists; inspect live RLS before proceeding';
  end if;
end $$;

-- Add only compatibility columns. Existing conversation, membership, and message rows are retained.
alter table public.conversations
  add column if not exists kind text,
  add column if not exists created_by uuid,
  add column if not exists direct_member_low uuid,
  add column if not exists direct_member_high uuid,
  add column if not exists conversation_type text,
  add column if not exists title text,
  add column if not exists last_message_at timestamptz,
  add column if not exists last_message_preview text;
alter table public.conversation_members
  add column if not exists joined_at timestamptz not null default now();
alter table public.messages
  add column if not exists body text,
  add column if not exists content text;

-- Keep old body-based and content-based message schemas in sync without replacing existing triggers.
update public.messages set content=body where content is null and body is not null;
update public.messages set body=content where body is null and content is not null;
do $$ begin
  if exists(select 1 from public.messages where body is null or content is null) then
    raise exception 'Existing messages have neither body nor content; inspect rows before migration';
  end if;
end $$;
alter table public.messages alter column body set not null;
alter table public.messages alter column content set not null;

-- Backfill previews from the latest existing message without deleting or rewriting message rows.
update public.conversations c set last_message_preview=m.preview,last_message_at=coalesce(c.last_message_at,m.created_at)
from (
  select distinct on (conversation_id) conversation_id,coalesce(content,body) as preview,created_at
  from public.messages order by conversation_id,created_at desc,id desc
) m
where m.conversation_id=c.id;
update public.conversations set kind=coalesce(kind,conversation_type,'direct');
update public.conversations set conversation_type=coalesce(conversation_type,kind,'direct');
do $$ begin
  if exists(
    select 1 from public.conversations c left join public.conversation_members m on m.conversation_id=c.id
    where c.kind='direct' group by c.id having count(m.user_id) not in (0,2)
  ) then raise exception 'A direct conversation does not have exactly two members; inspect memberships before migration'; end if;
end $$;
with direct_pairs as (
  select conversation_id,(array_agg(user_id order by user_id))[1] as low_id,
    (array_agg(user_id order by user_id))[2] as high_id,count(*) as member_count
  from public.conversation_members group by conversation_id
)
update public.conversations c set direct_member_low=p.low_id,direct_member_high=p.high_id
from direct_pairs p where p.conversation_id=c.id and c.kind='direct' and p.member_count=2
  and (c.direct_member_low is null or c.direct_member_high is null);
alter table public.conversations alter column kind set default 'direct';
alter table public.conversations alter column conversation_type set default 'direct';
update public.conversations set last_message_at=created_at where last_message_at is null;
alter table public.conversations alter column last_message_at set default now();

create index if not exists conversations_activity_011_idx on public.conversations(last_message_at desc);
create index if not exists messages_conversation_created_011_idx on public.messages(conversation_id,created_at desc,id desc);
create unique index if not exists conversation_members_pair_011_uidx on public.conversation_members(conversation_id,user_id);
create unique index if not exists conversations_direct_pair_011_uidx
  on public.conversations(direct_member_low,direct_member_high)
  where kind='direct' and direct_member_low is not null and direct_member_high is not null;

-- These names are new in this migration; no pre-existing candidate tables are renamed or shadowed.
create table public.conversation_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  introductory_message text check(introductory_message is null or char_length(btrim(introductory_message))<=1000),
  status text not null default 'pending' check(status in ('pending','accepted','declined','cancelled')),
  conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint conversation_requests_no_self_011 check(requester_id<>recipient_id)
);
create unique index conversation_requests_pair_pending_011_uidx
  on public.conversation_requests(least(requester_id,recipient_id),greatest(requester_id,recipient_id))
  where status='pending';
create index conversation_requests_recipient_011_idx on public.conversation_requests(recipient_id,created_at desc);
create index conversation_requests_requester_011_idx on public.conversation_requests(requester_id,created_at desc);

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id,blocked_id),
  constraint user_blocks_no_self_011 check(blocker_id<>blocked_id)
);
create index user_blocks_reverse_lookup_011_idx on public.user_blocks(blocked_id,blocker_id);

create table public.user_chat_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allow_requests boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.conversation_requests enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_chat_settings enable row level security;
revoke all on public.conversation_requests,public.user_blocks,public.user_chat_settings from public,anon,authenticated;
grant select on public.conversation_requests,public.user_chat_settings to authenticated;
create policy conversation_requests_participant_read_011 on public.conversation_requests
  for select to authenticated using(requester_id=auth.uid() or recipient_id=auth.uid());
create policy user_chat_settings_self_read_011 on public.user_chat_settings
  for select to authenticated using(user_id=auth.uid());
create policy user_blocks_blocker_read_011 on public.user_blocks
  for select to authenticated using(blocker_id=auth.uid());

-- New, narrowly-scoped SECURITY DEFINER predicate avoids depending on unknown legacy helper bodies.
create function public.is_chat_conversation_member_011(target_conversation uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,auth
as $$
  select exists(select 1 from public.conversation_members m
    where m.conversation_id=target_conversation and m.user_id=auth.uid());
$$;
revoke all on function public.is_chat_conversation_member_011(uuid) from public,anon;
grant execute on function public.is_chat_conversation_member_011(uuid) to authenticated;

create function public.can_send_chat_message_011(target_conversation uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ declare caller uuid:=auth.uid(); peer uuid; pair_key text; begin
  if caller is null or not exists(select 1 from public.conversation_members m
    where m.conversation_id=target_conversation and m.user_id=caller) then return false; end if;
  select m.user_id into peer from public.conversation_members m join public.conversations c on c.id=m.conversation_id
    where m.conversation_id=target_conversation and m.user_id<>caller and coalesce(c.kind,c.conversation_type,'direct')='direct' limit 1;
  if peer is null then return true; end if;
  pair_key:=least(caller::text,peer::text)||':'||greatest(caller::text,peer::text);
  perform pg_advisory_xact_lock(hashtextextended(pair_key,0));
  return not exists(select 1 from public.user_blocks b where
    (b.blocker_id=caller and b.blocked_id=peer) or (b.blocker_id=peer and b.blocked_id=caller));
end $$;
revoke all on function public.can_send_chat_message_011(uuid) from public,anon;
grant execute on function public.can_send_chat_message_011(uuid) to authenticated;

-- Restrictive read policies AND with current policies without replacing their definitions.
create policy conversations_member_guard_011 on public.conversations as restrictive
  for select to authenticated using(public.is_chat_conversation_member_011(id));
create policy conversation_members_member_guard_011 on public.conversation_members as restrictive
  for select to authenticated using(public.is_chat_conversation_member_011(conversation_id));
create policy messages_member_guard_011 on public.messages as restrictive
  for select to authenticated using(public.is_chat_conversation_member_011(conversation_id));

-- Restrictive policy ANDs with the existing permissive INSERT policy. It does not replace
-- the verified live policy and cannot grant access by itself.
create policy messages_insert_consent_guard_011 on public.messages as restrictive
  for insert to authenticated
  with check(sender_id=auth.uid() and public.can_send_chat_message_011(conversation_id));

-- Restore least privilege while granting exactly the INSERT columns used by the client.
revoke all on public.conversations,public.conversation_members,public.messages from public,anon,authenticated;
-- Remove any old column-level grants too, including grants on schema-specific extra columns.
do $$ declare rel regclass; cols text; begin
  foreach rel in array array['public.conversations'::regclass,
                             'public.conversation_members'::regclass,
                             'public.messages'::regclass] loop
    select string_agg(format('%I',a.attname),',') into cols
    from pg_attribute a where a.attrelid=rel and a.attnum>0 and not a.attisdropped;
    execute format('revoke all privileges (%s) on table %s from public,anon,authenticated',cols,rel);
  end loop;
end $$;
grant select on public.conversations,public.conversation_members,public.messages to authenticated;
grant insert(conversation_id,sender_id,content) on public.messages to authenticated;

create function public.sync_chat_message_columns_011()
returns trigger language plpgsql set search_path=pg_catalog,public
as $$ begin
  if new.content is null then new.content:=new.body; end if;
  if new.body is null then new.body:=new.content; end if;
  if new.content is null or char_length(btrim(new.content))=0 then raise exception 'Message body is required'; end if;
  return new;
end $$;
revoke all on function public.sync_chat_message_columns_011() from public,anon,authenticated;
create trigger sync_chat_message_columns_011_trigger before insert or update of body,content on public.messages
  for each row execute function public.sync_chat_message_columns_011();

-- Separate preview maintenance; do not replace an existing touch_conversation_from_message function.
create function public.refresh_conversation_preview_011()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin
  update public.conversations set last_message_at=new.created_at,last_message_preview=coalesce(new.content,new.body)
  where id=new.conversation_id;
  return new;
end $$;
revoke all on function public.refresh_conversation_preview_011() from public,anon,authenticated;
create trigger refresh_conversation_preview_011_trigger after insert on public.messages
  for each row execute function public.refresh_conversation_preview_011();

-- Close both verified consent-free RPCs without dropping or replacing their definitions.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_direct_conversation','start_direct_conversation')
  loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); end loop;
  if has_function_privilege('authenticated','public.create_direct_conversation(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.start_direct_conversation(uuid)','EXECUTE') then
    raise exception 'Legacy direct-conversation RPC remains executable by authenticated';
  end if;
end $$;

create function public.direct_chat_contact_status(target_user_id uuid)
returns text language plpgsql stable security definer set search_path=pg_catalog,public,auth
as $$ declare caller uuid:=auth.uid(); begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if target_user_id is null or target_user_id=caller
     or not exists(select 1 from auth.users u where u.id=target_user_id)
     or not exists(select 1 from public.profiles p where p.id=target_user_id) then return 'unavailable'; end if;
  if exists(select 1 from public.user_blocks b where
    (b.blocker_id=caller and b.blocked_id=target_user_id) or (b.blocker_id=target_user_id and b.blocked_id=caller)) then return 'unavailable'; end if;
  if exists(select 1 from public.user_chat_settings s where s.user_id=target_user_id and not s.allow_requests) then return 'unavailable'; end if;
  if exists(select 1 from public.conversations c where c.kind='direct'
    and c.direct_member_low=least(caller,target_user_id) and c.direct_member_high=greatest(caller,target_user_id)) then return 'conversation'; end if;
  if exists(select 1 from public.conversation_requests r where r.status='pending'
    and least(r.requester_id,r.recipient_id)=least(caller,target_user_id)
    and greatest(r.requester_id,r.recipient_id)=greatest(caller,target_user_id)) then return 'pending'; end if;
  return 'available';
end $$;

create function public.request_direct_conversation(target_user_id uuid,request_message text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ declare caller uuid:=auth.uid(); request_id uuid; recent_count integer; begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if target_user_id is null or target_user_id=caller then raise exception 'Choose another student'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
  perform pg_advisory_xact_lock(hashtextextended(least(caller::text,target_user_id::text)||':'||greatest(caller::text,target_user_id::text),0));
  if not exists(select 1 from auth.users u where u.id=caller)
     or not exists(select 1 from auth.users u where u.id=target_user_id)
     or not exists(select 1 from public.profiles p where p.id=caller)
     or not exists(select 1 from public.profiles p where p.id=target_user_id) then raise exception 'A real Auth-backed student profile is required'; end if;
  if exists(select 1 from public.user_blocks b where
    (b.blocker_id=caller and b.blocked_id=target_user_id) or (b.blocker_id=target_user_id and b.blocked_id=caller)) then raise exception 'Contact is unavailable'; end if;
  if exists(select 1 from public.user_chat_settings s where s.user_id=target_user_id and not s.allow_requests) then raise exception 'This student is not accepting requests'; end if;
  if exists(select 1 from public.conversations c where c.kind='direct'
    and c.direct_member_low=least(caller,target_user_id) and c.direct_member_high=greatest(caller,target_user_id)) then raise exception 'A conversation already exists'; end if;
  if exists(select 1 from public.conversation_requests r where r.status='pending'
    and least(r.requester_id,r.recipient_id)=least(caller,target_user_id)
    and greatest(r.requester_id,r.recipient_id)=greatest(caller,target_user_id)) then raise exception 'A request is already pending'; end if;
  if char_length(btrim(coalesce(request_message,'')))>1000 then raise exception 'Introductory message is too long'; end if;
  select count(*) into recent_count from public.conversation_requests r
    where r.requester_id=caller and r.created_at>now()-interval '24 hours';
  if recent_count>=10 then raise exception 'Request limit reached. Try again later'; end if;
  insert into public.conversation_requests(requester_id,recipient_id,introductory_message)
    values(caller,target_user_id,nullif(btrim(request_message),'')) returning id into request_id;
  return request_id;
end $$;

create function public.respond_to_conversation_request(request_id uuid,decision text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ declare caller uuid:=auth.uid(); r public.conversation_requests%rowtype; conv uuid; low_id uuid; high_id uuid; begin
  if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if decision is null or decision not in ('accepted','declined') then raise exception 'Invalid response'; end if;
  select * into r from public.conversation_requests where id=request_id;
  if not found or r.recipient_id<>caller or r.status<>'pending' then raise exception 'Request unavailable' using errcode='42501'; end if;
  low_id:=least(r.requester_id,r.recipient_id); high_id:=greatest(r.requester_id,r.recipient_id);
  perform pg_advisory_xact_lock(hashtextextended(low_id::text||':'||high_id::text,0));
  select * into r from public.conversation_requests where id=request_id for update;
  if not found or r.recipient_id<>caller or r.status<>'pending' then raise exception 'Request unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.user_blocks b where
    (b.blocker_id=r.requester_id and b.blocked_id=r.recipient_id) or (b.blocker_id=r.recipient_id and b.blocked_id=r.requester_id)) then raise exception 'Contact is unavailable'; end if;
  if decision='declined' then
    update public.conversation_requests set status='declined',responded_at=now() where id=r.id;
    return null;
  end if;
  insert into public.conversations(id,kind,conversation_type,title,created_by,direct_member_low,direct_member_high,created_at,last_message_at)
    values(gen_random_uuid(),'direct','direct',null,r.requester_id,low_id,high_id,now(),now())
    on conflict(direct_member_low,direct_member_high) where kind='direct' and direct_member_low is not null and direct_member_high is not null do nothing;
  select c.id into conv from public.conversations c where c.kind='direct'
    and c.direct_member_low=low_id and c.direct_member_high=high_id for update;
  if conv is null then raise exception 'Could not create the authorized conversation'; end if;
  insert into public.conversation_members(conversation_id,user_id,joined_at)
    values(conv,r.requester_id,now()),(conv,r.recipient_id,now()) on conflict do nothing;
  update public.conversation_requests set status='accepted',responded_at=now(),conversation_id=conv where id=r.id;
  return conv;
end $$;

create function public.cancel_conversation_request(request_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  update public.conversation_requests set status='cancelled',responded_at=now()
    where id=request_id and requester_id=auth.uid() and status='pending';
  if not found then raise exception 'Pending request unavailable'; end if;
end $$;

create function public.set_chat_request_preference(enabled boolean)
returns void language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  insert into public.user_chat_settings(user_id,allow_requests) values(auth.uid(),enabled)
    on conflict(user_id) do update set allow_requests=excluded.allow_requests,updated_at=now();
end $$;

create function public.block_chat_user(target_user_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,auth
as $$ begin
  if auth.uid() is null or target_user_id is null or target_user_id=auth.uid() then raise exception 'Invalid block'; end if;
  if not exists(select 1 from auth.users u where u.id=target_user_id) then raise exception 'Student not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(auth.uid()::text,target_user_id::text)||':'||greatest(auth.uid()::text,target_user_id::text),0));
  insert into public.user_blocks(blocker_id,blocked_id) values(auth.uid(),target_user_id) on conflict do nothing;
  update public.conversation_requests set status='declined',responded_at=now() where status='pending'
    and least(requester_id,recipient_id)=least(auth.uid(),target_user_id)
    and greatest(requester_id,recipient_id)=greatest(auth.uid(),target_user_id);
end $$;

revoke all on function public.direct_chat_contact_status(uuid),
  public.request_direct_conversation(uuid,text),public.respond_to_conversation_request(uuid,text),
  public.cancel_conversation_request(uuid),public.set_chat_request_preference(boolean),public.block_chat_user(uuid)
  from public,anon,authenticated;
grant execute on function public.direct_chat_contact_status(uuid),
  public.request_direct_conversation(uuid,text),public.respond_to_conversation_request(uuid,text),
  public.cancel_conversation_request(uuid),public.set_chat_request_preference(boolean),public.block_chat_user(uuid)
  to authenticated;

notify pgrst,'reload schema';
commit;
