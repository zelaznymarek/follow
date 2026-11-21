import { act } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { type StoreValue, useStore } from '@/hooks/use-store';
import type { RequestResult } from '@/lib/request';
import type { Store } from '@/lib/store';

type FetchResult = RequestResult<Store | null>;

const mockFetchStore = jest.fn<Promise<FetchResult>, []>();

jest.mock('@/lib/store', () => ({
  fetchStore: () => mockFetchStore(),
}));

function deferred() {
  let resolve!: (value: FetchResult) => void;
  const promise = new Promise<FetchResult>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

const STORE: Store = {
  id: 'store-1',
  name: 'Corner shop',
  zones: [{ id: 'zone-1', name: 'Dairy', position: 1 }],
};

let value: StoreValue;

function Probe() {
  value = useStore();
  return (
    <Text testID="store">
      {value.state}|{value.store?.name ?? 'none'}
    </Text>
  );
}

async function renderHookScreen() {
  await renderRouter({ index: Probe });
}

function shown() {
  return screen.getByTestId('store').props.children.join('');
}

beforeEach(() => {
  mockFetchStore.mockReset();
});

describe('useStore', () => {
  test('starts loading and becomes ready with the store', async () => {
    const first = deferred();
    mockFetchStore.mockReturnValueOnce(first.promise);
    await renderHookScreen();

    expect(shown()).toBe('loading|none');

    await act(async () => first.resolve({ ok: true, data: STORE }));

    expect(shown()).toBe('ready|Corner shop');
  });

  test('ready with no store when the user has not named one', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: null });
    await renderHookScreen();

    expect(await screen.findByText('ready|none')).toBeOnTheScreen();
  });

  test('reports offline', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    await renderHookScreen();

    expect(await screen.findByText('offline|none')).toBeOnTheScreen();
  });

  test('refresh() keeps the current store visible while it reloads', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: STORE });
    await renderHookScreen();
    expect(await screen.findByText('ready|Corner shop')).toBeOnTheScreen();

    const next = deferred();
    mockFetchStore.mockReturnValueOnce(next.promise);
    await act(async () => value.refresh());

    expect(shown()).toBe('ready|Corner shop');

    await act(async () => next.resolve({ ok: true, data: { ...STORE, name: 'Market' } }));

    expect(shown()).toBe('ready|Market');
    expect(mockFetchStore).toHaveBeenCalledTimes(2);
  });

  test('reload() shows loading again', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    await renderHookScreen();
    expect(await screen.findByText('offline|none')).toBeOnTheScreen();

    const next = deferred();
    mockFetchStore.mockReturnValueOnce(next.promise);
    await act(async () => value.reload());

    expect(shown()).toBe('loading|none');

    await act(async () => next.resolve({ ok: true, data: STORE }));

    expect(shown()).toBe('ready|Corner shop');
  });

  test('a stale response is discarded when a newer load answers first', async () => {
    const stale = deferred();
    const fresh = deferred();
    mockFetchStore.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    await renderHookScreen();

    await act(async () => value.refresh());
    await act(async () => fresh.resolve({ ok: true, data: { ...STORE, name: 'Market' } }));
    await act(async () => stale.resolve({ ok: true, data: STORE }));

    expect(shown()).toBe('ready|Market');
  });
});
