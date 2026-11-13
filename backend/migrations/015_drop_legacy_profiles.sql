-- Final destructive contract step. Requires staging sign-off, backup, all app cuts,
-- migrations 013 and 014, and passing authenticated integration tests. No CASCADE.
begin;

do $$
begin
  if to_regclass('public.profiles') is null then raise exception 'public.profiles is already absent; do not rerun this migration'; end if;
  if to_regclass('public.student_profiles') is null or to_regclass('public.profile_private') is null then
    raise exception 'Canonical profile tables are missing';
  end if;
  if exists (select 1 from auth.users u left join public.student_profiles s on s.auth_user_id=u.id group by u.id having count(s.id)<>1) then
    raise exception 'Auth users do not map to exactly one canonical profile';
  end if;
  if exists (select 1 from public.student_profiles s left join auth.users u on u.id=s.auth_user_id where s.auth_user_id is not null and u.id is null) then
    raise exception 'A canonical profile maps to a missing Auth user';
  end if;
  if (select count(*) from public.student_profiles where auth_user_id is null)<>20 then
    raise exception 'Expected 20 demo identities';
  end if;
  if exists (select 1 from pg_constraint where contype='f' and confrelid='public.profiles'::regclass) then
    raise exception 'Foreign keys still reference public.profiles';
  end if;
  if exists (select 1 from pg_depend d join pg_rewrite r on r.oid=d.objid where d.refobjid='public.profiles'::regclass) then
    raise exception 'A view or rewrite rule still depends on public.profiles';
  end if;
  if exists (select 1 from pg_trigger where not tgisinternal and tgrelid='public.profiles'::regclass) then
    raise exception 'Triggers remain on public.profiles';
  end if;
  if exists (select 1 from pg_proc where prosrc ~ '(^|[^a-z_])profiles([^a-z_]|$)') then
    raise exception 'A function body still references public.profiles';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename<>'profiles'
    and (coalesce(qual,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)'
      or coalesce(with_check,'') ~* '(^|[^a-z_])profiles([^a-z_]|$)')) then
    raise exception 'An RLS policy still references profiles';
  end if;
end $$;

drop table public.profiles restrict;

commit;
