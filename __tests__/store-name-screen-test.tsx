import { userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import StoreNameScreen from '@/app/(app)/store/name';
import type { RequestResult } from '@/lib/request';
import type { Store } from '@/lib/store';

type StoreName = Pick<Store, 'id' | 'name'>;

const mockFetchStore = jest.fn<Promise<RequestResult<Store | null>>, []>();
const mockRenameStore = jest.fn<Promise<RequestResult<StoreName>>, [string, string]>();

jest.mock('@/lib/store', () => ({
  fetchStore: () => mockFetchStore(),
  renameStore: (id: string, name: string) => mockRenameStore(id, name),
}));

const STORE: Store = { id: 'store-1', name: 'Corner shop', zones: [] };

function renderAt(initialUrl: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      'store/index': () => <Text>Store screen</Text>,
      'store/name': StoreNameScreen,
    },
    { initialUrl }
  );
}

/** Opens the name screen on top of a Store stub, as tapping "Rename store" would. */
async function openNameScreen() {
  const router = await renderAt('/store');
  await testRouter.push('/store/name');
  return router;
}

beforeEach(() => {
  mockFetchStore.mockReset();
  mockRenameStore.mockReset();
  mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
});

describe('<StoreNameScreen />', () => {
  test('the field starts with the current name', async () => {
    await openNameScreen();

    expect(await screen.findByLabelText('Store name')).toHaveDisplayValue('Corner shop');
  });

  test('Save renames the store and goes back', async () => {
    mockRenameStore.mockResolvedValue({ ok: true, data: { id: 'store-1', name: 'Market' } });
    const router = await openNameScreen();
    const user = userEvent.setup();

    const field = await screen.findByLabelText('Store name');
    await user.clear(field);
    await user.type(field, 'Market');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockRenameStore).toHaveBeenCalledWith('store-1', 'Market');
    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
  });

  test('saving offline shows that renaming needs a connection and stays', async () => {
    mockRenameStore.mockResolvedValue({ ok: false, reason: 'offline' });
    const router = await openNameScreen();

    await screen.findByLabelText('Store name');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Renaming the store needs a connection.')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store/name');
  });

  test('an empty name is refused without a request', async () => {
    await openNameScreen();
    const user = userEvent.setup();

    await user.clear(await screen.findByLabelText('Store name'));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name for your store.')).toBeOnTheScreen();
    expect(mockRenameStore).not.toHaveBeenCalled();
  });

  test('loading offline shows the offline message', async () => {
    mockFetchStore.mockResolvedValue({ ok: false, reason: 'offline' });
    await openNameScreen();

    expect(
      await screen.findByText("You're offline — your store will load when you're back online.")
    ).toBeOnTheScreen();
  });

  test('with no store it goes to the Store screen', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    // Opened directly (e.g. a reloaded web page), so the redirect is the only navigation.
    const router = await renderAt('/store/name');

    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
  });
});
