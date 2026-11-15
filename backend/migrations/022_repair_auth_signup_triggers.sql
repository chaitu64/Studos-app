-- Repair Auth signup after the canonical public.profiles cutover.
-- Preflight is intentionally strict. This migration preserves all profile rows
-- and creates no private-profile rows for existing Auth users.
begin;

do $preflight$
declare
  v_kind "char";
  v_source text;
  v_write_count bigint;
  v_legacy_definer boolean;
  v_legacy_config text[];
  v_profile_id_attnum smallint;
  v_auth_user_attnum smallint;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('auth.users') is null then
    raise exception 'Migration 022 requires public.profiles and auth.users';
  end if;
  if to_regclass('public.student_profiles') is not null then
    raise exception 'public.student_profiles still exists; inspect the canonical profile model before applying migration 022';
  end if;

  select relkind into v_kind from pg_class where oid=to_regclass('public.profiles');
  if v_kind not in ('r', 'p') then
    raise exception 'public.profiles is not a table; refusing to alter the signup schema';
  end if;

  if exists (
    select required.column_name
    from unnest(array[
      'id','auth_user_id','first_name','middle_name','last_name','college','degree',
      'branch','study_year','graduation_year','bio','avatar_url','skills','interests',
      'github_url','linkedin_url','portfolio_url','onboarding_completed','created_at','updated_at'
    ]) as required(column_name)
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name='profiles'
        and c.column_name=required.column_name
    )
  ) then
    raise exception 'public.profiles is missing a required canonical signup column';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name in ('id','auth_user_id') and udt_name<>'uuid'
  ) or (
    select count(*) from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name in ('id','auth_user_id')
  ) <> 2 then
    raise exception 'public.profiles id/auth_user_id must both be UUID columns';
  end if;

  select attnum into v_profile_id_attnum
  from pg_attribute
  where attrelid='public.profiles'::regclass and attname='id' and not attisdropped;
  select attnum into v_auth_user_attnum
  from pg_attribute
  where attrelid='public.profiles'::regclass and attname='auth_user_id' and not attisdropped;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.profiles'::regclass and c.contype='p'
      and c.conkey=array[v_profile_id_attnum]::smallint[]
  ) then
    raise exception 'public.profiles.id is not the primary key; inspect before applying migration 022';
  end if;
  if exists (
    select 1 from public.profiles
    where auth_user_id is not null
    group by auth_user_id having count(*)>1
  ) then
    raise exception 'Duplicate profiles.auth_user_id values exist; no changes made';
  end if;
  if exists (
    select 1
    from auth.users u
    left join public.profiles p on p.auth_user_id=u.id
    group by u.id
    having count(p.id)<>1
  ) then
    raise exception 'Every Auth user must map to exactly one canonical profile; no changes made';
  end if;
  if exists (
    select 1
    from public.profiles p
    join auth.users u on u.id=p.id
    where p.auth_user_id is distinct from u.id
  ) then
    raise exception 'A legacy profile keyed by an Auth UUID is not linked canonically; inspect before migration 022';
  end if;
  if exists (
    select 1 from public.profiles p
    left join auth.users u on u.id=p.auth_user_id
    where p.auth_user_id is not null and u.id is null
  ) then
    raise exception 'A profile references a missing Auth user; no changes made';
  end if;
  if exists (
    select 1 from pg_constraint c
    where c.conrelid='public.profiles'::regclass
      and c.contype='f' and v_auth_user_attnum=any(c.conkey)
      and c.confrelid<>'auth.users'::regclass
  ) then
    raise exception 'profiles.auth_user_id has a foreign key to an unexpected relation';
  end if;

  if to_regclass('public.profile_private') is not null then
    select relkind into v_kind from pg_class where oid=to_regclass('public.profile_private');
    if v_kind not in ('r', 'p') then
      raise exception 'public.profile_private is occupied by a non-table object';
    end if;
    if exists (
      select required.column_name
      from unnest(array['id','college_email','date_of_birth','phone_number','created_at','updated_at'])
        as required(column_name)
      where not exists (
        select 1 from information_schema.columns c
        where c.table_schema='public' and c.table_name='profile_private'
          and c.column_name=required.column_name
      )
    ) then
      raise exception 'public.profile_private exists with an incomplete shape; inspect before applying migration 022';
    end if;
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profile_private'
        and column_name='id' and udt_name<>'uuid'
    ) or not exists (
      select 1 from pg_constraint c
      where c.conrelid='public.profile_private'::regclass and c.contype='p'
        and c.conkey=array[(
          select a.attnum from pg_attribute a
          where a.attrelid=c.conrelid and a.attname='id' and not a.attisdropped
        )]::smallint[]
    ) then
      raise exception 'public.profile_private.id must be a UUID primary key';
    end if;
    if exists (
      select 1 from pg_constraint c
      where c.conrelid='public.profile_private'::regclass and c.contype='f'
        and c.conkey=array[(
          select a.attnum from pg_attribute a
          where a.attrelid=c.conrelid and a.attname='id' and not a.attisdropped
        )]::smallint[]
        and c.confrelid<>'auth.users'::regclass
    ) then
      raise exception 'profile_private.id has a foreign key to an unexpected relation';
    end if;
    if exists (
      select 1 from pg_policies
      where schemaname='public' and tablename='profile_private'
        and policyname not in ('profile_private_phone_owner','profile_private_self')
    ) then
      raise exception 'Custom profile_private policies exist; inspect before applying migration 022';
    end if;
  end if;

  if exists (
    select 1 from pg_trigger t
    join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname not in (
        'on_auth_user_created','on_auth_user_created_studos',
        'studos_create_canonical_profile_trigger'
      )
  ) then
    raise exception 'An unreviewed Auth trigger exists; inspect it before applying migration 022';
  end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    join pg_proc p on p.oid=t.tgfoid
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname='on_auth_user_created_studos'
      and p.oid=to_regprocedure('public.initialize_student_profile()')
      and t.tgenabled<>'D'
  ) or not exists (
    select 1 from pg_trigger t
    join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    join pg_proc p on p.oid=t.tgfoid
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname='studos_create_canonical_profile_trigger'
      and p.oid=to_regprocedure('public.studos_create_canonical_profile()')
      and t.tgenabled<>'D'
  ) then
    raise exception 'Expected enabled STUDOS Auth profile triggers are missing or changed';
  end if;

  if exists (
    select 1 from pg_trigger t
    join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    join pg_proc p on p.oid=t.tgfoid
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname='on_auth_user_created'
      and p.oid<>to_regprocedure('public.handle_new_user()')
  ) then
    raise exception 'on_auth_user_created no longer calls the reviewed legacy handle_new_user()';
  end if;

  if exists (
    select 1 from pg_trigger t
    join pg_class r on r.oid=t.tgrelid
    join pg_namespace n on n.oid=r.relnamespace
    join pg_proc p on p.oid=t.tgfoid
    where not t.tgisinternal and n.nspname='auth' and r.relname='users'
      and t.tgname='on_auth_user_created'
  ) then
    select p.prosrc, p.prosecdef, p.proconfig
      into v_source, v_legacy_definer, v_legacy_config
    from pg_proc p where p.oid=to_regprocedure('public.handle_new_user()');
    if not found or not v_legacy_definer
       or not exists (
         select 1 from unnest(coalesce(v_legacy_config, '{}'::text[])) setting
         where setting ilike 'search_path=%'
       ) or v_source not ilike '%insert into public.profiles%'
       or v_source not ilike '%new.id%' or v_source not ilike '%return new%'
       or v_source ilike '%student_profiles%'
       or v_source ~* '\m(update|delete|truncate)\M' then
      raise exception 'handle_new_user() differs from the reviewed legacy profile writer';
    end if;
    select count(*) into v_write_count
    from regexp_matches(v_source, 'insert[[:space:]]+into', 'gi');
    if v_write_count<>1 then
      raise exception 'handle_new_user() contains additional insert operations; inspect before migration 022';
    end if;
  end if;
