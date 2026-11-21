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
 * How long a request may take before the screens show the offline message. With an expired access
 * token supabase-js first awaits an auth refresh that retries for ~25 s offline before the request is
 * even sent; this deadline bounds that wait. For writes it means "we don't know whether it landed",
 * which still shows the offline message — the user can retry.
 */
export const LOAD_TIMEOUT_MS = 5000;

function timeout(ms: number): { promise: Promise<'timeout'>; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  return { promise, cancel: () => clearTimeout(timer) };
}

/**
 * Runs one query and turns its response into a result the screens can show. postgrest-js reports a
 * failed `fetch` as `status: 0` instead of throwing, so that (or the deadline) is the offline signal;
 * anything thrown — including by `map` — is a bug, logged and reported as an error.
 */
async function run<T, U>(
  action: string,
  query: () => PromiseLike<PostgrestSingleResponse<T>>,
  map: (data: T) => U
): Promise<ListsResult<U>> {
  const limit = timeout(LOAD_TIMEOUT_MS);
  try {
    const response = await Promise.race([query(), limit.promise]);
    if (response === 'timeout' || response.status === 0) {
      return OFFLINE;
    }
    if (response.error) {
      console.warn(`[shopping-lists] ${action} failed`, response.error);
      return ERROR;
    }
    return { ok: true, data: map(response.data) };
  } catch (error) {
    console.warn(`[shopping-lists] ${action} failed`, error);
    return ERROR;
  } finally {
    limit.cancel();
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
        .order('id', { ascending: false })
        // postgrest-js otherwise retries a failed GET 3 times (1 s, 2 s, 4 s) before reporting offline.
        .retry(false),
    (rows) => rows.map(toShoppingList)
  );
}

/** One list, or `null` when it does not exist (or belongs to someone else). */
export function fetchList(id: string): Promise<ListsResult<ShoppingList | null>> {
  return run(
    'fetchList',
    () =>
      getSupabase().from('shopping_lists').select(COLUMNS).eq('id', id).maybeSingle().retry(false),
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
