-- Add group conversations to the existing private messaging tables and persist
-- authenticated-user bookmarks for migrated student ideas.
-- Apply only after verifying migrations 001/002 and the student_ideas table.

alter table public.conversations
  add column if not exists conversation_type text not null default 'direct',
  add column if not exists team_id uuid references public.teams(id) on delete cascade,
  add column if not exists title text;
alter table public.conversations alter column conversation_type set default 'direct';
update public.conversations set conversation_type = 'direct' where conversation_type is null;
alter table public.conversations alter column conversation_type set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and conname = 'conversations_type_check'
  ) then
    alter table public.conversations
      add constraint conversations_type_check
      check (conversation_type in ('direct', 'group')) not valid;
  end if;
end $$;

create unique index if not exists conversations_team_id_unique
  on public.conversations(team_id) where team_id is not null;

create or replace function public.open_team_conversation(target_team_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_id uuid := auth.uid();
  conversation_id uuid;
  team_title text;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  select t.title into team_title from public.teams t where t.id = target_team_id;
  if team_title is null then raise exception 'Team not found'; end if;
  if not exists (
    select 1 from public.teams t where t.id = target_team_id and t.owner_id = caller_id
    union all
    select 1 from public.team_members tm where tm.team_id = target_team_id and tm.user_id = caller_id
  ) then raise exception 'Only accepted team members can open this conversation'; end if;

  insert into public.conversations(conversation_type, team_id, title)
  values ('group', target_team_id, team_title)
  on conflict (team_id) where team_id is not null do update set title = excluded.title
  returning id into conversation_id;

  -- Membership is sourced only from the team owner and accepted team_members.
  insert into public.conversation_members(conversation_id, user_id)
  select conversation_id, t.owner_id from public.teams t where t.id = target_team_id
  union
  select conversation_id, tm.user_id from public.team_members tm where tm.team_id = target_team_id
  on conflict do nothing;

  return conversation_id;
end;
$$;
revoke all on function public.open_team_conversation(uuid) from public, anon;
grant execute on function public.open_team_conversation(uuid) to authenticated;

create or replace function public.is_conversation_member(target_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = target_conversation and m.user_id = auth.uid()
  );
$$;
revoke all on function public.is_conversation_member(uuid) from public, anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
drop policy if exists conversations_members_read on public.conversations;
create policy conversations_members_read on public.conversations
  for select to authenticated using (public.is_conversation_member(id));
drop policy if exists conversation_members_self_read on public.conversation_members;
create policy conversation_members_self_read on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists messages_members_read on public.messages;
create policy messages_members_read on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
drop policy if exists messages_sender_insert on public.messages;
create policy messages_sender_insert on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id));
grant select on public.conversations, public.conversation_members, public.messages to authenticated;
grant insert on public.messages to authenticated;

create table if not exists public.student_idea_live_saves (
  idea_id uuid not null references public.student_ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
alter table public.student_idea_live_saves enable row level security;
drop policy if exists student_idea_live_saves_select_own on public.student_idea_live_saves;
create policy student_idea_live_saves_select_own on public.student_idea_live_saves
  for select to authenticated using (user_id = auth.uid());
drop policy if exists student_idea_live_saves_insert_own on public.student_idea_live_saves;
create policy student_idea_live_saves_insert_own on public.student_idea_live_saves
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists student_idea_live_saves_delete_own on public.student_idea_live_saves;
create policy student_idea_live_saves_delete_own on public.student_idea_live_saves
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.student_idea_live_saves to authenticated;

create or replace function public.toggle_student_idea_save(target_idea_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  inserted_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if target_idea_id is null then raise exception 'Idea id is required'; end if;

  insert into public.student_idea_live_saves(idea_id, user_id)
  values (target_idea_id, current_user_id)
  on conflict (idea_id, user_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 1 then return true; end if;

  delete from public.student_idea_live_saves
  where idea_id = target_idea_id and user_id = current_user_id;
  return false;
end;
$$;
revoke all on function public.toggle_student_idea_save(uuid) from public, anon;
grant execute on function public.toggle_student_idea_save(uuid) to authenticated;