end
$preflight$;

create table if not exists public.profile_private (
  id uuid primary key references auth.users(id) on delete restrict,
  college_email text,
  date_of_birth date,
  phone_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $schema$
declare
  v_auth_user_attnum smallint;
begin
  alter table public.profile_private add column if not exists phone_number text;
  alter table public.profile_private add column if not exists created_at timestamptz not null default now();
  alter table public.profile_private add column if not exists updated_at timestamptz not null default now();

  select attnum into v_auth_user_attnum
  from pg_attribute
  where attrelid='public.profiles'::regclass and attname='auth_user_id' and not attisdropped;
  if not exists (
    select 1 from pg_index i
    where i.indrelid='public.profiles'::regclass and i.indisunique
      and i.indnkeyatts=1 and i.indkey[0]=v_auth_user_attnum
      and i.indpred is not null
      and pg_get_expr(i.indpred,i.indrelid) ilike '%auth_user_id%'
      and pg_get_expr(i.indpred,i.indrelid) ilike '%IS NOT NULL%'
  ) then
    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='profiles_auth_user_id_signup_uidx'
    ) then
      raise exception 'profiles_auth_user_id_signup_uidx exists with an unexpected definition';
    end if;
    create unique index profiles_auth_user_id_signup_uidx
      on public.profiles(auth_user_id) where auth_user_id is not null;
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.profiles'::regclass and c.contype='f'
      and c.conkey=array[v_auth_user_attnum]::smallint[]
      and c.confrelid='auth.users'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_id_signup_fkey
      foreign key (auth_user_id) references auth.users(id) on delete cascade not valid;
    alter table public.profiles validate constraint profiles_auth_user_id_signup_fkey;
  end if;

  if exists (
    select 1 from pg_constraint c
    where c.conrelid='public.profile_private'::regclass and c.contype='f'
      and c.conkey=array[(
        select a.attnum from pg_attribute a
        where a.attrelid=c.conrelid and a.attname='id' and not a.attisdropped
      )]::smallint[]
      and c.confrelid<>'auth.users'::regclass
  ) then
    raise exception 'profile_private.id has an incompatible foreign key';
  end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.profile_private'::regclass and c.contype='f'
      and c.conkey=array[(
        select a.attnum from pg_attribute a
        where a.attrelid=c.conrelid and a.attname='id' and not a.attisdropped
      )]::smallint[]
      and c.confrelid='auth.users'::regclass
  ) then
    alter table public.profile_private
      add constraint profile_private_auth_user_id_signup_fkey
      foreign key (id) references auth.users(id) on delete restrict not valid;
    alter table public.profile_private validate constraint profile_private_auth_user_id_signup_fkey;
  end if;
