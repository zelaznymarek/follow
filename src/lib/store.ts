import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type { Tables } from '@/lib/database.types';
import { type RequestResult, run, runUnique } from '@/lib/request';
import { getSupabase } from '@/lib/supabase';

/** Longest store name; matches the database check on `stores.name`. */
export const STORE_NAME_MAX_LENGTH = 80;

/** Longest zone name; matches the database check on `zones.name`. */
export const ZONE_NAME_MAX_LENGTH = 40;

export type Zone = { id: string; name: string; position: number };

export type Store = { id: string; name: string; zones: Zone[] };

export type MoveDirection = 'up' | 'down';

type StoreName = Pick<Store, 'id' | 'name'>;

type ZoneRow = Pick<Tables<'zones'>, 'id' | 'name' | 'position'>;

const STORE_COLUMNS = 'id, name';
const ZONE_COLUMNS = 'id, name, position';

function toZone(row: ZoneRow): Zone {
  return { id: row.id, name: row.name, position: row.position };
}

function toStoreName(row: StoreName): StoreName {
  return { id: row.id, name: row.name };
}

function runStore<T, U>(
  action: string,
  query: () => PromiseLike<PostgrestSingleResponse<T>>,
  map: (data: T) => U
): Promise<RequestResult<U>> {
  return run('store', action, query, map);
}

/** The signed-in user's store with its zones in route order, or `null` when there is no store yet. */
export function fetchStore(): Promise<RequestResult<Store | null>> {
  return runStore(
    'fetchStore',
    () =>
      getSupabase()
        .from('stores')
        .select('id, name, zones(id, name, position)')
        .order('position', { referencedTable: 'zones' })
        .maybeSingle()
        // postgrest-js otherwise retries a failed GET 3 times (1 s, 2 s, 4 s) before reporting offline.
        .retry(false),
    (row) => (row ? { id: row.id, name: row.name, zones: row.zones.map(toZone) } : null)
  );
}

/** One zone, or `null` when it does not exist (or belongs to someone else). */
export function fetchZone(id: string): Promise<RequestResult<Zone | null>> {
  return runStore(
    'fetchZone',
    () => getSupabase().from('zones').select(ZONE_COLUMNS).eq('id', id).maybeSingle().retry(false),
    (row) => (row ? toZone(row) : null)
  );
}

/**
 * Creates the user's one store. `user_id` is filled by the database; a second store is refused as
 * `duplicate`.
 */
export function createStore(name: string): Promise<RequestResult<StoreName, 'duplicate'>> {
  return runUnique(
    'store',
    'createStore',
    () => getSupabase().from('stores').insert({ name: name.trim() }).select(STORE_COLUMNS).single(),
    toStoreName
  );
}

/** Renames the store. Only `name` is sent: it is the one store column the client may update. */
export function renameStore(id: string, name: string): Promise<RequestResult<StoreName>> {
  return runStore(
    'renameStore',
    () =>
      getSupabase()
        .from('stores')
        .update({ name: name.trim() })
        .eq('id', id)
        .select(STORE_COLUMNS)
        .single(),
    toStoreName
  );
}

/**
 * Appends a zone to the end of the route; the database sets `position` and `user_id`. A name that
 * matches an existing zone ignoring case is `duplicate`.
 */
export function addZone(storeId: string, name: string): Promise<RequestResult<Zone, 'duplicate'>> {
  return runUnique(
    'store',
    'addZone',
    () =>
      getSupabase()
        .from('zones')
        .insert({ store_id: storeId, name: name.trim() })
        .select(ZONE_COLUMNS)
        .single(),
    toZone
  );
}

/** Renames a zone; a name that matches another zone ignoring case is `duplicate`. */
export function renameZone(id: string, name: string): Promise<RequestResult<Zone, 'duplicate'>> {
  return runUnique(
    'store',
    'renameZone',
    () =>
      getSupabase()
        .from('zones')
        .update({ name: name.trim() })
        .eq('id', id)
        .select(ZONE_COLUMNS)
        .single(),
    toZone
  );
}

export function deleteZone(id: string): Promise<RequestResult<void>> {
  return runStore(
    'deleteZone',
    () => getSupabase().from('zones').delete().eq('id', id),
    () => undefined
  );
}

/**
 * Swaps a zone with its neighbour above or below in one database call; a no-op at either end. A zone
 * that is gone is reported as `error`.
 */
export function moveZone(id: string, direction: MoveDirection): Promise<RequestResult<void>> {
  return runStore(
    'moveZone',
    () => getSupabase().rpc('move_zone', { p_zone_id: id, p_direction: direction }),
    () => undefined
  );
}
