-- Read-only diagnostic. Run in the configured project's Supabase SQL Editor.
select c.column_name, c.data_type, c.is_nullable
from information_schema.columns c
where c.table_schema = 'public' and c.table_name = 'services'
order by c.ordinal_position;

select tc.constraint_name, tc.constraint_type, kcu.column_name,
       ccu.table_schema as referenced_schema, ccu.table_name as referenced_table,
       ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_catalog = kcu.constraint_catalog
 and tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_catalog = ccu.constraint_catalog
 and tc.constraint_schema = ccu.constraint_schema
 and tc.constraint_name = ccu.constraint_name
where tc.table_schema = 'public' and tc.table_name = 'services'
  and tc.constraint_type = 'FOREIGN KEY';

select c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'services';

select policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'services'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'services'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

select count(*) filter (where is_active) as active_count,
       count(*) filter (where not is_active) as inactive_count,
       count(*) as total_count
from public.services;

-- Portfolio/content tables are inspected separately so seeded student profile IDs
-- are not silently assigned to a signed-in Auth profile.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in ('portfolio', 'content')
order by table_name, ordinal_position;

select tc.table_name, tc.constraint_name, kcu.column_name,
       ccu.table_name as referenced_table, ccu.column_name as referenced_column
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_catalog = kcu.constraint_catalog
 and tc.constraint_schema = kcu.constraint_schema
 and tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_catalog = ccu.constraint_catalog
 and tc.constraint_schema = ccu.constraint_schema
 and tc.constraint_name = ccu.constraint_name
where tc.table_schema = 'public' and tc.table_name in ('portfolio', 'content')
  and tc.constraint_type = 'FOREIGN KEY';
