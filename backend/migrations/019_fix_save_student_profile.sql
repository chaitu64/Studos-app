-- Repair save_student_profile after migration 016 renamed
-- public.student_profiles to public.profiles. This preserves the migration
-- 014 RPC contract and changes only the canonical relation name.
begin;

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
  update public.profiles set first_name=v_first,middle_name=nullif(trim(coalesce(p_profile->>'middle_name','')),''),last_name=v_last,
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
notify pgrst, 'reload schema';
commit;
