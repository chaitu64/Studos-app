-- Restore only missing team/topic-chat relations expected by migration 002.
-- Adds only missing tables and conflict-ignored built-in room rows; no existing rows are updated or deleted.
-- Review backend/diagnostics/team_chat_schema_readonly.sql before applying.
begin;

do $$
declare
  v_kind "char";
begin
  if to_regclass('public.teams') is null
     or to_regclass('auth.users') is null then
    raise exception 'Migration 020 requires public.teams and auth.users; inspect the live schema first';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teams'
      and column_name='id' and udt_name='uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='teams'
      and column_name='owner_id' and udt_name='uuid'
  ) then
    raise exception 'Migration 020 requires UUID teams.id and teams.owner_id columns';
  end if;

  select relkind into v_kind from pg_class where oid=to_regclass('public.teams');
  if v_kind not in ('r', 'p') then
    raise exception 'public.teams is not a table; refusing to modify a schema collision';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='auth' and table_name='users'
      and column_name='id' and udt_name='uuid'
  ) then
    raise exception 'Migration 020 requires UUID auth.users.id';
  end if;

  if exists (
    select 1
    from (values
      ('team_members'), ('team_applications'), ('chat_rooms'),
      ('chat_room_members'), ('chat_room_messages')
    ) as expected(name)
    join pg_class c on c.oid=to_regclass('public.' || expected.name)
    where c.relkind not in ('r', 'p')
  ) then
    raise exception 'A team/chat relation name is occupied by a non-table object; inspect before proceeding';
  end if;
end
$$;

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.team_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  requested_role text,
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (team_id, applicant_id)
);

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

insert into public.chat_rooms (slug, title, description) values
  ('general', 'General', 'Meet students and share questions from across the community.'),
  ('hackathons', 'Hackathons', 'Find teammates, mentors, and event updates.'),
  ('projects', 'Projects & Research', 'Discuss projects, research ideas, and technical feedback.')
on conflict (slug) do nothing;

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (room_id, user_id)
);

create table if not exists public.chat_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(trim(content)) between 1 and 10000),
  created_at timestamptz not null default now()
);

do $$
declare
  v_expected record;
  v_kind "char";
begin
  for v_expected in
    select * from (values
      ('team_members', 'team_id', 'uuid'),
      ('team_members', 'user_id', 'uuid'),
      ('team_members', 'role', 'text'),
      ('team_members', 'created_at', 'timestamptz'),
      ('team_applications', 'id', 'uuid'),
      ('team_applications', 'team_id', 'uuid'),
      ('team_applications', 'applicant_id', 'uuid'),
      ('team_applications', 'requested_role', 'text'),
      ('team_applications', 'message', 'text'),
      ('team_applications', 'status', 'text'),
      ('team_applications', 'created_at', 'timestamptz'),
      ('chat_rooms', 'id', 'uuid'),
      ('chat_rooms', 'slug', 'text'),
      ('chat_rooms', 'title', 'text'),
      ('chat_rooms', 'description', 'text'),
      ('chat_rooms', 'created_at', 'timestamptz'),
      ('chat_room_members', 'room_id', 'uuid'),
      ('chat_room_members', 'user_id', 'uuid'),
      ('chat_room_messages', 'id', 'uuid'),
      ('chat_room_messages', 'room_id', 'uuid'),
      ('chat_room_messages', 'user_id', 'uuid'),
      ('chat_room_messages', 'content', 'text'),
      ('chat_room_messages', 'created_at', 'timestamptz')
    ) as columns_to_check(table_name, column_name, udt_name)
  loop
    if not exists (
      select 1 from information_schema.columns c
      where c.table_schema='public'
        and c.table_name=v_expected.table_name
        and c.column_name=v_expected.column_name
        and c.udt_name=v_expected.udt_name
    ) then
      raise exception 'Migration 020 found an incompatible or incomplete public.%.% column',
        v_expected.table_name, v_expected.column_name;
    end if;
  end loop;

  for v_expected in
    select * from (values
      ('team_members', 'PRIMARY KEY (team_id, user_id)'),
      ('team_applications', 'PRIMARY KEY (id)'),
      ('chat_rooms', 'PRIMARY KEY (id)'),
      ('chat_room_members', 'PRIMARY KEY (room_id, user_id)'),
      ('chat_room_messages', 'PRIMARY KEY (id)')
    ) as tables_to_check(table_name, primary_key)
  loop
    select relkind into v_kind
    from pg_class where oid=to_regclass('public.' || v_expected.table_name);
    if v_kind not in ('r', 'p') then
      raise exception 'Migration 020 expected public.% to be a table',
        v_expected.table_name;
    end if;
    if not exists (
      select 1 from pg_constraint c
      where c.conrelid=to_regclass('public.' || v_expected.table_name)
        and c.contype='p'
        and pg_get_constraintdef(c.oid, true)=v_expected.primary_key
    ) then
      raise exception 'Migration 020 found an incompatible primary key on public.%',
        v_expected.table_name;
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.team_applications'::regclass
      and c.contype='u'
      and pg_get_constraintdef(c.oid, true)='UNIQUE (team_id, applicant_id)'
  ) then
    raise exception 'Migration 020 requires unique team/applicant applications';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.chat_rooms'::regclass
      and c.contype='u'
      and pg_get_constraintdef(c.oid, true)='UNIQUE (slug)'
  ) then
    raise exception 'Migration 020 requires unique chat room slugs';
  end if;

  for v_expected in
    select * from (values
      ('team_members', 'team_id', 'public.teams'),
      ('team_members', 'user_id', 'auth.users'),
      ('team_applications', 'team_id', 'public.teams'),
      ('team_applications', 'applicant_id', 'auth.users'),
      ('chat_room_members', 'room_id', 'public.chat_rooms'),
      ('chat_room_members', 'user_id', 'auth.users'),
      ('chat_room_messages', 'room_id', 'public.chat_rooms'),
      ('chat_room_messages', 'user_id', 'auth.users')
    ) as foreign_keys(table_name, column_name, referenced_relation)
  loop
    if not exists (
      select 1
      from pg_constraint c
      where c.conrelid=to_regclass('public.' || v_expected.table_name)
        and c.contype='f'
        and c.conkey=array[(
          select a.attnum
          from pg_attribute a
          where a.attrelid=c.conrelid and a.attname=v_expected.column_name
            and not a.attisdropped
        )]::smallint[]
        and c.confrelid=to_regclass(v_expected.referenced_relation)
        and c.confdeltype='c'
    ) then
      raise exception 'Migration 020 found a missing or incompatible foreign key: public.%.%',
        v_expected.table_name, v_expected.column_name;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies p
    where p.schemaname='public'
      and p.tablename in (
        'team_members', 'team_applications', 'chat_rooms',
        'chat_room_members', 'chat_room_messages'
      )
      and not exists (
        select 1
        from (values
          ('team_members', 'team_members_read'),
          ('team_members', 'team_members_owner_write'),
          ('team_applications', 'team_applications_read'),
          ('team_applications', 'team_applications_self_insert'),
          ('team_applications', 'team_applications_owner_update'),
          ('chat_rooms', 'chat_rooms_read'),
          ('chat_room_members', 'room_members_read'),
          ('chat_room_members', 'room_members_self_join'),
          ('chat_room_messages', 'room_messages_member_read'),
          ('chat_room_messages', 'room_messages_member_insert')
        ) as expected(table_name, policy_name)
        where expected.table_name=p.tablename and expected.policy_name=p.policyname
      )
  ) then
    raise exception 'Migration 020 found custom team/chat policies; inspect them before applying';
  end if;