end
$schema$;

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
do $profile_grants$
declare
  v_column record;
begin
  for v_column in
    select attname
    from pg_attribute
    where attrelid='public.profiles'::regclass
      and attnum>0 and not attisdropped
  loop
    execute format(
      'revoke select (%1$I), insert (%1$I), update (%1$I), references (%1$I) on table public.profiles from public, anon, authenticated',
      v_column.attname
    );
  end loop;
end
$profile_grants$;
grant select (
  id, auth_user_id, first_name, middle_name, last_name, college, degree, branch,
  study_year, graduation_year, bio, skills, interests, avatar_url, github_url,
  linkedin_url, portfolio_url, created_at, updated_at, onboarding_completed
) on public.profiles to authenticated;

alter table public.profile_private enable row level security;
revoke all on public.profile_private from public, anon, authenticated;
grant select, insert, update on public.profile_private to authenticated;

drop policy if exists profile_private_self on public.profile_private;
drop policy if exists profile_private_phone_owner on public.profile_private;
create policy profile_private_phone_owner on public.profile_private
  for all to authenticated
  using (id=auth.uid())
  with check (id=auth.uid());

create or replace function public.initialize_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profile_private as current_profile(id, college_email)
  values (new.id, new.email)
  on conflict (id) do update
    set college_email=coalesce(current_profile.college_email, excluded.college_email);
  return new;
end;
$function$;
revoke all on function public.initialize_student_profile() from public, anon, authenticated;

create or replace function public.studos_create_canonical_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_academic public.profiles%rowtype;
begin
  select * into v_academic
  from pg_catalog.jsonb_populate_record(null::public.profiles, pg_catalog.jsonb_build_object(
    'study_year',
      case when new.raw_user_meta_data->>'study_year' ~ '^[1-8]$'
        then new.raw_user_meta_data->>'study_year' else null end,
    'graduation_year',
      case when new.raw_user_meta_data->>'graduation_year' ~ '^(20[0-9]{2}|21[0-9]{2}|2200)$'
        then new.raw_user_meta_data->>'graduation_year' else null end
  ));

  insert into public.profiles (
    id, auth_user_id, first_name, middle_name, last_name, college, degree,
    branch, study_year, graduation_year, bio, avatar_url, skills, interests,
    github_url, linkedin_url, portfolio_url, onboarding_completed, updated_at
  ) values (
    pg_catalog.gen_random_uuid(),
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'first_name',''), ''),
    nullif(new.raw_user_meta_data->>'middle_name',''),
    coalesce(nullif(new.raw_user_meta_data->>'last_name',''), ''),
    nullif(new.raw_user_meta_data->>'college',''),
    nullif(new.raw_user_meta_data->>'degree',''),
    nullif(new.raw_user_meta_data->>'branch',''),
    v_academic.study_year,
    v_academic.graduation_year,
    nullif(new.raw_user_meta_data->>'bio',''),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_url',''), nullif(new.raw_user_meta_data->>'picture','')),
    case when pg_catalog.jsonb_typeof(new.raw_user_meta_data->'skills')='array'
      then array(select pg_catalog.jsonb_array_elements_text(new.raw_user_meta_data->'skills'))
      else '{}'::text[] end,
    case when pg_catalog.jsonb_typeof(new.raw_user_meta_data->'interests')='array'
      then array(select pg_catalog.jsonb_array_elements_text(new.raw_user_meta_data->'interests'))
      else '{}'::text[] end,
    nullif(new.raw_user_meta_data->>'github_url',''),
    nullif(new.raw_user_meta_data->>'linkedin_url',''),
    nullif(new.raw_user_meta_data->>'portfolio_url',''),
    false,
    pg_catalog.now()
  )
  on conflict (auth_user_id) where auth_user_id is not null do nothing;

  return new;
end;
$function$;
revoke all on function public.studos_create_canonical_profile() from public, anon, authenticated;

do $triggers$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  if to_regprocedure('public.handle_new_user()') is not null then
    execute 'revoke all on function public.handle_new_user() from public, anon, authenticated';
  end if;
end
$triggers$;

notify pgrst, 'reload schema';
commit;
