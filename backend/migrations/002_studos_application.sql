-- Incremental STUDOS application schema. Never run 001_studos_social.sql.
-- This migration reuses existing profiles, profile_private and posts tables.
begin;

create extension if not exists pgcrypto;

-- Public student fields only. Private account data lives in profile_private.
alter table public.profiles add column if not exists first_name text not null default '';
alter table public.profiles add column if not exists middle_name text;
alter table public.profiles add column if not exists last_name text not null default '';
alter table public.profiles add column if not exists college text;
alter table public.profiles add column if not exists branch text;
alter table public.profiles add column if not exists degree text;
alter table public.profiles add column if not exists study_year smallint;
alter table public.profiles add column if not exists graduation_year smallint;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] not null default '{}';
alter table public.profiles add column if not exists interests text[] not null default '{}';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
-- Prevent legacy columns such as DOB/email (if present) from being selected
-- through the public profiles API. Only these student-controlled fields are public.
revoke all on public.profiles from anon, authenticated;
grant select (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,created_at,updated_at) on public.profiles to authenticated;
grant insert (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url) on public.profiles to authenticated;
grant update (first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,updated_at) on public.profiles to authenticated;

create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  college_email text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts add column if not exists title text;
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.posts add column if not exists image_urls text[] not null default '{}';
alter table public.posts add column if not exists updated_at timestamptz not null default now();
alter table public.posts add column if not exists user_id uuid references auth.users(id) on delete cascade;
do $$ begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='posts' and column_name='author_id') then
    execute 'update public.posts set user_id=author_id where user_id is null';
  end if;
end $$;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(length(trim(content)) between 1 and 3000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.saved_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,post_id)
);
create table if not exists public.post_collaborations (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade,
 requester_id uuid not null references auth.users(id) on delete cascade, requested_role text, note text not null default '',
 status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(post_id,requester_id)
);

