-- Rename every public relation with the student_ prefix by removing that prefix.
-- PostgreSQL preserves rows, grants, RLS, policies, indexes, triggers and FK
-- relationships when a relation is renamed. This migration never copies or drops data.
-- It is safe to rerun after a successful application.
do $migration$
declare
  v_old text;
  v_new text;
  v_old_oid oid;
  v_new_oid oid;
  v_function record;
  v_definition text;
  v_updated text;
begin
  for v_old in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and c.relname like 'student\_%' escape '\'
      and c.relname not in ('study_resources', 'study_resource_links')
    order by c.relname
  loop
    v_new := substring(v_old from 9);
    v_old_oid := to_regclass(format('public.%I', v_old));
    v_new_oid := to_regclass(format('public.%I', v_new));

    if v_new_oid is not null then
      if v_old_oid is not null then
        raise exception 'Cannot rename public.% to public.%: both relations exist; inspect data and dependencies first', v_old, v_new;
      end if;
      -- A prior run completed this rename. Leave the resulting relation intact.
      continue;
    end if;

    -- Stored SQL/PLpgSQL strings do not always acquire relation dependencies.
    -- Rewrite exact relation identifiers before the rename, while preserving
    -- RPC and trigger function names such as ensure_student_profile().
    for v_function in
      select p.oid
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and p.prosrc ~ ('\m' || v_old || '\M')
    loop
      v_definition := pg_get_functiondef(v_function.oid);
      v_updated := regexp_replace(v_definition, '\m' || v_old || '\M', v_new, 'g');
      if v_updated <> v_definition then
        execute v_updated;
      end if;
    end loop;

    execute format('alter %s public.%I rename to %I',
      case (select relkind from pg_class where oid = v_old_oid)
        when 'v' then 'view'
        when 'm' then 'materialized view'
        when 'f' then 'foreign table'
        else 'table'
      end,
      v_old,
      v_new
    );
  end loop;
end
$migration$;

-- Validate that no prefixed public table/view remains. This also catches
-- collisions or unexpected relation kinds before the migration is recorded.
do $validation$
begin
  if exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and c.relname like 'student\_%' escape '\'
  ) then
    raise exception 'Some public student_ relations remain after migration 016';
  end if;
end
$validation$;
