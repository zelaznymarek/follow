-- This project still applied Supabase's old default privileges: every new public table, sequence
-- and function was granted to anon and authenticated (see 20261120205749). Align it with the
-- current default, so new objects stay unexposed until a migration grants them explicitly.
-- Note: every role is a member of PUBLIC, and Postgres grants PUBLIC execute on new functions
-- globally (not per schema), so each new function still needs `revoke execute ... from public`.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- shopping_lists: signed-in users keep only the DML the app needs; the service role is explicit.
revoke truncate, references, trigger on public.shopping_lists from authenticated;
grant all on public.shopping_lists to service_role;
