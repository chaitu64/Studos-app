-- Read-only preflight for the staged migration from profiles ownership FKs to auth.users.
-- Also inventories dependencies that must be removed before a separate profiles DROP is considered.

select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.student_profiles where auth_user_id is not null) as linked_profile_rows,
       (select count(distinct auth_user_id) from public.student_profiles where auth_user_id is not null) as distinct_auth_mappings,
       (select count(*) from public.student_profiles where auth_user_id is null) as demo_rows,
       (select count(*) from auth.users u left join public.student_profiles s on s.auth_user_id=u.id where s.id is null) as auth_users_missing_profile;

select auth_user_id,count(*) as profile_count from public.student_profiles
where auth_user_id is not null group by auth_user_id having count(*)<>1;

select 'posts.author_id' as ownership_column,count(*) as total_rows,
       count(*) filter (where p.author_id is not null and u.id is null) as orphan_rows
from public.posts p left join auth.users u on u.id=p.author_id
union all
select 'study_resources.user_id',count(*),
       count(*) filter (where r.user_id is not null and u.id is null)
from public.study_resources r left join auth.users u on u.id=r.user_id;

select c.conrelid::regclass as source_table,c.conname,pg_get_constraintdef(c.oid,true) as definition
from pg_constraint c
where c.contype='f' and c.confrelid='public.profiles'::regclass
order by 1,2;

select n.nspname as schema_name,c.relname as dependent_relation,c.relkind,
       pg_get_viewdef(c.oid,true) as view_definition
from pg_depend d join pg_rewrite rw on rw.oid=d.objid
join pg_class c on c.oid=rw.ev_class join pg_namespace n on n.oid=c.relnamespace
where d.refobjid='public.profiles'::regclass
order by 1,2;

select n.nspname as schema_name,p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef as security_definer,
       p.proconfig as function_settings,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.prosrc ilike '%profiles%' or p.prosrc ilike '%student_profiles%'
order by 1,2;

select n.nspname as schema_name,c.relname as table_name,t.tgname,
       pg_get_triggerdef(t.oid,true) as trigger_definition,p.oid::regprocedure as trigger_function,
       pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and (p.prosrc ilike '%profiles%' or p.prosrc ilike '%student_profiles%')
order by 1,2,3;

select schemaname,tablename,policyname,cmd,qual,with_check
from pg_policies where schemaname='public'
  and (coalesce(qual,'') ilike '%profiles%' or coalesce(with_check,'') ilike '%profiles%')
order by tablename,policyname;

select table_schema,table_name,column_name,grantee,privilege_type
from information_schema.column_privileges where table_schema='public' and table_name='profiles'
order by grantee,column_name,privilege_type;

select 'posts' as relation_name,count(*) as row_count from public.posts
union all select 'study_resources',count(*) from public.study_resources;

-- Text scan is supplementary only: it does not detect dynamic SQL or external clients.
select schemaname,tablename,indexname,indexdef from pg_indexes
where schemaname='public' and indexdef ilike '%profiles%';
