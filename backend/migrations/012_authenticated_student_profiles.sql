-- Canonical Auth-linked student profiles. Review against the live schema before applying.
-- Reuses the existing studos_create_canonical_profile_trigger; do not install another Auth trigger.
-- This migration preserves existing student_profiles rows (including demos) and profiles.
begin;

create extension if not exists pgcrypto;

alter table public.student_profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists college text,
  add column if not exists degree text,
  add column if not exists branch text,
  add column if not exists study_year smallint,
  add column if not exists graduation_year smallint,
  add column if not exists bio text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists interests text[] not null default '{}',
  add column if not exists avatar_url text,
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

do $$ declare v_attnum smallint; begin
  select attnum into v_attnum from pg_attribute
    where attrelid='public.student_profiles'::regclass and attname='auth_user_id' and not attisdropped;
  if exists (select 1 from pg_constraint c where c.conrelid='public.student_profiles'::regclass
      and c.contype='f' and v_attnum=any(c.conkey) and c.confrelid<>'auth.users'::regclass) then
    raise exception 'student_profiles.auth_user_id already has a foreign key to an unexpected relation';
  end if;
  if not exists (select 1 from pg_constraint c where c.conrelid='public.student_profiles'::regclass
      and c.contype='f' and v_attnum=any(c.conkey) and c.confrelid='auth.users'::regclass) then
    alter table public.student_profiles add constraint student_profiles_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$ declare v_attnum smallint; v_idx record; begin
  select attnum into v_attnum from pg_attribute
    where attrelid='public.student_profiles'::regclass and attname='auth_user_id' and not attisdropped;
  select i.indisunique,i.indnkeyatts,i.indkey[0] as first_key,pg_get_expr(i.indpred,i.indrelid) as predicate
    into v_idx from pg_index i join pg_class x on x.oid=i.indexrelid
    join pg_namespace n on n.oid=x.relnamespace
    where n.nspname='public' and x.relname='student_profiles_auth_user_id_uidx';
  if found and (not v_idx.indisunique or v_idx.indnkeyatts<>1 or v_idx.first_key<>v_attnum
      or v_idx.predicate is null or position('auth_user_id' in v_idx.predicate)=0
      or position('IS NOT NULL' in upper(v_idx.predicate))=0) then
    raise exception 'Index student_profiles_auth_user_id_uidx exists with an unexpected definition';
  end if;
  if not found then
    create unique index student_profiles_auth_user_id_uidx
      on public.student_profiles(auth_user_id) where auth_user_id is not null;
  end if;
end $$;

-- Private contact data remains in the owner-only table; this column is never public.
alter table public.profile_private add column if not exists phone_number text;
alter table public.profile_private add column if not exists updated_at timestamptz not null default now();

-- Link the four existing Auth-backed public profiles into canonical records.
-- Existing canonical data wins; profiles data only fills blank values on conflict.
insert into public.student_profiles
  (id, auth_user_id, first_name, middle_name, last_name, college, degree, branch,
   study_year, graduation_year, bio, skills, interests, avatar_url, onboarding_completed)
select gen_random_uuid(), p.id, nullif(p.first_name,''), p.middle_name, nullif(p.last_name,''),
       p.college, p.degree, p.branch, p.study_year, p.graduation_year, p.bio,
       coalesce(p.skills,'{}'), coalesce(p.interests,'{}'), p.avatar_url,
       (nullif(trim(p.first_name),'') is not null and nullif(trim(p.last_name),'') is not null
        and nullif(trim(coalesce(p.college,'')),'') is not null and nullif(trim(coalesce(p.degree,'')),'') is not null
        and nullif(trim(coalesce(p.branch,'')),'') is not null and coalesce(p.study_year between 1 and 8,false)
        and coalesce(p.graduation_year between 2000 and 2200,false))
from public.profiles p
join auth.users u on u.id = p.id
where not exists (select 1 from public.student_profiles s where s.auth_user_id = p.id)
on conflict (auth_user_id) where auth_user_id is not null do nothing;

