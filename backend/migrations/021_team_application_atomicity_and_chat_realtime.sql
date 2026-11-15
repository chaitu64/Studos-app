-- Atomic team-application decisions and Realtime publication for existing chat tables.
-- Apply only after migration 020 and after reviewing the live schema on disposable staging.
begin;

do $$
begin
  if to_regclass('public.teams') is null
     or to_regclass('public.team_applications') is null
     or to_regclass('public.team_members') is null
     or to_regclass('public.messages') is null
     or to_regclass('public.chat_rooms') is null
     or to_regclass('public.chat_room_members') is null
     or to_regclass('public.chat_room_messages') is null then
    raise exception 'Migration 021 requires teams, team_applications, team_members, messages, chat_rooms, chat_room_members, and chat_room_messages';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teams' and column_name in ('id','owner_id')
    group by table_name having count(*)=2
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='team_applications'
      and column_name in ('team_id','applicant_id','requested_role','status')
    group by table_name having count(*)=4
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='team_members'
      and column_name in ('team_id','user_id','role')
    group by table_name having count(*)=3
  ) then
    raise exception 'Migration 021 team table columns differ from the expected schema; inspect before proceeding';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='messages' and column_name='conversation_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_rooms' and column_name in ('id','slug','title','description')
    group by table_name having count(*)=4
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_room_members' and column_name in ('room_id','user_id')
    group by table_name having count(*)=2
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='chat_room_messages' and column_name='room_id'
  ) then
    raise exception 'Migration 021 chat table columns differ from the expected schema; inspect before proceeding';
  end if;
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    raise exception 'Supabase Realtime publication is missing; inspect the project configuration before proceeding';
  end if;
end $$;

create or replace function public.respond_to_team_application_021(
  target_team_id uuid,
  target_applicant_id uuid,
  decision text,
  member_role text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  current_status text;
  requested_role text;
  assigned_role text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if decision is null or decision not in ('accepted','declined') then
    raise exception 'Invalid team application decision' using errcode='22023';
  end if;
  if target_applicant_id = caller_id then
    raise exception 'A team lead cannot respond to their own application' using errcode='42501';
  end if;

  select application.status, application.requested_role
    into current_status, requested_role
    from public.team_applications as application
    join public.teams as team on team.id=application.team_id
    where application.team_id=target_team_id
      and application.applicant_id=target_applicant_id
      and team.owner_id=caller_id
    for update of application, team;

  if not found then
    raise exception 'Team application not found or caller is not the team lead' using errcode='42501';
  end if;
  if current_status=decision then
    return;
  end if;
  if current_status <> 'pending' then
    raise exception 'Only pending team applications can be changed' using errcode='55000';
  end if;

  if decision='accepted' then
    assigned_role := coalesce(nullif(btrim(member_role),''), nullif(btrim(requested_role),''), 'Member');
    if char_length(assigned_role) > 80 then
      raise exception 'Team member role must be 80 characters or fewer' using errcode='22023';
    end if;
    insert into public.team_members(team_id,user_id,role)
      values(target_team_id,target_applicant_id,assigned_role)
      on conflict(team_id,user_id) do nothing;
  end if;

  update public.team_applications
    set status=decision
    where team_id=target_team_id and applicant_id=target_applicant_id and status='pending';
end
$$;

revoke all on function public.respond_to_team_application_021(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.respond_to_team_application_021(uuid,uuid,text,text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='chat_room_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_room_messages';
  end if;
end $$;

commit;
