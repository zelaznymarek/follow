import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type { Tables } from '@/lib/database.types';
import { getSupabase } from '@/lib/supabase';

export type ShoppingList = { id: string; name: string | null; createdAt: string };

export type ListsResult<T> = { ok: true; data: T } | { ok: false; reason: 'offline' | 'error' };

type ListRow = Pick<Tables<'shopping_lists'>, 'id' | 'name' | 'created_at'>;

const COLUMNS = 'id, name, created_at';

const OFFLINE = { ok: false, reason: 'offline' } as const;
const ERROR = { ok: false, reason: 'error' } as const;

function toShoppingList(row: ListRow): ShoppingList {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

/**
 * Runs one query and turns its response into a result the screens can show. postgrest-js reports a
 * failed `fetch` as `status: 0` instead of throwing, so that is the offline signal.
 */
async function run<T, U>(
  action: string,
  query: () => PromiseLike<PostgrestSingleResponse<T>>,
  map: (data: T) => U
): Promise<ListsResult<U>> {
  try {
    const response = await query();
    if (response.status === 0) {
      return OFFLINE;
    }
    if (response.error) {
      console.warn(`[shopping-lists] ${action} failed`, response.error);
      return ERROR;
    }
    return { ok: true, data: map(response.data) };
  } catch (error) {
    // `fetch` rejects with a TypeError when the network is unreachable.
    if (error instanceof TypeError) {
      return OFFLINE;
    }
    console.warn(`[shopping-lists] ${action} failed`, error);
    return ERROR;
  }
}

/** All the signed-in user's lists, newest first. */
export function fetchLists(): Promise<ListsResult<ShoppingList[]>> {
  return run(
    'fetchLists',
    () =>
      getSupabase()
        .from('shopping_lists')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }),
    (rows) => rows.map(toShoppingList)
  );
}

/** One list, or `null` when it does not exist (or belongs to someone else). */
export function fetchList(id: string): Promise<ListsResult<ShoppingList | null>> {
  return run(
    'fetchList',
    () => getSupabase().from('shopping_lists').select(COLUMNS).eq('id', id).maybeSingle(),
    (row) => (row ? toShoppingList(row) : null)
  );
}

/** Creates a list; the name is trimmed and an empty name is stored as `null` (unnamed). */
export function createList(name: string | null): Promise<ListsResult<ShoppingList>> {
  const trimmed = name?.trim() || null;
  return run(
    'createList',
    () => getSupabase().from('shopping_lists').insert({ name: trimmed }).select(COLUMNS).single(),
    toShoppingList
  );
}

export function deleteList(id: string): Promise<ListsResult<null>> {
  return run(
    'deleteList',
    () => getSupabase().from('shopping_lists').delete().eq('id', id),
    () => null
  );
}
