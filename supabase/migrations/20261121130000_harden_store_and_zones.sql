-- S-03 store-and-zones, Phase 1 review fixes (reviews/impl-review-phase-1.md F1-F5):
-- column-level update grants, a store check before appending a zone, lighter store-row locks,
-- 404 instead of 500 for a missing zone, indexes for the account-deletion paths, trimmed names.

-- F2: signed-in users may only rename a store, and rename or reorder a zone. Store membership and
-- ownership columns stay fixed. Column UPDATE privilege still allows `select … for no key update`.
revoke update on public.stores from authenticated;
grant update (name) on public.stores to authenticated;

revoke update on public.zones from authenticated;
grant update (name, position) on public.zones to authenticated;

-- F2 + F3: refuse a zone for a store the caller cannot see (before the unique name index can report
-- on another account's zones), and lock with `no key update` so FK checks on the store are not blocked.
create or replace function public.zones_set_position()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Lock the store row so concurrent appends and moves in this store never compute the same position.
  perform 1 from public.stores s where s.id = new.store_id for no key update;
  if not found then
    raise exception 'Store not found: %', new.store_id
      using errcode = 'PT404';
  end if;

  select coalesce(max(z.position), 0) + 1
    into new.position
    from public.zones z
   where z.store_id = new.store_id;

  return new;
end;
$$;

revoke execute on function public.zones_set_position() from public;

-- F1 + F3: PT404 makes PostgREST answer 404 rather than 500 when the zone is gone or not visible.
create or replace function public.move_zone(p_zone_id uuid, p_direction text)
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
      using errcode = 'PT404';
  end if;

  -- Same lock as zones_set_position, so moves and appends in this store run one at a time.
  perform 1 from public.stores s where s.id = v_store_id for no key update;

  -- Read the position after the lock, so a move that just committed is seen.
  select z.position into v_position from public.zones z where z.id = p_zone_id;
  if not found then
    raise exception 'Zone not found: %', p_zone_id
      using errcode = 'PT404';
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

-- F4: the cascades on account deletion look rows up by these columns.
create index zones_user_id_idx on public.zones (user_id);
create index shopping_lists_store_id_idx on public.shopping_lists (store_id);

-- F5: names are stored trimmed, so " Dairy" cannot sit next to "Dairy" and blank names are refused.
alter table public.stores add constraint stores_name_trimmed check (btrim(name) = name);
alter table public.zones add constraint zones_name_trimmed check (btrim(name) = name);