create table if not exists public.study_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 200),
  category text not null check(category in ('notes','previous_paper','important_questions','lab_manual','study_guide')),
  college text, university text, degree text, branch text, study_year smallint, semester text,
  subject text not null, subject_code text, academic_year text, regulation text, unit_module text,
  description text, language text not null default 'English', drive_url text not null,
  drive_file_id text not null, rights_confirmed_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(drive_file_id)
);
alter table public.study_resources add column if not exists search_document tsvector generated always as (to_tsvector('english',coalesce(title,'')||' '||coalesce(subject,'')||' '||coalesce(description,''))) stored;
create index if not exists study_resources_search_idx on public.study_resources using gin(search_document);
create index if not exists study_resources_facets_idx on public.study_resources(college,branch,study_year,semester,subject);
create table if not exists public.saved_resources (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.study_resources(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,resource_id)
);
create table if not exists public.resource_reports (
  id uuid primary key default gen_random_uuid(), resource_id uuid not null references public.study_resources(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check(reason in ('broken_link','rights','inaccurate','other')),
  details text, status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(), unique(resource_id,reporter_id)
);

-- User-generated content for existing Idea, Team, Project, discovery and chat UI.
create table if not exists public.ideas (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null, payload jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null, payload jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null, payload jsonb not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.idea_votes (
 idea_id uuid not null references public.ideas(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(idea_id,user_id)
);
create table if not exists public.idea_comments (
 id uuid primary key default gen_random_uuid(), idea_id uuid not null references public.ideas(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(length(trim(content)) between 1 and 3000), created_at timestamptz not null default now()
);
create table if not exists public.saved_ideas (
 idea_id uuid not null references public.ideas(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(idea_id,user_id)
);
create table if not exists public.team_members (
 team_id uuid not null references public.teams(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member', created_at timestamptz not null default now(), primary key(team_id,user_id)
);
create table if not exists public.team_applications (
 id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
 applicant_id uuid not null references auth.users(id) on delete cascade, requested_role text, message text not null default '',
 status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(), unique(team_id,applicant_id)
);
create table if not exists public.project_likes (
 project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(project_id,user_id)
);
create table if not exists public.saved_projects (
 project_id uuid not null references public.projects(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(project_id,user_id)
);
create table if not exists public.saved_opportunities (
 user_id uuid not null references auth.users(id) on delete cascade,
 opportunity_id text not null check(length(trim(opportunity_id)) between 1 and 250),
 created_at timestamptz not null default now(), primary key(user_id,opportunity_id)
);
-- Only trusted server code may award contribution points; client roles receive SELECT only.
create table if not exists public.contribution_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null, points integer not null default 0 check(points between 0 and 10000), metadata jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table if not exists public.leaderboard (
 user_id uuid primary key references auth.users(id) on delete cascade, points bigint not null default 0,
 rank integer, updated_at timestamptz not null default now()
);
create table if not exists public.conversations (
 id uuid primary key default gen_random_uuid(), direct_key text unique, created_at timestamptz not null default now(), last_message_at timestamptz not null default now()
);
alter table public.conversations add column if not exists direct_key text;
create unique index if not exists conversations_direct_key_idx on public.conversations(direct_key) where direct_key is not null;
create table if not exists public.conversation_members (
 conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(conversation_id,user_id)
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(length(trim(content)) between 1 and 10000), created_at timestamptz not null default now()
);
create table if not exists public.chat_rooms (
 id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.chat_room_members (
 room_id uuid not null references public.chat_rooms(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
 primary key(room_id,user_id)
);
create table if not exists public.chat_room_messages (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.chat_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, content text not null check(length(trim(content)) between 1 and 10000), created_at timestamptz not null default now()
);
insert into public.chat_rooms(slug,title,description) values
 ('general','General','Meet students and share questions from across the community.'),
 ('hackathons','Hackathons','Find teammates, mentors, and event updates.'),
 ('projects','Projects & Research','Discuss projects, research ideas, and technical feedback.')
on conflict(slug) do nothing;
create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, title text not null, body text not null default '', read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
 target_type text not null, target_id uuid not null, reason text not null, details text,
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')), created_at timestamptz not null default now()
);

create index if not exists posts_feed_idx on public.posts(created_at desc);
create index if not exists posts_search_idx on public.posts using gin(to_tsvector('english',coalesce(title,'')||' '||coalesce(content,'')));
create index if not exists post_comments_feed_idx on public.post_comments(post_id,created_at);
create index if not exists post_collaborations_owner_idx on public.post_collaborations(post_id,status,created_at desc);
create index if not exists messages_feed_idx on public.messages(conversation_id,created_at);
create index if not exists room_messages_feed_idx on public.chat_room_messages(room_id,created_at);
create index if not exists notifications_user_feed_idx on public.notifications(user_id,created_at desc);
create index if not exists ideas_feed_idx on public.ideas(created_at desc);
create index if not exists teams_feed_idx on public.teams(created_at desc);
create index if not exists projects_feed_idx on public.projects(created_at desc);
create index if not exists ideas_owner_feed_idx on public.ideas(user_id,created_at desc);
create index if not exists teams_owner_feed_idx on public.teams(owner_id,created_at desc);
create index if not exists projects_owner_feed_idx on public.projects(owner_id,created_at desc);
create index if not exists ideas_payload_search_idx on public.ideas using gin(payload);
create index if not exists teams_payload_search_idx on public.teams using gin(payload);
create index if not exists projects_payload_search_idx on public.projects using gin(payload);
create index if not exists profiles_discovery_idx on public.profiles(college,branch);
create index if not exists profiles_skills_search_idx on public.profiles using gin(skills);
create index if not exists idea_comments_feed_idx on public.idea_comments(idea_id,created_at desc);
create index if not exists resource_reports_status_idx on public.resource_reports(status,created_at desc);

create or replace function public.notify_team_application() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare target_owner uuid;
begin
 select owner_id into target_owner from public.teams where id=new.team_id;
 if target_owner is not null and target_owner<>new.applicant_id then
  insert into public.notifications(user_id,kind,title,body) values(target_owner,'team_application','New team application','A student applied to join your team.');
 end if;
 return new;
end $$;
revoke all on function public.notify_team_application() from public,anon,authenticated;
drop trigger if exists on_team_application_created_studos on public.team_applications;
create trigger on_team_application_created_studos after insert on public.team_applications for each row execute function public.notify_team_application();

create or replace function public.notify_post_collaboration() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare target_owner uuid;
begin
 select author_id into target_owner from public.posts where id=new.post_id;
 if target_owner is not null and target_owner<>new.requester_id then
  insert into public.notifications(user_id,kind,title,body) values(target_owner,'idea_collab','Collaboration request','A student requested to collaborate on your post.');
 end if;
 return new;
end $$;
revoke all on function public.notify_post_collaboration() from public,anon,authenticated;
drop trigger if exists on_post_collaboration_created_studos on public.post_collaborations;
create trigger on_post_collaboration_created_studos after insert on public.post_collaborations for each row execute function public.notify_post_collaboration();

create or replace function public.notify_message_participants() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 insert into public.notifications(user_id,kind,title,body)
 select m.user_id,'message','New message','You received a new message.' from public.conversation_members m
 where m.conversation_id=new.conversation_id and m.user_id<>new.sender_id;
 return new;
end $$;
revoke all on function public.notify_message_participants() from public,anon,authenticated;
drop trigger if exists on_message_created_studos on public.messages;
create trigger on_message_created_studos after insert on public.messages for each row execute function public.notify_message_participants();

create or replace function public.is_conversation_member(target_conversation uuid) returns boolean
language sql stable security definer set search_path=public,auth as $$
 select exists(select 1 from public.conversation_members m where m.conversation_id=target_conversation and m.user_id=auth.uid())
$$;
revoke all on function public.is_conversation_member(uuid) from public,anon;
grant execute on function public.is_conversation_member(uuid) to authenticated;

create or replace function public.create_direct_conversation(other_user_id uuid) returns uuid
language plpgsql security definer set search_path=public,auth as $$
declare current_user_id uuid := auth.uid(); created_conversation_id uuid; pair_key text;
begin
 if current_user_id is null then raise exception 'Authentication required'; end if;
 if other_user_id is null or other_user_id=current_user_id then raise exception 'Choose another student'; end if;
 if not exists(select 1 from public.profiles p where p.id=other_user_id) then raise exception 'Student not found'; end if;
 pair_key := least(current_user_id::text,other_user_id::text)||':'||greatest(current_user_id::text,other_user_id::text);
 insert into public.conversations(direct_key) values(pair_key) on conflict(direct_key) do update set direct_key=excluded.direct_key returning id into created_conversation_id;
 insert into public.conversation_members(conversation_id,user_id) values(created_conversation_id,current_user_id),(created_conversation_id,other_user_id) on conflict do nothing;
 return created_conversation_id;
end $$;
revoke all on function public.create_direct_conversation(uuid) from public,anon;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

create or replace function public.touch_conversation_from_message() returns trigger
language plpgsql security definer set search_path=public,auth as $$
begin update public.conversations set last_message_at=new.created_at where id=new.conversation_id; return new; end $$;
revoke all on function public.touch_conversation_from_message() from public,anon,authenticated;
drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages for each row execute function public.touch_conversation_from_message();

create or replace function public.initialize_student_profile() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 insert into public.profiles(id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year)
 values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),nullif(new.raw_user_meta_data->>'middle_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'college',''),nullif(new.raw_user_meta_data->>'branch',''),nullif(new.raw_user_meta_data->>'degree',''),nullif(new.raw_user_meta_data->>'study_year','')::smallint,nullif(new.raw_user_meta_data->>'graduation_year','')::smallint)
 on conflict(id) do nothing;
 insert into public.profile_private(id,college_email) values(new.id,new.email) on conflict(id) do update set college_email=excluded.college_email;
 return new;
end $$;
revoke all on function public.initialize_student_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_studos on auth.users;
create trigger on_auth_user_created_studos after insert on auth.users for each row execute function public.initialize_student_profile();
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
   revoke all on function public.rls_auto_enable() from public, anon, authenticated;
 end if;
end $$;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.saved_posts enable row level security;
alter table public.post_collaborations enable row level security;
alter table public.study_resources enable row level security;
alter table public.saved_resources enable row level security;
alter table public.resource_reports enable row level security;
alter table public.ideas enable row level security;
alter table public.teams enable row level security;
alter table public.projects enable row level security;
alter table public.idea_votes enable row level security;
alter table public.idea_comments enable row level security;
alter table public.saved_ideas enable row level security;
alter table public.team_members enable row level security;
alter table public.team_applications enable row level security;
alter table public.project_likes enable row level security;
alter table public.saved_projects enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.contribution_events enable row level security;
alter table public.leaderboard enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_room_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to authenticated using (true);
drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles for insert to authenticated with check(id=auth.uid());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists profile_private_self on public.profile_private;
create policy profile_private_self on public.profile_private for all to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists posts_authenticated_read on public.posts;
create policy posts_authenticated_read on public.posts for select to authenticated using(true);
drop policy if exists posts_owner_insert on public.posts;
create policy posts_owner_insert on public.posts for insert to authenticated with check(author_id=auth.uid() and user_id=auth.uid());
drop policy if exists posts_owner_update on public.posts;
create policy posts_owner_update on public.posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid() and user_id=auth.uid());
drop policy if exists posts_owner_delete on public.posts;
create policy posts_owner_delete on public.posts for delete to authenticated using(author_id=auth.uid());

drop policy if exists post_likes_read on public.post_likes;
create policy post_likes_read on public.post_likes for select to authenticated using(true);
drop policy if exists post_likes_self_write on public.post_likes;
create policy post_likes_self_write on public.post_likes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists post_comments_read on public.post_comments;
create policy post_comments_read on public.post_comments for select to authenticated using(true);
drop policy if exists post_comments_self_write on public.post_comments;
create policy post_comments_self_write on public.post_comments for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists saved_posts_self on public.saved_posts;
create policy saved_posts_self on public.saved_posts for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists post_collaborations_read on public.post_collaborations;
create policy post_collaborations_read on public.post_collaborations for select to authenticated using(requester_id=auth.uid() or exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));
drop policy if exists post_collaborations_self_insert on public.post_collaborations;
create policy post_collaborations_self_insert on public.post_collaborations for insert to authenticated with check(requester_id=auth.uid());
drop policy if exists post_collaborations_owner_update on public.post_collaborations;
create policy post_collaborations_owner_update on public.post_collaborations for update to authenticated using(exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid())) with check(exists(select 1 from public.posts p where p.id=post_id and p.author_id=auth.uid()));

drop policy if exists resources_read on public.study_resources;
create policy resources_read on public.study_resources for select to authenticated using(true);
drop policy if exists resources_owner_write on public.study_resources;
create policy resources_owner_write on public.study_resources for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists saved_resources_self on public.saved_resources;
create policy saved_resources_self on public.saved_resources for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists resource_reports_submit on public.resource_reports;
create policy resource_reports_submit on public.resource_reports for insert to authenticated with check(reporter_id=auth.uid());
drop policy if exists resource_reports_self_read on public.resource_reports;
create policy resource_reports_self_read on public.resource_reports for select to authenticated using(reporter_id=auth.uid());

-- Generic content: authenticated read, owner-only mutation. No client-set admin field exists.
do $$ declare table_name text; owner_column text; begin
 for table_name,owner_column in values ('ideas','user_id'),('teams','owner_id'),('projects','owner_id') loop
  execute format('drop policy if exists %I on public.%I',table_name||'_read',table_name);
  execute format('create policy %I on public.%I for select to authenticated using(true)',table_name||'_read',table_name);
  execute format('drop policy if exists %I on public.%I',table_name||'_owner',table_name);
  execute format('create policy %I on public.%I for all to authenticated using(%I=auth.uid()) with check(%I=auth.uid())',table_name||'_owner',table_name,owner_column,owner_column);
 end loop;
end $$;
drop policy if exists idea_votes_read on public.idea_votes;
create policy idea_votes_read on public.idea_votes for select to authenticated using(true);
drop policy if exists idea_comments_read on public.idea_comments;
create policy idea_comments_read on public.idea_comments for select to authenticated using(true);
drop policy if exists idea_comments_self_insert on public.idea_comments;
create policy idea_comments_self_insert on public.idea_comments for insert to authenticated with check(user_id=auth.uid());
drop policy if exists idea_comments_self_delete on public.idea_comments;
create policy idea_comments_self_delete on public.idea_comments for delete to authenticated using(user_id=auth.uid());
drop policy if exists idea_votes_self on public.idea_votes;
create policy idea_votes_self on public.idea_votes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists saved_ideas_self on public.saved_ideas;
create policy saved_ideas_self on public.saved_ideas for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members for select to authenticated using(true);
drop policy if exists team_members_owner_write on public.team_members;
create policy team_members_owner_write on public.team_members for all to authenticated using(exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid())) with check(exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists team_applications_read on public.team_applications;
create policy team_applications_read on public.team_applications for select to authenticated using(applicant_id=auth.uid() or exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists team_applications_self_insert on public.team_applications;
create policy team_applications_self_insert on public.team_applications for insert to authenticated with check(applicant_id=auth.uid());
drop policy if exists team_applications_owner_update on public.team_applications;
create policy team_applications_owner_update on public.team_applications for update to authenticated using(exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid())) with check(exists(select 1 from public.teams t where t.id=team_id and t.owner_id=auth.uid()));
drop policy if exists project_likes_read on public.project_likes;
create policy project_likes_read on public.project_likes for select to authenticated using(true);
drop policy if exists project_likes_self on public.project_likes;
create policy project_likes_self on public.project_likes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists saved_projects_self on public.saved_projects;
create policy saved_projects_self on public.saved_projects for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists saved_opportunities_self on public.saved_opportunities;
create policy saved_opportunities_self on public.saved_opportunities for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists contribution_events_self_read on public.contribution_events;
create policy contribution_events_self_read on public.contribution_events for select to authenticated using(user_id=auth.uid());
drop policy if exists leaderboard_read on public.leaderboard;
create policy leaderboard_read on public.leaderboard for select to authenticated using(true);
drop policy if exists conversations_members_read on public.conversations;
create policy conversations_members_read on public.conversations for select to authenticated using(exists(select 1 from public.conversation_members m where m.conversation_id=id and m.user_id=auth.uid()));
drop policy if exists conversation_members_self_read on public.conversation_members;
create policy conversation_members_self_read on public.conversation_members for select to authenticated using(public.is_conversation_member(conversation_id));
drop policy if exists messages_members_read on public.messages;
create policy messages_members_read on public.messages for select to authenticated using(exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
drop policy if exists messages_sender_insert on public.messages;
create policy messages_sender_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.conversation_members m where m.conversation_id=messages.conversation_id and m.user_id=auth.uid()));
drop policy if exists chat_rooms_read on public.chat_rooms;
create policy chat_rooms_read on public.chat_rooms for select to authenticated using(true);
drop policy if exists room_members_read on public.chat_room_members;
create policy room_members_read on public.chat_room_members for select to authenticated using(user_id=auth.uid());
drop policy if exists room_members_self_join on public.chat_room_members;
create policy room_members_self_join on public.chat_room_members for insert to authenticated with check(user_id=auth.uid());
drop policy if exists room_messages_member_read on public.chat_room_messages;
create policy room_messages_member_read on public.chat_room_messages for select to authenticated using(exists(select 1 from public.chat_room_members m where m.room_id=chat_room_messages.room_id and m.user_id=auth.uid()));
drop policy if exists room_messages_member_insert on public.chat_room_messages;
create policy room_messages_member_insert on public.chat_room_messages for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.chat_room_members m where m.room_id=chat_room_messages.room_id and m.user_id=auth.uid()));
drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists reports_self_insert on public.reports;
create policy reports_self_insert on public.reports for insert to authenticated with check(reporter_id=auth.uid());
drop policy if exists reports_self_read on public.reports;
create policy reports_self_read on public.reports for select to authenticated using(reporter_id=auth.uid());

-- RLS policies constrain these grants to each student's allowed rows/actions.
grant select,insert,update on public.profile_private to authenticated;
grant select,insert,update,delete on public.posts,public.post_likes,public.post_comments,public.saved_posts to authenticated;
grant select,insert on public.post_collaborations to authenticated;
grant update(status) on public.post_collaborations to authenticated;
grant select,insert,update,delete on public.study_resources,public.saved_resources to authenticated;
grant select,insert on public.resource_reports to authenticated;
grant select,insert,update,delete on public.ideas,public.teams,public.projects to authenticated;
grant select,insert,delete on public.idea_votes,public.saved_ideas,public.project_likes,public.saved_projects,public.saved_opportunities to authenticated;
grant select,insert,delete on public.idea_comments to authenticated;
grant select,insert,update,delete on public.team_members to authenticated;
grant select,insert on public.team_applications to authenticated;
grant update(status) on public.team_applications to authenticated;
grant select on public.conversations,public.conversation_members,public.messages,public.chat_rooms,public.chat_room_members,public.chat_room_messages to authenticated;
grant insert on public.messages,public.chat_room_members,public.chat_room_messages to authenticated;
grant select,update on public.notifications to authenticated;
grant select,insert on public.reports to authenticated;
grant select on public.contribution_events,public.leaderboard to authenticated;

-- Private object storage. Paths must start with the authenticated user UUID.
insert into storage.buckets(id,name,public) values('studos-media','studos-media',false) on conflict(id) do nothing;
grant select,insert,update,delete on storage.objects to authenticated;
drop policy if exists studos_media_read on storage.objects;
create policy studos_media_read on storage.objects for select to authenticated using(bucket_id='studos-media' and ((storage.foldername(name))[1]=auth.uid()::text or (storage.foldername(name))[2]='posts'));
drop policy if exists studos_media_insert on storage.objects;
create policy studos_media_insert on storage.objects for insert to authenticated with check(bucket_id='studos-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists studos_media_update on storage.objects;
create policy studos_media_update on storage.objects for update to authenticated using(bucket_id='studos-media' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='studos-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists studos_media_delete on storage.objects;
create policy studos_media_delete on storage.objects for delete to authenticated using(bucket_id='studos-media' and (storage.foldername(name))[1]=auth.uid()::text);

commit;