end
$$;

alter table public.team_members enable row level security;
alter table public.team_applications enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_room_messages enable row level security;

revoke all on public.team_members, public.team_applications, public.chat_rooms,
  public.chat_room_members, public.chat_room_messages from public, anon, authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update(status) on public.team_applications to authenticated;
grant select on public.chat_rooms, public.chat_room_members, public.chat_room_messages to authenticated;
grant insert on public.chat_room_members, public.chat_room_messages to authenticated;

drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members for select to authenticated using (true);
drop policy if exists team_members_owner_write on public.team_members;
create policy team_members_owner_write on public.team_members for all to authenticated
  using (exists (select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()))
  with check (exists (select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists team_applications_read on public.team_applications;
create policy team_applications_read on public.team_applications for select to authenticated
  using (applicant_id=auth.uid() or exists (select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists team_applications_self_insert on public.team_applications;
create policy team_applications_self_insert on public.team_applications for insert to authenticated
  with check (applicant_id=auth.uid());
drop policy if exists team_applications_owner_update on public.team_applications;
create policy team_applications_owner_update on public.team_applications for update to authenticated
  using (exists (select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()))
  with check (exists (select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists chat_rooms_read on public.chat_rooms;
create policy chat_rooms_read on public.chat_rooms for select to authenticated using (true);
drop policy if exists room_members_read on public.chat_room_members;
create policy room_members_read on public.chat_room_members for select to authenticated using (user_id=auth.uid());
drop policy if exists room_members_self_join on public.chat_room_members;
create policy room_members_self_join on public.chat_room_members for insert to authenticated
  with check (user_id=auth.uid());
drop policy if exists room_messages_member_read on public.chat_room_messages;
create policy room_messages_member_read on public.chat_room_messages for select to authenticated
  using (exists (select 1 from public.chat_room_members m where m.room_id=chat_room_messages.room_id and m.user_id=auth.uid()));
drop policy if exists room_messages_member_insert on public.chat_room_messages;
create policy room_messages_member_insert on public.chat_room_messages for insert to authenticated
  with check (user_id=auth.uid() and exists (select 1 from public.chat_room_members m where m.room_id=chat_room_messages.room_id and m.user_id=auth.uid()));

commit;
