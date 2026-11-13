-- Restore the authenticated profile initialization RPC against canonical public.profiles.
-- This migration does not alter profile rows, RLS, or the existing Auth trigger.
begin;

do $preflight$
declare
  v_profiles regclass := to_regclass('public.profiles');
  v_auth_user_id smallint;
  v_has_unique_partial_index boolean;
begin
  if v_profiles is null then
    raise exception 'Expected canonical public.profiles relation; refusing to install ensure_student_profile()';
  end if;

  select a.attnum into v_auth_user_id
  from pg_attribute a
  where a.attrelid = v_profiles and a.attname = 'auth_user_id' and not a.attisdropped;
  if v_auth_user_id is null then
    raise exception 'public.profiles.auth_user_id is missing; inspect the live schema before repairing this RPC';
  end if;

  if exists (
    select required.column_name
    from unnest(array['id','auth_user_id','first_name','last_name','college','degree','branch','study_year','graduation_year','avatar_url','skills','interests','onboarding_completed','updated_at']) as required(column_name)
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'profiles' and c.column_name = required.column_name
    )
  ) then
    raise exception 'public.profiles is missing a column required by the reviewed profile initializer';
  end if;

  select exists (
    select 1
    from pg_index i
    where i.indrelid = v_profiles
      and i.indisunique
      and i.indnkeyatts = 1
      and i.indkey[0] = v_auth_user_id
      and i.indpred is not null
      and pg_get_expr(i.indpred, i.indrelid) ilike '%auth_user_id%'
      and pg_get_expr(i.indpred, i.indrelid) ilike '%IS NOT NULL%'
  ) into v_has_unique_partial_index;

  if not v_has_unique_partial_index then
    raise exception 'Expected unique partial index on public.profiles(auth_user_id) WHERE auth_user_id IS NOT NULL; refusing to change profile constraints';
  end if;

  if exists (
    select 1 from public.profiles
    where auth_user_id is not null
    group by auth_user_id having count(*) > 1
  ) then
    raise exception 'Duplicate Auth-linked public.profiles rows exist; resolve them before restoring the RPC';
  end if;
end
$preflight$;

create or replace function public.ensure_student_profile()
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_metadata jsonb := coalesce(auth.jwt()->'user_metadata', '{}'::jsonb);
  v_full_name text;
  v_academic public.profiles%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select p.id into v_profile_id
  from public.profiles as p
  where p.auth_user_id = v_user_id;

  if v_profile_id is null then
    v_full_name := coalesce(v_metadata->>'full_name', v_metadata->>'name', '');
    -- Populate academic values through the table's actual row type. Historical
    -- schema versions used smallint for study_year; deployed versions may use text.
    select * into v_academic
    from jsonb_populate_record(null::public.profiles, jsonb_build_object(
      'study_year', case when v_metadata->>'study_year' ~ '^[1-8]$' then v_metadata->>'study_year' else null end,
      'graduation_year', case when v_metadata->>'graduation_year' ~ '^(20[0-9]{2}|21[0-9]{2}|2200)$' then v_metadata->>'graduation_year' else null end
    ));

    insert into public.profiles (
      id, auth_user_id, first_name, last_name, college, degree, branch,
      study_year, graduation_year, avatar_url, skills, interests, onboarding_completed
    ) values (
      pg_catalog.gen_random_uuid(),
      v_user_id,
      coalesce(nullif(v_metadata->>'first_name', ''), nullif(v_metadata->>'given_name', ''), nullif(split_part(v_full_name, ' ', 1), ''), ''),
      coalesce(nullif(v_metadata->>'last_name', ''), nullif(v_metadata->>'family_name', ''), nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 1)), ''), ''),
      nullif(v_metadata->>'college', ''),
      nullif(v_metadata->>'degree', ''),
      nullif(v_metadata->>'branch', ''),
      v_academic.study_year,
      v_academic.graduation_year,
      coalesce(nullif(v_metadata->>'avatar_url', ''), nullif(v_metadata->>'picture', '')),
      '{}'::text[],
      '{}'::text[],
      false
    ) on conflict (auth_user_id) where auth_user_id is not null do nothing;

    select p.id into v_profile_id
    from public.profiles as p
    where p.auth_user_id = v_user_id;
  end if;

  if v_profile_id is null then
    raise exception 'Could not create canonical student profile';
  end if;

  -- Keep existing student-entered values; use Auth metadata only to fill blanks.
  v_full_name := coalesce(v_metadata->>'full_name', v_metadata->>'name', '');
  update public.profiles as p set
    first_name = coalesce(nullif(p.first_name, ''), nullif(v_metadata->>'first_name', ''), nullif(v_metadata->>'given_name', ''), nullif(split_part(v_full_name, ' ', 1), ''), p.first_name),
    last_name = coalesce(nullif(p.last_name, ''), nullif(v_metadata->>'last_name', ''), nullif(v_metadata->>'family_name', ''), nullif(trim(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 1)), ''), p.last_name),
    college = coalesce(nullif(trim(p.college), ''), nullif(v_metadata->>'college', ''), p.college),
    degree = coalesce(nullif(trim(p.degree), ''), nullif(v_metadata->>'degree', ''), p.degree),
    branch = coalesce(nullif(trim(p.branch), ''), nullif(v_metadata->>'branch', ''), p.branch),
    avatar_url = coalesce(nullif(p.avatar_url, ''), nullif(v_metadata->>'avatar_url', ''), nullif(v_metadata->>'picture', ''), p.avatar_url),
    updated_at = pg_catalog.now()
  where p.id = v_profile_id and p.auth_user_id = v_user_id;

  return v_profile_id;
end;
$function$;

revoke all on function public.ensure_student_profile() from public, anon, authenticated;
grant execute on function public.ensure_student_profile() to authenticated;

notify pgrst, 'reload schema';
commit;
