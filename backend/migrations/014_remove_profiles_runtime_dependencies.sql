-- Canonical profile cutover. Apply only after 012 and the canonical app are verified
-- in staging. Records and Auth UUID values are preserved. Table removal is migration 015.
begin;

do $$
declare v_secdef boolean; v_config text[]; v_source text; v_rls boolean; v_student_rls boolean;
begin
  if exists (select 1 from auth.users u left join public.student_profiles s on s.auth_user_id=u.id group by u.id having count(s.id)<>1) then
    raise exception 'Auth user to canonical student profile mapping is not exactly one-to-one';
  end if;
  if exists (select 1 from public.student_profiles s left join auth.users u on u.id=s.auth_user_id where s.auth_user_id is not null and u.id is null) then
    raise exception 'A canonical profile maps to a missing Auth user';
  end if;
  if (select count(*) from public.student_profiles where auth_user_id is null)<>20 then
    raise exception 'Expected 20 demo profiles';
  end if;
  if not exists (select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='auth' and c.relname='users' and not t.tgisinternal and t.tgenabled<>'D'
      and t.tgname='studos_create_canonical_profile_trigger' and p.oid=to_regprocedure('public.studos_create_canonical_profile()')) then
    raise exception 'Canonical Auth signup trigger is missing or disabled';
  end if;
  select p.prosecdef,p.proconfig,p.prosrc into v_secdef,v_config,v_source
    from pg_proc p where p.oid=to_regprocedure('public.studos_create_canonical_profile()');
  if not found or not v_secdef or not exists(select 1 from unnest(coalesce(v_config,'{}')) x where x ilike 'search_path=%')
     or v_source not ilike '%auth_user_id%'
     or v_source !~* 'on conflict[[:space:]]*\([[:space:]]*auth_user_id[[:space:]]*\)([[:space:]]+where[[:space:]]+[^;]+)?[[:space:]]+do[[:space:]]*(nothing|update)' then
    raise exception 'Canonical signup function is not verified SECURITY DEFINER/idempotent code';
  end if;
  if not exists (select 1 from pg_index i join pg_class x on x.oid=i.indexrelid
    where i.indrelid='public.student_profiles'::regclass and i.indisunique
      and pg_get_indexdef(i.indexrelid) ilike '%(auth_user_id)%') then
    raise exception 'Unique auth_user_id constraint/index is missing';
  end if;
  select relrowsecurity into v_rls from pg_class where oid='public.profile_private'::regclass;
  if not v_rls or not exists(select 1 from pg_policies where schemaname='public' and tablename='profile_private'
       and roles @> array['authenticated']::name[] and coalesce(qual,'') ilike '%auth.uid()%'
       and coalesce(with_check,'') ilike '%auth.uid()%') then
    raise exception 'profile_private owner-only RLS policy is missing';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='profile_private'
       and ((cmd<>'INSERT' and coalesce(qual,'') not ilike '%auth.uid()%')
         or (cmd in ('INSERT','UPDATE','ALL') and coalesce(with_check,'') not ilike '%auth.uid()%'))) then
    raise exception 'A permissive profile_private policy is not owner-scoped';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='student_profiles' and column_name='phone_number') then
    raise exception 'Phone column must remain in profile_private only';
  end if;
  select relrowsecurity into v_student_rls from pg_class where oid='public.student_profiles'::regclass;
  if not v_student_rls
     or has_any_column_privilege('authenticated','public.student_profiles','INSERT')
     or has_any_column_privilege('authenticated','public.student_profiles','UPDATE') then
    raise exception 'student_profiles must be RLS-protected and client writes must use the owner-checked RPC';
  end if;
  if has_table_privilege('anon','public.profile_private','SELECT')
     or has_table_privilege('anon','public.profile_private','INSERT')
     or has_table_privilege('anon','public.profile_private','UPDATE')
     or not has_table_privilege('authenticated','public.profile_private','SELECT') then
    raise exception 'profile_private grants do not provide owner-only authenticated access';
  end if;
end $$;

