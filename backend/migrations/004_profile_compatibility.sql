-- Additive compatibility fix for existing profiles tables used by the app.
-- Safe to run after 002_studos_application.sql or on older deployments.
begin;
alter table public.profiles add column if not exists degree text;
alter table public.profiles add column if not exists avatar_url text;
commit;
