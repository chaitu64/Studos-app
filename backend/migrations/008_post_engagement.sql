-- Reconcile post engagement with the current public.post_* schema.
-- This migration does not create tables or modify existing post/engagement rows.

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.saved_posts enable row level security;

-- The app relies on one row per user/post so upserts and counts remain stable.
do $$
begin
  if not exists (
    select 1
    from pg_index ix
    where ix.indrelid = 'public.post_likes'::regclass
      and ix.indisunique and ix.indisvalid
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(ix.indkey) with ordinality as key_col(attnum, ordinality)
        join pg_attribute a on a.attrelid = ix.indrelid and a.attnum = key_col.attnum
        where key_col.ordinality <= ix.indnkeyatts
      ) = array['post_id', 'user_id']::text[]
  ) then
    create unique index post_likes_post_user_key on public.post_likes(post_id, user_id);
  end if;
  if not exists (
    select 1
    from pg_index ix
    where ix.indrelid = 'public.saved_posts'::regclass
      and ix.indisunique and ix.indisvalid
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from unnest(ix.indkey) with ordinality as key_col(attnum, ordinality)
        join pg_attribute a on a.attrelid = ix.indrelid and a.attnum = key_col.attnum
        where key_col.ordinality <= ix.indnkeyatts
      ) = array['post_id', 'user_id']::text[]
  ) then
    create unique index saved_posts_post_user_key on public.saved_posts(post_id, user_id);
  end if;
end $$;

create index if not exists post_comments_post_created_idx
  on public.post_comments(post_id, created_at);

drop policy if exists post_likes_read on public.post_likes;
drop policy if exists post_likes_self_write on public.post_likes;
drop policy if exists post_likes_read_authenticated on public.post_likes;
drop policy if exists post_likes_insert_self on public.post_likes;
drop policy if exists post_likes_delete_self on public.post_likes;
create policy post_likes_read_authenticated on public.post_likes
  for select to authenticated using (true);
create policy post_likes_insert_self on public.post_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy post_likes_delete_self on public.post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists post_comments_read on public.post_comments;
drop policy if exists post_comments_self_write on public.post_comments;
drop policy if exists post_comments_read_authenticated on public.post_comments;
drop policy if exists post_comments_insert_self on public.post_comments;
drop policy if exists post_comments_update_self on public.post_comments;
drop policy if exists post_comments_delete_self on public.post_comments;
create policy post_comments_read_authenticated on public.post_comments
  for select to authenticated using (true);
create policy post_comments_insert_self on public.post_comments
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy post_comments_update_self on public.post_comments
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy post_comments_delete_self on public.post_comments
  for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists saved_posts_self on public.saved_posts;
drop policy if exists saved_posts_read_self on public.saved_posts;
drop policy if exists saved_posts_insert_self on public.saved_posts;
drop policy if exists saved_posts_delete_self on public.saved_posts;
create policy saved_posts_read_self on public.saved_posts
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_posts_insert_self on public.saved_posts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_posts_delete_self on public.saved_posts
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.post_likes to authenticated;
grant select, insert, update, delete on public.post_comments to authenticated;
grant select, insert, delete on public.saved_posts to authenticated;

notify pgrst, 'reload schema';