update public.student_profiles s set
  first_name = coalesce(nullif(s.first_name,''), nullif(p.first_name,'')),
  middle_name = coalesce(s.middle_name, p.middle_name),
  last_name = coalesce(nullif(s.last_name,''), nullif(p.last_name,'')),
  college = coalesce(nullif(trim(s.college),''), p.college), degree = coalesce(nullif(trim(s.degree),''), p.degree),
  branch = coalesce(nullif(trim(s.branch),''), p.branch), study_year = coalesce(s.study_year, p.study_year),
  graduation_year = coalesce(s.graduation_year, p.graduation_year),
  bio = coalesce(nullif(trim(s.bio),''), p.bio), skills = case when coalesce(cardinality(s.skills),0)=0 then coalesce(p.skills,'{}') else s.skills end,
  interests = case when coalesce(cardinality(s.interests),0)=0 then coalesce(p.interests,'{}') else s.interests end,
  avatar_url = coalesce(nullif(s.avatar_url,''), p.avatar_url), updated_at = now()
from public.profiles p where s.auth_user_id = p.id;

alter table public.student_profiles enable row level security;
drop policy if exists student_profiles_authenticated_read on public.student_profiles;
create policy student_profiles_authenticated_read on public.student_profiles
  for select to authenticated using (true);
revoke all on public.student_profiles from public, anon, authenticated;
do $$ declare c record; begin
  for c in select attname from pg_attribute where attrelid='public.student_profiles'::regclass and attnum > 0 and not attisdropped loop
    execute format('revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on table public.student_profiles from public, anon, authenticated', c.attname);
  end loop;
end $$;
grant select (id,auth_user_id,first_name,middle_name,last_name,college,degree,branch,study_year,graduation_year,bio,skills,interests,avatar_url,github_url,linkedin_url,portfolio_url,onboarding_completed)
  on public.student_profiles to authenticated;

-- Keep profiles readable for the existing app, but make it a database-maintained compatibility mirror.
-- Client profile edits now go through save_student_profile, which updates both records atomically.
alter table public.profiles enable row level security;
drop policy if exists profiles_compat_authenticated_read on public.profiles;
create policy profiles_compat_authenticated_read on public.profiles
  for select to authenticated using (true);
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles'
    and cmd in ('INSERT','UPDATE','ALL')
    and policyname not in ('profiles_insert_self','profiles_update_self','profiles_self_insert','profiles_self_update',
      'Students can update own profile','profiles_compat_owner_insert','profiles_compat_owner_update') loop
    raise exception 'Unexpected profiles write policy "%". Review it before migration 012.', p.policyname;
  end loop;
end $$;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists "Students can update own profile" on public.profiles;
drop policy if exists profiles_compat_owner_insert on public.profiles;
drop policy if exists profiles_compat_owner_update on public.profiles;
create policy profiles_compat_owner_insert on public.profiles
  for insert to authenticated with check (id=auth.uid());
create policy profiles_compat_owner_update on public.profiles
  for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
revoke all on public.profiles from public, anon, authenticated;
do $$ declare c record; begin
  for c in select attname from pg_attribute where attrelid='public.profiles'::regclass and attnum > 0 and not attisdropped loop
    execute format('revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on table public.profiles from public, anon, authenticated', c.attname);
  end loop;
end $$;
grant select (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,github_url,linkedin_url,portfolio_url,created_at,updated_at)
  on public.profiles to authenticated;
grant insert (id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url)
  on public.profiles to authenticated;
grant update (first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,updated_at,github_url,linkedin_url,portfolio_url)
  on public.profiles to authenticated;