-- Retarget every Auth-UUID FK using profiles.id (posts, study resources, contact
-- requests, and profile_private if present); never substitute student_profiles.id.
do $$
declare f record; missing_count bigint; del_action text; upd_action text; match_action text;
begin
  for f in select c.oid,c.conname,c.conrelid::regclass as rel,c.conkey[1] as attnum,
      c.confdeltype,c.confupdtype,c.confmatchtype,c.condeferrable,c.condeferred,c.convalidated,
      a.attname,a.atttypid,cardinality(c.conkey) as key_count
    from pg_constraint c join pg_attribute a on a.attrelid=c.conrelid and a.attnum=c.conkey[1]
    where c.contype='f' and c.confrelid='public.profiles'::regclass loop
    if f.key_count<>1 or f.atttypid<>'uuid'::regtype or f.attname is null then
      raise exception 'Unsupported composite or non-UUID foreign key % on %',f.conname,f.rel;
    end if;
    execute format('select count(*) from %s x left join auth.users u on u.id=x.%I where x.%I is not null and u.id is null',f.rel,f.attname,f.attname) into missing_count;
    if missing_count<>0 then raise exception 'Foreign key % contains % owners absent from auth.users',f.conname,missing_count; end if;
    del_action:=case f.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end;
    upd_action:=case f.confupdtype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE' when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end;
    match_action:=case f.confmatchtype when 'f' then 'FULL' when 'p' then 'PARTIAL' else 'SIMPLE' end;
    execute format('alter table %s drop constraint %I',f.rel,f.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references auth.users(id) match %s on update %s on delete %s%s not valid',
      f.rel,f.conname,f.attname,match_action,upd_action,del_action,
      case when f.condeferrable then ' deferrable' || case when f.condeferred then ' initially deferred' else ' initially immediate' end else '' end);
    if f.convalidated then execute format('alter table %s validate constraint %I',f.rel,f.conname); end if;
  end loop;
end $$;

-- Preserve the existing Auth trigger, but stop its compatibility function creating
-- profiles rows. The canonical trigger owns public student-profile creation.
create or replace function public.initialize_student_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile_private(id,college_email) values(new.id,new.email)
  on conflict(id) do update set college_email=coalesce(profile_private.college_email,excluded.college_email);
  return new;
end; $$;
revoke all on function public.initialize_student_profile() from public,anon,authenticated;

-- Rewrite the owner RPC to write canonical public fields and private contact data only.
create or replace function public.save_student_profile(p_profile jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid:=auth.uid(); v_id uuid; v_first text; v_last text;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  v_id:=public.ensure_student_profile();
  v_first:=trim(coalesce(p_profile->>'first_name','')); v_last:=trim(coalesce(p_profile->>'last_name',''));
  if v_first='' or v_last='' or trim(coalesce(p_profile->>'college',''))=''
     or trim(coalesce(p_profile->>'degree',''))='' or trim(coalesce(p_profile->>'branch',''))=''
     or coalesce((p_profile->>'study_year')::int,0) not between 1 and 8
     or coalesce((p_profile->>'graduation_year')::int,0) not between 2000 and 2200 then
    raise exception 'Complete name, college, degree, branch, study year and graduation year' using errcode='22023';
  end if;
  update public.student_profiles set first_name=v_first,middle_name=nullif(trim(coalesce(p_profile->>'middle_name','')),''),last_name=v_last,
    college=trim(p_profile->>'college'),degree=trim(p_profile->>'degree'),branch=trim(p_profile->>'branch'),
    study_year=(p_profile->>'study_year')::smallint,graduation_year=(p_profile->>'graduation_year')::smallint,
    bio=nullif(trim(coalesce(p_profile->>'bio','')),''),github_url=nullif(trim(coalesce(p_profile->>'github_url','')),''),
    linkedin_url=nullif(trim(coalesce(p_profile->>'linkedin_url','')),''),portfolio_url=nullif(trim(coalesce(p_profile->>'portfolio_url','')),''),
    skills=coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'skills','[]'::jsonb))),'{}'),
    interests=coalesce(array(select jsonb_array_elements_text(coalesce(p_profile->'interests','[]'::jsonb))),'{}'),
    avatar_url=coalesce(nullif(p_profile->>'avatar_url',''),avatar_url),onboarding_completed=true,updated_at=now()
  where id=v_id and auth_user_id=v_user_id;
  if not found then raise exception 'Student profile ownership check failed' using errcode='42501'; end if;
  insert into public.profile_private(id,phone_number,college_email,date_of_birth,updated_at)
  values(v_user_id,nullif(trim(coalesce(p_profile->>'phone_number','')),''),nullif(trim(coalesce(p_profile->>'college_email','')),''),
    nullif(p_profile->>'date_of_birth','')::date,now())
  on conflict(id) do update set phone_number=excluded.phone_number,college_email=excluded.college_email,
    date_of_birth=excluded.date_of_birth,updated_at=now();
  return true;
