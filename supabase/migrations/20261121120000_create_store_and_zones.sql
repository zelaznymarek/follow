-- S-03 store-and-zones: one store per user with ordered, uniquely named zones (the route), and
-- shopping lists that record the store they were created for. The database owns the ordering rules
-- (append to the end, atomic up/down swaps) so S-04's inline zone creation reuses them.
-- Default privileges are tightened (20261120211932), so every grant here is explicit and anon gets none.

-- Stores ---------------------------------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  -- One store per user (multiple stores are a PRD non-goal).
  unique (user_id),
  -- Target for the composite foreign keys below, so a zone or list can only point at its owner's store.
  unique (id, user_id)
);

comment on table public.stores is 'The one store owned by an account; zones belong to it (roadmap S-03).';

alter table public.stores enable row level security;

create policy "Users can view their own store"
  on public.stores for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own store"
  on public.stores for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own store"
  on public.stores for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy or grant: store deletion is out of scope.
grant select, insert, update on public.stores to authenticated;
grant all on public.stores to service_role;

-- Zones ----------------------------------------------------------------------------------------

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  -- Always set by zones_set_position; the default only keeps it optional for inserts (and their types).
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (store_id, user_id) references public.stores (id, user_id) on delete cascade,
  -- Deferrable so move_zone can swap two positions in one UPDATE: a deferrable constraint is
  -- checked at the end of the statement instead of row by row.
  constraint zones_store_id_position_key unique (store_id, position) deferrable initially immediate
);

comment on table public.zones is 'Zones of a store in route order (roadmap S-03).';

-- Zone names are unique per store, ignoring case.
create unique index zones_store_id_name_key on public.zones (store_id, lower(name));

alter table public.zones enable row level security;

create policy "Users can view their own zones"
  on public.zones for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own zones"
  on public.zones for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own zones"
  on public.zones for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own zones"
  on public.zones for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.zones to authenticated;
grant all on public.zones to service_role;

-- New zones go to the end of the route; any supplied position is ignored.
create function public.zones_set_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Lock the store row so concurrent appends and moves in this store never compute the same position.
  perform 1 from public.stores s where s.id = new.store_id for update;

  select coalesce(max(z.position), 0) + 1
    into new.position
    from public.zones z
   where z.store_id = new.store_id;

  return new;
end;
$$;

revoke execute on function public.zones_set_position() from public;

create trigger zones_set_position
  before insert on public.zones
  for each row execute function public.zones_set_position();

-- Swaps a zone with its neighbour above ('up') or below ('down'); a no-op at either end.
create function public.move_zone(p_zone_id uuid, p_direction text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_position integer;
  v_neighbour_id uuid;
  v_neighbour_position integer;
begin
  if p_direction is null or p_direction not in ('up', 'down') then
    raise exception 'Invalid direction: %', p_direction
      using errcode = 'invalid_parameter_value';
  end if;

  -- Read under RLS: another account's zone is not visible.
  select z.store_id into v_store_id from public.zones z where z.id = p_zone_id;
  if not found then
    raise exception 'Zone not found: %', p_zone_id
      using errcode = 'no_data_found';
  end if;

  -- Same lock as zones_set_position, so moves and appends in this store run one at a time.
  perform 1 from public.stores s where s.id = v_store_id for update;

  -- Read the position after the lock, so a move that just committed is seen.
  select z.position into v_position from public.zones z where z.id = p_zone_id;
  if not found then
    raise exception 'Zone not found: %', p_zone_id
      using errcode = 'no_data_found';
  end if;

  if p_direction = 'up' then
    select z.id, z.position
      into v_neighbour_id, v_neighbour_position
      from public.zones z
     where z.store_id = v_store_id and z.position < v_position
     order by z.position desc
     limit 1;
  else
    select z.id, z.position
      into v_neighbour_id, v_neighbour_position
      from public.zones z
     where z.store_id = v_store_id and z.position > v_position
     order by z.position asc
     limit 1;
  end if;

  if v_neighbour_id is null then
    return;
  end if;

  -- One statement, so the deferrable unique constraint is checked once both rows are swapped.
  update public.zones
     set position = case id when p_zone_id then v_neighbour_position else v_position end
   where id in (p_zone_id, v_neighbour_id);
end;
$$;

revoke execute on function public.move_zone(uuid, text) from public;
grant execute on function public.move_zone(uuid, text) to authenticated;

-- Shopping lists record their store ------------------------------------------------------------

-- Nullable: lists created before the store existed keep null (no backfill).
alter table public.shopping_lists
  add column store_id uuid null,
  add foreign key (store_id, user_id)
    references public.stores (id, user_id) on delete set null (store_id);

-- Fills store_id on new lists from the owner's store. user_id is already set here: column defaults
-- (auth.uid()) are applied before BEFORE INSERT triggers fire.
create function public.shopping_lists_set_store()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.store_id is null then
    new.store_id := (select s.id from public.stores s where s.user_id = new.user_id);
  end if;

  return new;
end;
$$;

revoke execute on function public.shopping_lists_set_store() from public;

create trigger shopping_lists_set_store
  before insert on public.shopping_lists
  for each row execute function public.shopping_lists_set_store();