create or replace function public.sync_compat_profile_to_student_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.student_profiles set first_name=new.first_name,middle_name=new.middle_name,last_name=new.last_name,
    college=new.college,degree=new.degree,branch=new.branch,study_year=new.study_year,
    graduation_year=new.graduation_year,bio=new.bio,skills=new.skills,interests=new.interests,
    avatar_url=new.avatar_url,github_url=new.github_url,linkedin_url=new.linkedin_url,
    portfolio_url=new.portfolio_url,
    onboarding_completed=case when nullif(trim(coalesce(new.first_name,'')),'') is null
      or nullif(trim(coalesce(new.last_name,'')),'') is null
      or nullif(trim(coalesce(new.college,'')),'') is null
      or nullif(trim(coalesce(new.degree,'')),'') is null
      or nullif(trim(coalesce(new.branch,'')),'') is null
      or new.study_year is null or new.study_year not between 1 and 8
      or new.graduation_year is null or new.graduation_year not between 2000 and 2200 then false else onboarding_completed end,
    updated_at=now()
  where auth_user_id=new.id;
  return new;
end; $$;
revoke all on function public.sync_compat_profile_to_student_profile() from public,anon,authenticated;
drop trigger if exists profiles_sync_student_profile on public.profiles;
create trigger profiles_sync_student_profile after update of first_name,middle_name,last_name,college,degree,branch,
  study_year,graduation_year,bio,skills,interests,avatar_url,github_url,linkedin_url,portfolio_url
  on public.profiles for each row execute function public.sync_compat_profile_to_student_profile();

alter table public.profile_private enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='profile_private'
    and policyname not in ('profile_private_self','profile_private_phone_owner') loop
    raise exception 'Unexpected profile_private RLS policy "%". Review it before migration 012.', p.policyname;
  end loop;
end $$;
drop policy if exists profile_private_self on public.profile_private;
drop policy if exists profile_private_phone_owner on public.profile_private;
create policy profile_private_phone_owner on public.profile_private
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.profile_private from public, anon, authenticated;
do $$ declare c record; begin
  for c in select attname from pg_attribute where attrelid='public.profile_private'::regclass and attnum > 0 and not attisdropped loop
    execute format('revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on table public.profile_private from public, anon, authenticated', c.attname);
  end loop;
end $$;
grant select, insert, update on public.profile_private to authenticated;

-- Preserve the existing public.profiles/profile_private signup behavior while fixing its
-- SECURITY DEFINER search_path. The existing migration 002 trigger continues to call this.
do $$ declare v_source text; v_definer boolean; begin
  select prosrc,prosecdef into v_source,v_definer
  from pg_proc where oid=to_regprocedure('public.initialize_student_profile()');
  if not found or not v_definer or v_source not ilike '%insert into public.profiles%'
     or v_source not ilike '%insert into public.profile_private%' or v_source not ilike '%return new%' then
    raise exception 'initialize_student_profile() differs from the reviewed compatibility trigger. Inspect the live function before migration 012.';
  end if;
end $$;
create or replace function public.initialize_student_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year)
  values(new.id,coalesce(new.raw_user_meta_data->>'first_name',''),nullif(new.raw_user_meta_data->>'middle_name',''),
    coalesce(new.raw_user_meta_data->>'last_name',''),nullif(new.raw_user_meta_data->>'college',''),
    nullif(new.raw_user_meta_data->>'branch',''),nullif(new.raw_user_meta_data->>'degree',''),
    case when new.raw_user_meta_data->>'study_year' ~ '^[1-8]$' then (new.raw_user_meta_data->>'study_year')::smallint else null end,
    case when new.raw_user_meta_data->>'graduation_year' ~ '^(20[0-9]{2}|21[0-9]{2}|2200)$'
      then (new.raw_user_meta_data->>'graduation_year')::smallint else null end)
  on conflict(id) do nothing;
  insert into public.profile_private(id,college_email)
  values(new.id,new.email)
  on conflict(id) do update set college_email=excluded.college_email;
  return new;
end; $$;
revoke all on function public.initialize_student_profile() from public, anon, authenticated;

