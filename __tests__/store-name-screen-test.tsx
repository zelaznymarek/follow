import { userEvent } from '@testing-library/react-native';
import { router as expoRouter, Stack } from 'expo-router';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as StoreLayout from '@/app/(app)/store/_layout';
import StoreNameScreen from '@/app/(app)/store/name';
import type { RequestResult } from '@/lib/request';
import type { Store } from '@/lib/store';

type StoreName = Pick<Store, 'id' | 'name'>;

const mockFetchStore = jest.fn<Promise<RequestResult<Store | null>>, []>();
const mockRenameStore = jest.fn<Promise<RequestResult<StoreName>>, [string, string]>();

jest.mock('@/lib/store', () => ({
  STORE_NAME_MAX_LENGTH: 80,
  fetchStore: () => mockFetchStore(),
  renameStore: (id: string, name: string) => mockRenameStore(id, name),
}));

const STORE: Store = { id: 'store-1', name: 'Corner shop', zones: [] };

const OFFLINE_LOAD = "You're offline — your store will load when you're back online.";

function renderAt(initialUrl: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      'store/index': () => <Text>Store screen</Text>,
      'store/name': StoreNameScreen,
      'store/other': () => <Text>Other screen</Text>,
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

/** A request failure is an assertive alert, apart from the field's polite validation error. */
function expectAssertiveAlert(message: string) {
  const alert = screen.getByText(message);
  expect(alert).toHaveProp('accessibilityRole', 'alert');
  expect(alert).toHaveProp('accessibilityLiveRegion', 'assertive');
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

  test('Save opened directly (nothing to go back to) replaces it with the Store screen', async () => {
    mockRenameStore.mockResolvedValue({ ok: true, data: { id: 'store-1', name: 'Market' } });
    const router = await renderAt('/store/name');

    await screen.findByLabelText('Store name');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
    expect(expoRouter.canGoBack()).toBe(false);
  });

  test.each([
    ['offline', 'Renaming the store needs a connection.'],
    ['error', "Couldn't rename the store. Try again."],
  ] as const)('saving %s shows an alert and stays', async (reason, message) => {
    mockRenameStore.mockResolvedValue({ ok: false, reason });
    const router = await openNameScreen();

    await screen.findByLabelText('Store name');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expectAssertiveAlert(message);
    expect(router.getPathname()).toBe('/store/name');
  });

  test('an empty name is refused without a request, and typing clears the error', async () => {
    await openNameScreen();
    const user = userEvent.setup();

    await user.clear(await screen.findByLabelText('Store name'));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a name for your store.')).toBeOnTheScreen();
    expect(mockRenameStore).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Store name'), 'M');
    expect(screen.queryByText('Enter a name for your store.')).not.toBeOnTheScreen();
  });

  test('loading offline shows the offline message and Retry loads the store', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    await openNameScreen();

    expect(await screen.findByText(OFFLINE_LOAD)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByLabelText('Store name')).toHaveDisplayValue('Corner shop');
    expect(mockFetchStore).toHaveBeenCalledTimes(2);
  });

  test('a load error shows the error message with Retry', async () => {
    mockFetchStore.mockResolvedValue({ ok: false, reason: 'error' });
    await openNameScreen();

    expect(await screen.findByText("Couldn't load your store.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Store name')).not.toBeOnTheScreen();
  });

  test('a failed reload keeps the edited name on screen, with Retry', async () => {
    await openNameScreen();
    const user = userEvent.setup();
    const field = await screen.findByLabelText('Store name');
    await user.clear(field);
    await user.type(field, 'Mark');

    // Leaving and coming back reloads on focus; that reload fails.
    await testRouter.push('/store/other');
    mockFetchStore.mockResolvedValue({ ok: false, reason: 'offline' });
    await testRouter.back();

    expect(await screen.findByText(OFFLINE_LOAD)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Store name')).toHaveDisplayValue('Mark');
  });

  test('with no store, opened directly, it goes to the Store screen', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    // Opened directly under a plain stack, there is nothing to go back to: it replaces itself.
    const router = await renderAt('/store/name');

    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
    expect(expoRouter.canGoBack()).toBe(false);
  });

  test('with no store under the real store layout, it leaves to one Store screen', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    // The real layout anchors `index` under a deep-linked `/store/name`, so the stack starts as
    // [index, name]; leaving must not end as [index, index].
    const router = await renderRouter(
      {
        'store/_layout': StoreLayout,
        'store/index': () => <Text>Store screen</Text>,
        'store/name': StoreNameScreen,
        'store/zones/[id]': () => <Text>Zone screen</Text>,
      },
      { initialUrl: '/store/name' }
    );

    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
    expect(expoRouter.canGoBack()).toBe(false);
  });
});
