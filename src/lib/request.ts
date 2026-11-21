import type { PostgrestSingleResponse } from '@supabase/supabase-js';

/**
 * What a data-module call reports to a screen. `duplicate` is a unique-constraint violation (Postgres
 * 23505), e.g. a zone name that already exists in the store; it is an expected outcome, not a bug.
 */
export type RequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'offline' | 'error' | 'duplicate' };

/**
 * How long a request may take before the screens show the offline message. With an expired access
 * token supabase-js first awaits an auth refresh that retries for ~25 s offline before the request is
 * even sent; this deadline bounds that wait. For writes it means "we don't know whether it landed",
 * which still shows the offline message — the user can retry.
 */
export const LOAD_TIMEOUT_MS = 5000;

const OFFLINE = { ok: false, reason: 'offline' } as const;
const ERROR = { ok: false, reason: 'error' } as const;
const DUPLICATE = { ok: false, reason: 'duplicate' } as const;

/** Postgres `unique_violation`. */
const UNIQUE_VIOLATION = '23505';

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
 * a unique violation is `duplicate`; any other error, or anything thrown — including by `map` — is a
 * bug, logged under `[tag]` and reported as an error.
 */
export async function run<T, U>(
  tag: string,
  action: string,
  query: () => PromiseLike<PostgrestSingleResponse<T>>,
  map: (data: T) => U
): Promise<RequestResult<U>> {
  const limit = timeout(LOAD_TIMEOUT_MS);
  try {
    const response = await Promise.race([query(), limit.promise]);
    if (response === 'timeout' || response.status === 0) {
      return OFFLINE;
    }
    if (response.error) {
      if (response.error.code === UNIQUE_VIOLATION) {
        return DUPLICATE;
      }
      console.warn(`[${tag}] ${action} failed`, response.error);
      return ERROR;
    }
    return { ok: true, data: map(response.data) };
  } catch (error) {
    console.warn(`[${tag}] ${action} failed`, error);
    return ERROR;
  } finally {
    limit.cancel();
  }
}
