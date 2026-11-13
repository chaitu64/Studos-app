-- Additive community publishing support. Existing rows, student profiles,
-- Study Hub tables, approved Explore feeds, and chat tables are untouched.
begin;

alter table public.posts
  add column if not exists links text[] not null default '{}',
  add column if not exists attachments text[] not null default '{}',
  add column if not exists metadata jsonb not null default '{}';

-- Seeded ideas keep their profile author. New ideas are owned by Auth UUID.
alter table public.ideas
  alter column demo_author_id drop not null,
  add column if not exists author_id uuid references auth.users(id) on delete cascade,
  add column if not exists problem_statement text not null default '',
  add column if not exists proposed_solution text not null default '',
  add column if not exists target_audience text not null default '',
  add column if not exists roles_needed text[] not null default '{}',
  add column if not exists links text[] not null default '{}';
alter table public.ideas drop constraint if exists ideas_author_kind;
alter table public.ideas add constraint ideas_author_kind check (
  (author_id is not null and demo_author_id is null)
  or (author_id is null and demo_author_id is not null)
);
create index if not exists ideas_author_created_idx on public.ideas(author_id, created_at desc) where author_id is not null;

alter table public.problems
  add column if not exists context text not null default '',
  add column if not exists expected_solution text not null default '',
  add column if not exists attachments text[] not null default '{}';
alter table public.help_requests
  add column if not exists attachments text[] not null default '{}';

-- Official Explore opportunities remain in approved integrations. These
-- restrictive policies also deny direct REST inserts/updates for official
-- listing types while allowing ordinary event discussion posts.
drop policy if exists posts_no_official_opportunity_publish on public.posts;
create policy posts_no_official_opportunity_publish on public.posts
  as restrictive for insert to authenticated
  with check (lower(post_type) not in ('opportunity','hackathon','internship','job','scholarship','competition'));
drop policy if exists posts_no_official_opportunity_update on public.posts;
create policy posts_no_official_opportunity_update on public.posts
  as restrictive for update to authenticated
  using (lower(post_type) not in ('opportunity','hackathon','internship','job','scholarship','competition'))
  with check (lower(post_type) not in ('opportunity','hackathon','internship','job','scholarship','competition'));

-- The live ideas table currently has read policies only; add Auth-owned writes.
alter table public.ideas enable row level security;
drop policy if exists ideas_auth_insert_own on public.ideas;
create policy ideas_auth_insert_own on public.ideas for insert to authenticated
  with check (author_id = (select auth.uid()) and demo_author_id is null);
drop policy if exists ideas_auth_update_own on public.ideas;
create policy ideas_auth_update_own on public.ideas for update to authenticated
  using (author_id = (select auth.uid()) and demo_author_id is null)
  with check (author_id = (select auth.uid()) and demo_author_id is null);
drop policy if exists ideas_auth_delete_own on public.ideas;
create policy ideas_auth_delete_own on public.ideas for delete to authenticated
  using (author_id = (select auth.uid()) and demo_author_id is null);
grant select, insert, update, delete on public.ideas to authenticated;
revoke insert, update, delete on public.ideas from anon;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 5 and 180),
  description text not null default '' check (char_length(description) <= 6000),
  external_url text check (external_url is null or (external_url ~ '^https://' and length(external_url) <= 2048)),
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null check (char_length(btrim(option_text)) between 1 and 240),
  position smallint not null check (position between 0 and 7),
  unique (poll_id, id),
  unique (poll_id, position)
);

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id),
  foreign key (poll_id, option_id) references public.poll_options(poll_id, id) on delete cascade
);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
drop policy if exists polls_read_authenticated on public.polls;
create policy polls_read_authenticated on public.polls for select to authenticated using (true);
drop policy if exists polls_owner_update on public.polls;
create policy polls_owner_update on public.polls for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
drop policy if exists polls_owner_delete on public.polls;
create policy polls_owner_delete on public.polls for delete to authenticated using (author_id = (select auth.uid()));
drop policy if exists poll_options_read_authenticated on public.poll_options;
create policy poll_options_read_authenticated on public.poll_options for select to authenticated using (true);
drop policy if exists poll_options_owner_update on public.poll_options;
create policy poll_options_owner_update on public.poll_options for update to authenticated
  using (exists (select 1 from public.polls p where p.id = poll_id and p.author_id = (select auth.uid())))
  with check (exists (select 1 from public.polls p where p.id = poll_id and p.author_id = (select auth.uid())));
