import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Storage key of the persisted auth session; the session provider reads it for the offline rule. */
export const SUPABASE_STORAGE_KEY = 'follow-auth';

let client: SupabaseClient | undefined;

/**
 * Web output is server-rendered, where `window` and `localStorage` do not exist, so the client is
 * created on the first call in the browser. Call it from effects or event handlers only.
 */
export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() is browser-only; call it from an effect or an event handler.');
  }

  if (!client) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

    if (!url || !key) {
      throw new Error(
        'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY. Set both in .env.local (local) or the EAS environment (builds).'
      );
    }

    client = createClient(url, key, {
      auth: {
        storage: window.localStorage,
        storageKey: SUPABASE_STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}
