import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import type { Tables } from '@/lib/database.types';
import { type RequestResult, run } from '@/lib/request';
import { getSupabase } from '@/lib/supabase';

export { LOAD_TIMEOUT_MS } from '@/lib/request';

export type ShoppingList = { id: string; name: string | null; createdAt: string };

/**
 * A `RequestResult` without `duplicate`: lists have no unique names, so the S-02 screens only handle
 * offline and error.
 */
export type ListsResult<T> = { ok: true; data: T } | { ok: false; reason: 'offline' | 'error' };

type ListRow = Pick<Tables<'shopping_lists'>, 'id' | 'name' | 'created_at'>;

const COLUMNS = 'id, name, created_at';

function toShoppingList(row: ListRow): ShoppingList {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

async function runLists<T, U>(
  action: string,
  query: () => PromiseLike<PostgrestSingleResponse<T>>,
  map: (data: T) => U
): Promise<ListsResult<U>> {
  const result: RequestResult<U> = await run('shopping-lists', action, query, map);
  if (result.ok) {
    return result;
  }
  if (result.reason === 'duplicate') {
    // No list column is unique, so a unique violation here is a bug, not a user mistake.
    console.warn(`[shopping-lists] ${action} failed`, 'unexpected unique violation');
    return { ok: false, reason: 'error' };
  }
  return { ok: false, reason: result.reason };
}

/** All the signed-in user's lists, newest first. */
export function fetchLists(): Promise<ListsResult<ShoppingList[]>> {
  return runLists(
    'fetchLists',
    () =>
      getSupabase()
        .from('shopping_lists')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        // postgrest-js otherwise retries a failed GET 3 times (1 s, 2 s, 4 s) before reporting offline.
        .retry(false),
    (rows) => rows.map(toShoppingList)
  );
}

/** One list, or `null` when it does not exist (or belongs to someone else). */
export function fetchList(id: string): Promise<ListsResult<ShoppingList | null>> {
  return runLists(
    'fetchList',
    () =>
      getSupabase().from('shopping_lists').select(COLUMNS).eq('id', id).maybeSingle().retry(false),
    (row) => (row ? toShoppingList(row) : null)
  );
}

/** Creates a list; the name is trimmed and an empty name is stored as `null` (unnamed). */
export function createList(name: string | null): Promise<ListsResult<ShoppingList>> {
  const trimmed = name?.trim() || null;
  return runLists(
    'createList',
    () => getSupabase().from('shopping_lists').insert({ name: trimmed }).select(COLUMNS).single(),
    toShoppingList
  );
}

export function deleteList(id: string): Promise<ListsResult<null>> {
  return runLists(
    'deleteList',
    () => getSupabase().from('shopping_lists').delete().eq('id', id),
    () => null
  );
}
