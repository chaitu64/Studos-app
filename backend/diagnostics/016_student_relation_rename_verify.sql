-- Run after migration 016. Expected: no student_ public table/view names;
-- all relation renames are visible; the two study resource tables are unchanged.
select c.relname as remaining_prefixed_relation
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and c.relname like 'student\_%' escape '\'
order by c.relname;

select name as renamed_relation, to_regclass(format('public.%I', name)) is not null as exists
from (values
  ('profiles'), ('content'), ('ideas'), ('ideas_feed'), ('services'),
  ('help_requests'), ('team_openings'), ('private_details'), ('problems'),
  ('portfolio'), ('idea_actors'), ('idea_comments'), ('idea_requests'),
  ('idea_sparks'), ('idea_live_collaborators'), ('idea_live_comments'),
  ('idea_live_requests'), ('idea_live_sparks'), ('idea_live_saves'),
  ('contact_requests'), ('study_resources'), ('study_resource_links')
) as expected(name)
order by name;

-- Inspect surviving function definitions for stale, qualified table references.
select n.nspname as schema_name, p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind in ('f', 'p')
  and p.prosrc ~ '\m(public\.)?student_(profiles|content|ideas|services|help_requests|team_openings|private_details|problems|portfolio|idea_|contact_requests)\M'
order by 1, 2;
