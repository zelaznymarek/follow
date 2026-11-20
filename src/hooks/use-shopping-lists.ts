import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { fetchLists, type ShoppingList } from '@/lib/shopping-lists';

export type ShoppingListsState = 'loading' | 'ready' | 'offline' | 'error';

export type ShoppingListsValue = {
  state: ShoppingListsState;
  lists: ShoppingList[];
  reload(): void;
};

/** The signed-in user's lists, loaded when the screen gains focus (so returning to it refreshes). */
export function useShoppingLists(): ShoppingListsValue {
  const [state, setState] = useState<ShoppingListsState>('loading');
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const latestRequest = useRef(0);

  // useFocusEffect re-runs whenever its callback changes, so both callbacks must be stable. This is
  // the hook's contract, not a performance memo (the React Compiler does not run under Jest).
  const load = useCallback(async () => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    const result = await fetchLists();
    if (request !== latestRequest.current) {
      return; // A newer load started meanwhile; its result wins.
    }
    if (result.ok) {
      setLists(result.data);
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

  return { state, lists, reload };
}
