import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { fetchStore, type Store } from '@/lib/store';

export type StoreState = 'loading' | 'ready' | 'offline' | 'error';

export type StoreValue = {
  state: StoreState;
  /**
   * The last store loaded successfully: `null` until a load succeeds, or when the user has not named a
   * store yet. It is kept during `reload()` and after a failed load, so screens decide on `state` first.
   */
  store: Store | null;
  /** Loads again behind the spinner (Retry). */
  reload(): void;
  /**
   * Loads again while the current store stays visible (after a change). Resolves once that load has
   * settled, so a screen can wait for the new data before re-enabling its controls.
   */
  refresh(): Promise<void>;
};

/** The signed-in user's store and zones, loaded when the screen gains focus. */
export function useStore(): StoreValue {
  const [state, setState] = useState<StoreState>('loading');
  const [store, setStore] = useState<Store | null>(null);
  const latestRequest = useRef(0);

  // useFocusEffect re-runs whenever its callback changes, so both callbacks must be stable. This is
  // the hook's contract, not a performance memo (the React Compiler does not run under Jest).
  const load = useCallback(async () => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    const result = await fetchStore();
    if (request !== latestRequest.current) {
      return; // A newer load started meanwhile; its result wins.
    }
    if (result.ok) {
      setStore(result.data);
      setState('ready');
    } else {
      setState(result.reason);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function reload() {
    setState('loading');
    load();
  }

  function refresh() {
    return load();
  }

  return { state, store, reload, refresh };
}
