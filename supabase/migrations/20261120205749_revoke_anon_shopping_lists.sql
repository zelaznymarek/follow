-- S-02 shopping-lists: this project still applies the old default privileges, so anon received
-- grants on public.shopping_lists when it was created (checked over REST on 2026-11-20).
-- Lists are only for signed-in users; RLS stays the second layer.

revoke all on table public.shopping_lists from anon;
