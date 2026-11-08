-- Allow authenticated users to add and remove only their own Spark rows.
-- The frontend uses (idea_id, user_id) and verifies user_id against auth.getUser().
-- Policies are additive and deliberately do not grant UPDATE access.
begin;

alter table public.student_idea_live_sparks enable row level security;

-- The client uses ON CONFLICT (idea_id, user_id) DO NOTHING to make repeated
-- Spark taps idempotent. Add the key only if no equivalent unique index exists.
do $$
declare
  idea_att smallint;
  user_att smallint;
begin
  select attnum into idea_att
  from pg_attribute
  where attrelid = 'public.student_idea_live_sparks'::regclass and attname = 'idea_id' and not attisdropped;
  select attnum into user_att
  from pg_attribute
  where attrelid = 'public.student_idea_live_sparks'::regclass and attname = 'user_id' and not attisdropped;

  if exists (
    select 1 from public.student_idea_live_sparks
    group by idea_id, user_id having count(*) > 1
  ) then
    raise exception 'Duplicate idea/user Spark rows exist; review them before creating the unique key.';
  end if;

  if not exists (
    select 1
    from pg_index i
    where i.indrelid = 'public.student_idea_live_sparks'::regclass
      and i.indisunique
      and i.indpred is null
      and i.indexprs is null
      and i.indnkeyatts = 2
      and (
        select array_agg(a.attname::text order by k.ordinality)
        from unnest(i.indkey::smallint[]) with ordinality as k(attnum, ordinality)
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
        where k.ordinality <= i.indnkeyatts
      ) = array['idea_id', 'user_id']::text[]
  ) then
    create unique index student_idea_live_sparks_idea_user_uidx
      on public.student_idea_live_sparks (idea_id, user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_idea_live_sparks'
      and policyname = 'student_idea_live_sparks_insert_self'
  ) then
    create policy student_idea_live_sparks_insert_self
      on public.student_idea_live_sparks
      for insert to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_idea_live_sparks'
      and policyname = 'student_idea_live_sparks_delete_self'
  ) then
    create policy student_idea_live_sparks_delete_self
      on public.student_idea_live_sparks
      for delete to authenticated
      using (user_id = (select auth.uid()));
  end if;
end
$$;

commit;
