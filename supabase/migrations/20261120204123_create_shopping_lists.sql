-- S-02 shopping-lists: the first user-owned table, plus a trivial function for the keep-alive.
-- Since 2026-10-30 new public tables get no Data API grants automatically, so grants are explicit.

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text null check (name is null or char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

comment on table public.shopping_lists is 'Shopping lists owned by one account (roadmap S-02).';

create index shopping_lists_user_id_created_at_idx
  on public.shopping_lists (user_id, created_at desc);

alter table public.shopping_lists enable row level security;

create policy "Users can view their own lists"
  on public.shopping_lists for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own lists"
  on public.shopping_lists for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own lists"
  on public.shopping_lists for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own lists"
  on public.shopping_lists for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.shopping_lists to authenticated;

-- Called by the keep-alive workflow with the publishable key, so the free project does not pause.
create function public.ping()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 1;
$$;

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
