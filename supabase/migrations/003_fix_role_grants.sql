-- Restore the standard Supabase role grants. Without these, every query --
-- including service-role queries -- fails with "permission denied" (42501),
-- which surfaces in the app as "User profile could not be loaded".
-- Row Level Security policies from 001 still control per-user access for
-- anon/authenticated; grants alone do not bypass RLS.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
