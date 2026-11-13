-- Read-only verification after migration 013. Expected: both ownership FKs target auth.users.
select c.conrelid::regclass as source_table,c.conname,pg_get_constraintdef(c.oid,true) as definition,
       c.convalidated
from pg_constraint c
where c.contype='f' and c.conname in ('posts_author_id_fkey','study_resources_user_id_fkey')
order by 1,2;

select 'posts' as relation_name,count(*) as row_count,
       count(*) filter (where p.author_id is not null and u.id is null) as orphan_rows
from public.posts p left join auth.users u on u.id=p.author_id
union all
select 'study_resources',count(*),
       count(*) filter (where r.user_id is not null and u.id is null)
from public.study_resources r left join auth.users u on u.id=r.user_id;

select (select count(*) from auth.users) as auth_users,
       (select count(*) from public.student_profiles where auth_user_id is not null) as linked_rows,
       (select count(distinct auth_user_id) from public.student_profiles where auth_user_id is not null) as distinct_users,
       (select count(*) from public.student_profiles where auth_user_id is null) as demo_rows,
       (select count(*) from auth.users u left join public.student_profiles s on s.auth_user_id=u.id where s.id is null) as missing_profiles;

select c.conrelid::regclass as source_table,c.conname,pg_get_constraintdef(c.oid,true) as remaining_profiles_fk
from pg_constraint c where c.contype='f' and c.confrelid='public.profiles'::regclass;
