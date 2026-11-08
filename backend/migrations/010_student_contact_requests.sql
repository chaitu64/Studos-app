-- Authenticated student-to-student contact requests for Connect.
-- Apply after verifying profiles.id references auth.users and student_services exists.
-- Public professional profile links (never use the private profile table for these).
alter table public.profiles
  add column if not exists github_url text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text;
grant select (github_url, linkedin_url, portfolio_url), update (github_url, linkedin_url, portfolio_url) on public.profiles to authenticated;
alter table public.profiles enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Students can update own profile'
  ) then
    create policy "Students can update own profile" on public.profiles
      for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;

-- Active listings are discoverable by signed-in students; provider data is read separately.
alter table public.student_services enable row level security;
grant select on public.student_services to authenticated;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'student_services'
      and policyname = 'Authenticated students can discover active services'
  ) then
    create policy "Authenticated students can discover active services"
      on public.student_services for select to authenticated using (is_active = true);
  end if;
end $$;

create table if not exists public.student_contact_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.student_services(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint student_contact_requests_not_self check (requester_id <> recipient_id)
);

create unique index if not exists student_contact_requests_active_unique
  on public.student_contact_requests(requester_id, recipient_id, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('pending','accepted');
create index if not exists student_contact_requests_recipient_created_idx
  on public.student_contact_requests(recipient_id, created_at desc);
create index if not exists student_contact_requests_requester_created_idx
  on public.student_contact_requests(requester_id, created_at desc);

alter table public.student_contact_requests enable row level security;
revoke all on public.student_contact_requests from anon, authenticated;
grant select on public.student_contact_requests to authenticated;
grant update(status, reviewed_at) on public.student_contact_requests to authenticated;

drop policy if exists student_contact_requests_participant_read on public.student_contact_requests;
create policy student_contact_requests_participant_read on public.student_contact_requests
  for select to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id);
drop policy if exists student_contact_requests_recipient_review on public.student_contact_requests;
create policy student_contact_requests_recipient_review on public.student_contact_requests
  for update to authenticated using (auth.uid() = recipient_id and status = 'pending')
  with check (auth.uid() = recipient_id and status in ('accepted','declined'));

create or replace function public.submit_student_contact_request(
  target_user_id uuid,
  target_service_id uuid,
  request_message text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  request_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if target_user_id is null or target_user_id = caller_id then raise exception 'Invalid recipient' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(request_message, ''))) < 1 or char_length(btrim(request_message)) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = target_user_id) then
    raise exception 'This provider is not linked to a contactable STUDOS account' using errcode = 'P0002';
  end if;
  if target_service_id is not null and not exists (
    select 1 from public.student_services s
    where s.id = target_service_id and s.provider_id = target_user_id and s.is_active = true
  ) then raise exception 'This active service is not owned by that account' using errcode = '42501'; end if;
  insert into public.student_contact_requests(requester_id, recipient_id, service_id, message)
    values(caller_id, target_user_id, target_service_id, btrim(request_message)) returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.submit_student_contact_request(uuid, uuid, text) from public, anon;
grant execute on function public.submit_student_contact_request(uuid, uuid, text) to authenticated;