drop policy if exists poll_options_owner_delete on public.poll_options;
create policy poll_options_owner_delete on public.poll_options for delete to authenticated
  using (exists (select 1 from public.polls p where p.id = poll_id and p.author_id = (select auth.uid())));
drop policy if exists poll_votes_read_authenticated on public.poll_votes;
create policy poll_votes_read_authenticated on public.poll_votes for select to authenticated using (true);
drop policy if exists poll_votes_insert_self_open on public.poll_votes;
create policy poll_votes_insert_self_open on public.poll_votes for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.polls p where p.id = poll_id and (p.closes_at is null or p.closes_at > now()))
);

revoke all on public.polls, public.poll_options, public.poll_votes from anon, authenticated;
grant select on public.polls, public.poll_options to authenticated;
grant update, delete on public.polls to authenticated;
grant update, delete on public.poll_options to authenticated;
grant insert on public.poll_votes to authenticated;

create or replace function public.create_community_poll(
  poll_title text,
  poll_description text,
  option_values text[],
  poll_external_url text default null,
  poll_closes_at timestamptz default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  created_id uuid;
  option_value text;
  option_position integer := 0;
  normalized_options text[];
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(poll_title,''))) not between 5 and 180 then raise exception 'Poll title must be 5 to 180 characters' using errcode = '22023'; end if;
  if char_length(coalesce(poll_description,'')) > 6000 then raise exception 'Poll description is too long' using errcode = '22023'; end if;
  if poll_closes_at is not null and poll_closes_at <= now() then raise exception 'Poll close time must be in the future' using errcode = '22023'; end if;
  if poll_external_url is not null and (poll_external_url !~ '^https://' or length(poll_external_url) > 2048) then raise exception 'Survey links must use HTTPS' using errcode = '22023'; end if;
  select array_agg(btrim(item.value)) into normalized_options
  from unnest(coalesce(option_values, '{}')) as item(value) where btrim(item.value) <> '';
  if poll_external_url is null and coalesce(cardinality(normalized_options),0) not between 2 and 8 then
    raise exception 'Native polls require 2 to 8 options' using errcode = '22023';
  end if;
  if poll_external_url is null and (select count(distinct lower(item.value)) from unnest(normalized_options) as item(value)) <> cardinality(normalized_options) then
    raise exception 'Poll options must be unique' using errcode = '22023';
  end if;
  insert into public.polls(author_id,title,description,external_url,closes_at)
    values(caller,btrim(poll_title),btrim(coalesce(poll_description,'')),nullif(btrim(poll_external_url),''),poll_closes_at)
    returning id into created_id;
  foreach option_value in array coalesce(normalized_options,'{}') loop
    insert into public.poll_options(poll_id,option_text,position)
      values(created_id,option_value,option_position);
    option_position := option_position + 1;
  end loop;
  return created_id;
end;
$$;
revoke all on function public.create_community_poll(text,text,text[],text,timestamptz) from public, anon;
grant execute on function public.create_community_poll(text,text,text[],text,timestamptz) to authenticated;

create or replace function public.get_community_poll(target_poll_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  result jsonb;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'id', p.id, 'author_id', p.author_id, 'title', p.title,
    'description', p.description, 'external_url', p.external_url,
    'closes_at', p.closes_at, 'created_at', p.created_at,
    'closed', p.closes_at is not null and p.closes_at <= now(),
    'has_voted', exists(select 1 from public.poll_votes v where v.poll_id=p.id and v.user_id=caller),
    'options', coalesce(jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text,'votes',coalesce(vote_counts.total,0)) order by o.position) filter (where o.id is not null),'[]'::jsonb)
  ) into result
  from public.polls p
  left join public.poll_options o on o.poll_id=p.id
  left join lateral (select count(*)::integer as total from public.poll_votes v where v.poll_id=p.id and v.option_id=o.id) vote_counts on true
  where p.id=target_poll_id
  group by p.id;
  if result is null then raise exception 'Poll not found' using errcode = 'P0002'; end if;
  return result;
end;
$$;
revoke all on function public.get_community_poll(uuid) from public, anon;
grant execute on function public.get_community_poll(uuid) to authenticated;

-- Add constrained storage limits while retaining the existing private bucket
-- and owner-folder policies. PDF and image media stay in the community feed.
update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
where id = 'studos-media';

commit;