create or replace function public._create_student_profile_for_auth_user(p_user_id uuid, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_full_name text := coalesce(p_metadata->>'full_name', p_metadata->>'name', '');
  v_first text := coalesce(nullif(p_metadata->>'first_name',''), nullif(p_metadata->>'given_name',''), split_part(v_full_name,' ',1), '');
  v_last text := coalesce(nullif(p_metadata->>'last_name',''), nullif(p_metadata->>'family_name',''), nullif(trim(substr(v_full_name, length(split_part(v_full_name,' ',1))+1)),''), '');
begin
  insert into public.student_profiles
    (id, auth_user_id, first_name, last_name, college, degree, branch, study_year, graduation_year,
     avatar_url, skills, interests, onboarding_completed)
  values (gen_random_uuid(), p_user_id, v_first, v_last, nullif(p_metadata->>'college',''), nullif(p_metadata->>'degree',''),
    nullif(p_metadata->>'branch',''),
    case when p_metadata->>'study_year' ~ '^[1-8]$' then (p_metadata->>'study_year')::smallint else null end,
    case when p_metadata->>'graduation_year' ~ '^(20[0-9]{2}|21[0-9]{2}|2200)$'
      then (p_metadata->>'graduation_year')::smallint else null end,
    coalesce(nullif(p_metadata->>'avatar_url',''), nullif(p_metadata->>'picture','')),
    '{}','{}',false)
  on conflict (auth_user_id) where auth_user_id is not null do nothing;
end; $$;
revoke all on function public._create_student_profile_for_auth_user(uuid,jsonb) from public, anon, authenticated;

create or replace function public.ensure_student_profile()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_profile_id uuid;
  v_metadata jsonb := coalesce(auth.jwt()->'user_metadata','{}'::jsonb);
  v_full_name text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select id into v_profile_id from public.student_profiles where auth_user_id = v_user_id;
  if v_profile_id is null then
    perform public._create_student_profile_for_auth_user(v_user_id, v_metadata);
    select id into v_profile_id from public.student_profiles where auth_user_id = v_user_id;
  end if;
  if v_profile_id is null then raise exception 'Could not create student profile'; end if;
  v_full_name := coalesce(v_metadata->>'full_name', v_metadata->>'name', '');
  update public.student_profiles set
    first_name=coalesce(nullif(first_name,''), nullif(v_metadata->>'first_name',''), nullif(v_metadata->>'given_name',''), nullif(split_part(v_full_name,' ',1),''),first_name),
    last_name=coalesce(nullif(last_name,''), nullif(v_metadata->>'last_name',''), nullif(v_metadata->>'family_name',''), nullif(trim(substr(v_full_name,length(split_part(v_full_name,' ',1))+1)),''),last_name),
    college=coalesce(nullif(trim(college),''),nullif(v_metadata->>'college',''),college),
    degree=coalesce(nullif(trim(degree),''),nullif(v_metadata->>'degree',''),degree),
    branch=coalesce(nullif(trim(branch),''),nullif(v_metadata->>'branch',''),branch),
    avatar_url=coalesce(nullif(avatar_url,''),nullif(v_metadata->>'avatar_url',''),nullif(v_metadata->>'picture',''),avatar_url),
    updated_at=now()
  where id=v_profile_id and auth_user_id=v_user_id;
  return v_profile_id;
end; $$;
revoke all on function public.ensure_student_profile() from public, anon;
grant execute on function public.ensure_student_profile() to authenticated;

create or replace function public.save_student_profile(p_profile jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_first text; v_last text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  v_id := public.ensure_student_profile();
  v_first := trim(coalesce(p_profile->>'first_name',''));
  v_last := trim(coalesce(p_profile->>'last_name',''));
  if v_first = '' or v_last = '' or trim(coalesce(p_profile->>'college','')) = ''
     or trim(coalesce(p_profile->>'degree','')) = '' or trim(coalesce(p_profile->>'branch','')) = ''
     or coalesce((p_profile->>'study_year')::int,0) not between 1 and 8
     or coalesce((p_profile->>'graduation_year')::int,0) not between 2000 and 2200 then
    raise exception 'Complete name, college, degree, branch, study year and graduation year';
  end if;
  update public.student_profiles set
    first_name=v_first, middle_name=nullif(trim(coalesce(p_profile->>'middle_name','')),''),
    last_name=v_last, college=trim(p_profile->>'college'), degree=trim(p_profile->>'degree'),
    branch=trim(p_profile->>'branch'), study_year=(p_profile->>'study_year')::smallint,
    graduation_year=(p_profile->>'graduation_year')::smallint,
    bio=nullif(trim(coalesce(p_profile->>'bio','')),''),
    github_url=nullif(trim(coalesce(p_profile->>'github_url','')),''),
    linkedin_url=nullif(trim(coalesce(p_profile->>'linkedin_url','')),''),
    portfolio_url=nullif(trim(coalesce(p_profile->>'portfolio_url','')),''),
    skills=coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'skills','[]'::jsonb))), '{}'),
    interests=coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'interests','[]'::jsonb))), '{}'),
    avatar_url=coalesce(nullif(p_profile->>'avatar_url',''),avatar_url), onboarding_completed=true, updated_at=now()
  where id=v_id and auth_user_id=v_user_id;
  if not found then raise exception 'Student profile ownership check failed'; end if;

  -- Keep the legacy Auth-keyed table current for posts/resources/chat compatibility.
  update public.profiles set first_name=v_first,
    middle_name=nullif(trim(coalesce(p_profile->>'middle_name','')),''), last_name=v_last,
    college=trim(p_profile->>'college'), degree=trim(p_profile->>'degree'), branch=trim(p_profile->>'branch'),
    study_year=(p_profile->>'study_year')::smallint, graduation_year=(p_profile->>'graduation_year')::smallint,
    bio=nullif(trim(coalesce(p_profile->>'bio','')),''),
    skills=coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'skills','[]'::jsonb))), '{}'),
    interests=coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'interests','[]'::jsonb))), '{}'),
    avatar_url=coalesce(nullif(p_profile->>'avatar_url',''),avatar_url),
    github_url=nullif(trim(coalesce(p_profile->>'github_url','')),''),
    linkedin_url=nullif(trim(coalesce(p_profile->>'linkedin_url','')),''),
    portfolio_url=nullif(trim(coalesce(p_profile->>'portfolio_url','')),''),updated_at=now()
  where id=v_user_id;
  if not found then raise exception 'Compatibility profile is missing for this Auth user'; end if;

  insert into public.profile_private(id,phone_number,college_email,date_of_birth,updated_at)
    values(v_user_id,nullif(trim(coalesce(p_profile->>'phone_number','')),''),
      nullif(trim(coalesce(p_profile->>'college_email','')),''), nullif(p_profile->>'date_of_birth','')::date, now())
    on conflict(id) do update set phone_number=excluded.phone_number,
      college_email=excluded.college_email,date_of_birth=excluded.date_of_birth,updated_at=now();
  return true;
end; $$;
revoke all on function public.save_student_profile(jsonb) from public, anon;
grant execute on function public.save_student_profile(jsonb) to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_trigger t join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgfoid='public.initialize_student_profile()'::regprocedure
  ) then
    raise exception 'Expected Auth compatibility trigger initialize_student_profile() is missing; inspect the live Auth triggers before migration 012.';
  end if;
  if not exists (
    select 1 from pg_trigger t join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname='studos_create_canonical_profile_trigger'
      and t.tgfoid=to_regprocedure('public.studos_create_canonical_profile()')
  ) then
    raise exception 'Expected existing canonical Auth trigger is missing or changed; inspect the live Auth trigger before migration 012.';
  end if;
  if exists (
    select 1 from pg_trigger t join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace join pg_proc p on p.oid=t.tgfoid
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname<>'studos_create_canonical_profile_trigger'
      and p.prosrc ilike '%student_profiles%'
  ) then
    raise exception 'Another Auth trigger directly references student_profiles. Review all Auth trigger bodies before migration 012.';
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
