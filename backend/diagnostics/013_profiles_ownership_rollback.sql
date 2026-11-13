-- Roll back only migration 013's two FK target changes. No row data is modified.
-- Run only if the 013 verification identifies a problem and the legacy profiles table remains.
begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Cannot restore legacy FK targets: public.profiles is missing';
  end if;
  if exists (select 1 from public.posts p left join public.profiles x on x.id=p.author_id where p.author_id is not null and x.id is null) then
    raise exception 'Cannot restore posts FK: profile owners are missing';
  end if;
  if exists (select 1 from public.study_resources r left join public.profiles x on x.id=r.user_id where r.user_id is not null and x.id is null) then
    raise exception 'Cannot restore study_resources FK: profile owners are missing';
  end if;

  alter table public.posts drop constraint if exists posts_author_id_fkey;
  alter table public.posts add constraint posts_author_id_fkey
    foreign key (author_id) references public.profiles(id) on delete cascade not valid;
  alter table public.posts validate constraint posts_author_id_fkey;

  alter table public.study_resources drop constraint if exists study_resources_user_id_fkey;
  alter table public.study_resources add constraint study_resources_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade not valid;
  alter table public.study_resources validate constraint study_resources_user_id_fkey;
end $$;

commit;
