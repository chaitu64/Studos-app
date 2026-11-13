-- Phase 1 of legacy public.profiles retirement.
-- Moves only the two confirmed ownership FKs to auth.users. UUID values are preserved.
-- Does not drop, truncate, or update posts, study_resources, student_profiles, or profiles.
-- Run only after 013_profiles_retirement_preflight.sql passes and migration 012 is verified.
begin;

do $$
declare
  v_posts_fk record;
  v_resources_fk record;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.posts') is null
     or to_regclass('public.study_resources') is null
     or to_regclass('public.student_profiles') is null then
    raise exception 'Required relation missing; no changes made';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='student_profiles' and column_name='auth_user_id') then
    raise exception 'student_profiles.auth_user_id is missing; verify migration 012';
  end if;
  if exists (
    select 1 from auth.users u left join public.student_profiles s on s.auth_user_id=u.id
    group by u.id having count(s.id)<>1
  ) then
    raise exception 'Every Auth user must map to exactly one student_profiles row before this migration';
  end if;

  select c.conname, c.confrelid as target_oid, c.confdeltype
    into v_posts_fk
  from pg_constraint c
  where c.conrelid='public.posts'::regclass and c.conname='posts_author_id_fkey'
    and c.contype='f' and c.conkey=array[(select attnum from pg_attribute where attrelid='public.posts'::regclass and attname='author_id')]::smallint[];
  if not found or v_posts_fk.confdeltype <> 'c' or v_posts_fk.target_oid not in ('public.profiles'::regclass,'auth.users'::regclass) then
    raise exception 'posts_author_id_fkey differs from reviewed definition; no changes made';
  end if;

  select c.conname, c.confrelid as target_oid, c.confdeltype
    into v_resources_fk
  from pg_constraint c
  where c.conrelid='public.study_resources'::regclass and c.conname='study_resources_user_id_fkey'
    and c.contype='f' and c.conkey=array[(select attnum from pg_attribute where attrelid='public.study_resources'::regclass and attname='user_id')]::smallint[];
  if not found or v_resources_fk.confdeltype <> 'c' or v_resources_fk.target_oid not in ('public.profiles'::regclass,'auth.users'::regclass) then
    raise exception 'study_resources_user_id_fkey differs from reviewed definition; no changes made';
  end if;

  if exists (select 1 from public.posts p left join auth.users u on u.id=p.author_id where p.author_id is not null and u.id is null) then
    raise exception 'Orphaned posts.author_id values found; no changes made';
  end if;
  if exists (select 1 from public.study_resources r left join auth.users u on u.id=r.user_id where r.user_id is not null and u.id is null) then
    raise exception 'Orphaned study_resources.user_id values found; no changes made';
  end if;

  -- Keep these ownership columns as Auth UUIDs. student_profiles.id is deliberately
  -- not involved in these foreign keys; student_profiles.auth_user_id maps to Auth.
  if v_posts_fk.target_oid='public.profiles'::regclass then
    alter table public.posts drop constraint posts_author_id_fkey;
    alter table public.posts add constraint posts_author_id_fkey
      foreign key (author_id) references auth.users(id) on delete cascade not valid;
    alter table public.posts validate constraint posts_author_id_fkey;
  end if;
  if v_resources_fk.target_oid='public.profiles'::regclass then
    alter table public.study_resources drop constraint study_resources_user_id_fkey;
    alter table public.study_resources add constraint study_resources_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
    alter table public.study_resources validate constraint study_resources_user_id_fkey;
  end if;
end $$;

commit;