end; $$;
revoke all on function public.save_student_profile(jsonb) from public,anon;
grant execute on function public.save_student_profile(jsonb) to authenticated;

do $$
declare f record;
begin
  for f in select p.proname,p.prosecdef,p.proconfig,p.prosrc from pg_proc p
    where p.oid in (to_regprocedure('public.ensure_student_profile()'),to_regprocedure('public.save_student_profile(jsonb)')) loop
    if not f.prosecdef or not exists(select 1 from unnest(coalesce(f.proconfig,'{}')) x where x ilike 'search_path=%')
       or f.prosrc not ilike '%auth.uid()%' or f.prosrc not ilike '%auth_user_id%' then
      raise exception 'Profile RPC % lacks fixed-path SECURITY DEFINER ownership checks',f.proname;
    end if;
  end loop;
  if (select count(*) from pg_proc where oid in (to_regprocedure('public.ensure_student_profile()'),to_regprocedure('public.save_student_profile(jsonb)')))<>2 then
    raise exception 'Required ensure/save RPC is missing';
  end if;
end $$;

-- Preserve chat/contact authorization while converting the existing RPC existence
-- checks from profiles.id to student_profiles.auth_user_id. Abort if shape differs.
do $$
declare f record; original text; replacement text;
begin
  for f in select p.oid,p.proname,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('submit_student_contact_request','direct_chat_contact_status','request_direct_conversation','create_direct_conversation','start_direct_conversation') loop
    original:=pg_get_functiondef(f.oid);
    replacement:=regexp_replace(original,'public[.]profiles[[:space:]]+p[[:space:]]+where[[:space:]]+p[.]id[[:space:]]*=','public.student_profiles p where p.auth_user_id=', 'g');
    if position('public.profiles' in replacement)>0 then raise exception 'Could not fully migrate profile lookup in %',f.proname; end if;
    if original<>replacement then
      if not f.prosecdef then raise exception 'Expected SECURITY DEFINER authorization function %; review before changing it',f.proname; end if;
      execute replacement;
      execute format('alter function %s set search_path = pg_catalog',f.oid::regprocedure);
    end if;
  end loop;
end $$;

drop trigger if exists profiles_sync_student_profile on public.profiles;
drop function if exists public.sync_compat_profile_to_student_profile();
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='profiles' loop
    execute format('drop policy %I on public.profiles',p.policyname);
  end loop;
end $$;

-- Fail closed if a stored function body still names the legacy table.
do $$ declare f record; begin
  for f in select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.prosrc ~ '(^|[^a-z_])profiles([^a-z_]|$)' loop
    raise exception 'Function %.%(%) still references public.profiles',f.nspname,f.proname,f.args;
  end loop;
end $$;

do $$ begin
  if exists (select 1 from pg_depend d join pg_rewrite r on r.oid=d.objid where d.refobjid='public.profiles'::regclass) then
    raise exception 'Views or rewrite rules still depend on profiles; migrate them before cutover';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename<>'profiles'
    and (coalesce(qual,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)'
      or coalesce(with_check,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)')) then
    raise exception 'An RLS policy still depends on profiles; review the preflight output';
  end if;
  if exists (select 1 from pg_trigger where not tgisinternal and tgrelid='public.profiles'::regclass) then
    raise exception 'Unexpected trigger remains attached to profiles';
  end if;
end $$;

commit;
