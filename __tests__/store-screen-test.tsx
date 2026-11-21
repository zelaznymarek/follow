import { act, userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import StoreScreen from '@/app/(app)/store/index';
import type { RequestResult } from '@/lib/request';
import type { MoveDirection, Store, Zone } from '@/lib/store';

type StoreName = Pick<Store, 'id' | 'name'>;

const mockFetchStore = jest.fn<Promise<RequestResult<Store | null>>, []>();
const mockCreateStore = jest.fn<Promise<RequestResult<StoreName, 'duplicate'>>, [string]>();
const mockAddZone = jest.fn<Promise<RequestResult<Zone, 'duplicate'>>, [string, string]>();
const mockMoveZone = jest.fn<Promise<RequestResult<void>>, [string, MoveDirection]>();

jest.mock('@/lib/store', () => ({
  STORE_NAME_MAX_LENGTH: 80,
  ZONE_NAME_MAX_LENGTH: 40,
  fetchStore: () => mockFetchStore(),
  createStore: (name: string) => mockCreateStore(name),
  addZone: (storeId: string, name: string) => mockAddZone(storeId, name),
  moveZone: (id: string, direction: MoveDirection) => mockMoveZone(id, direction),
}));

const DAIRY: Zone = { id: 'zone-1', name: 'Dairy', position: 1 };
const BAKERY: Zone = { id: 'zone-2', name: 'Bakery', position: 2 };
const PRODUCE: Zone = { id: 'zone-3', name: 'Produce', position: 3 };
const FROZEN: Zone = { id: 'zone-4', name: 'Frozen', position: 4 };

const STORE: Store = { id: 'store-1', name: 'Corner shop', zones: [DAIRY, BAKERY, PRODUCE] };

const OFFLINE_LOAD = "You're offline — your store will load when you're back online.";
const ERROR_LOAD = "Couldn't load your store.";
const STORE_EXISTS = 'Your store was already set up, so here it is.';
const DUPLICATE_ZONE = 'A zone with this name already exists.';

async function renderScreen() {
  return renderRouter(
    {
      _layout: () => <Stack />,
      'store/index': StoreScreen,
      'store/name': () => <Text>Store name screen</Text>,
      'store/zones/[id]': () => <Text>Zone screen</Text>,
    },
    { initialUrl: '/store' }
  );
}

async function zoneNamesShown() {
  const names = await screen.findAllByText(/^(Dairy|Bakery|Produce|Frozen)$/);
  return names.map((node) => node.props.children);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

/** A request failure is an assertive alert, apart from the field's polite validation error. */
function expectAssertiveAlert(message: string) {
  const alert = screen.getByText(message);
  expect(alert).toHaveProp('accessibilityRole', 'alert');
  expect(alert).toHaveProp('accessibilityLiveRegion', 'assertive');
}

beforeEach(() => {
  mockFetchStore.mockReset();
  mockCreateStore.mockReset();
  mockAddZone.mockReset();
  mockMoveZone.mockReset();
  // Every load answers with the store unless a test says otherwise, so an extra focus load is harmless.
  mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
  mockMoveZone.mockResolvedValue({ ok: true, data: undefined });
});

describe('<StoreScreen />', () => {
  test('with no store, an empty name is refused and a name creates the store', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    mockCreateStore.mockResolvedValue({ ok: true, data: { id: 'store-1', name: 'Corner shop' } });
    await renderScreen();
    const user = userEvent.setup();

    expect(await screen.findByText('Name your store')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a name for your store.')).toBeOnTheScreen();
    expect(mockCreateStore).not.toHaveBeenCalled();

    mockFetchStore.mockResolvedValue({ ok: true, data: { ...STORE, zones: [] } });
    await user.type(screen.getByLabelText('Store name'), 'Corner shop');
    expect(screen.queryByText('Enter a name for your store.')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockCreateStore).toHaveBeenCalledWith('Corner shop');
    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
    expect(screen.getByText('No zones yet')).toBeOnTheScreen();
    expect(screen.queryByText('Name your store')).not.toBeOnTheScreen();
  });

  test.each([
    ['offline', 'Naming your store needs a connection.'],
    ['error', "Couldn't save the store. Try again."],
  ] as const)(
    'creating the store %s shows an alert and keeps the name',
    async (reason, message) => {
      mockFetchStore.mockResolvedValue({ ok: true, data: null });
      mockCreateStore.mockResolvedValue({ ok: false, reason });
      await renderScreen();
      const user = userEvent.setup();

      await user.type(await screen.findByLabelText('Store name'), 'Corner shop');
      await user.press(screen.getByRole('button', { name: 'Save' }));

      expect(await screen.findByText(message)).toBeOnTheScreen();
      expectAssertiveAlert(message);
      expect(screen.getByLabelText('Store name')).toHaveDisplayValue('Corner shop');
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    }
  );

  test('a store created elsewhere meanwhile is reported and shown', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    mockCreateStore.mockResolvedValue({ ok: false, reason: 'duplicate' });
    await renderScreen();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Store name'), 'Market');
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(STORE_EXISTS)).toBeOnTheScreen();
    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
  });

  test.each([
    ['a move', 'Move Dairy down'],
    ['opening Add zone', 'Add zone'],
  ])('the store-exists notice goes away on the next action (%s)', async (_action, button) => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    mockCreateStore.mockResolvedValue({ ok: false, reason: 'duplicate' });
    await renderScreen();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Store name'), 'Market');
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(STORE_EXISTS)).toBeOnTheScreen();
    await zoneNamesShown();

    await user.press(screen.getByRole('button', { name: button }));

    expect(screen.queryByText(STORE_EXISTS)).not.toBeOnTheScreen();
  });

  test('the store-exists notice goes away when the screen loses focus', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: null });
    mockCreateStore.mockResolvedValue({ ok: false, reason: 'duplicate' });
    await renderScreen();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Store name'), 'Market');
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(STORE_EXISTS)).toBeOnTheScreen();

    await testRouter.push('/store/name');
    await testRouter.back();

    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
    expect(screen.queryByText(STORE_EXISTS)).not.toBeOnTheScreen();
  });

  test('lists zones in route order with the edge arrows disabled', async () => {
    await renderScreen();

    expect(await zoneNamesShown()).toEqual(['Dairy', 'Bakery', 'Produce']);
    expect(screen.getByRole('button', { name: 'Move Dairy up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Dairy down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Bakery up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Bakery down' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Produce up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Produce down' })).toBeDisabled();
  });

  test('Move up calls moveZone and shows the refreshed order', async () => {
    await renderScreen();
    await zoneNamesShown();

    mockFetchStore.mockResolvedValue({
      ok: true,
      data: {
        ...STORE,
        zones: [{ ...BAKERY, position: 1 }, { ...DAIRY, position: 2 }, PRODUCE],
      },
    });
    await userEvent.setup().press(screen.getByRole('button', { name: 'Move Bakery up' }));

    expect(mockMoveZone).toHaveBeenCalledWith('zone-2', 'up');
    expect(await screen.findByRole('button', { name: 'Move Bakery up' })).toBeDisabled();
    expect(await zoneNamesShown()).toEqual(['Bakery', 'Dairy', 'Produce']);
  });

  test('every move button stays disabled until the refreshed order arrives', async () => {
    const move = deferred<RequestResult<void>>();
    mockMoveZone.mockReturnValue(move.promise);
    await renderScreen();
    await zoneNamesShown();

    function expectAllArrowsDisabled() {
      for (const name of ['Dairy', 'Bakery', 'Produce']) {
        expect(screen.getByRole('button', { name: `Move ${name} up` })).toBeDisabled();
        expect(screen.getByRole('button', { name: `Move ${name} down` })).toBeDisabled();
      }
    }

    await userEvent.setup().press(screen.getByRole('button', { name: 'Move Produce up' }));
    expectAllArrowsDisabled();

    const reloaded = deferred<RequestResult<Store | null>>();
    mockFetchStore.mockReturnValueOnce(reloaded.promise);
    await act(async () => move.resolve({ ok: true, data: undefined }));

    // The move landed but the new order has not: the old order must not take another move.
    expectAllArrowsDisabled();

    await act(async () =>
      reloaded.resolve({
        ok: true,
        data: { ...STORE, zones: [DAIRY, { ...PRODUCE, position: 2 }, { ...BAKERY, position: 3 }] },
      })
    );

    expect(await zoneNamesShown()).toEqual(['Dairy', 'Produce', 'Bakery']);
    expect(screen.getByRole('button', { name: 'Move Produce up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move Bakery down' })).toBeDisabled();
    expect(mockMoveZone).toHaveBeenCalledTimes(1);
  });

  test('a failed move shows a message', async () => {
    mockMoveZone.mockResolvedValue({ ok: false, reason: 'offline' });
    await renderScreen();
    await zoneNamesShown();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Move Dairy down' }));

    expect(await screen.findByText('Moving a zone needs a connection.')).toBeOnTheScreen();
    expectAssertiveAlert('Moving a zone needs a connection.');
  });

  test('a failed move reloads, so a zone deleted elsewhere disappears', async () => {
    mockMoveZone.mockResolvedValue({ ok: false, reason: 'error' });
    await renderScreen();
    await zoneNamesShown();

    mockFetchStore.mockResolvedValue({ ok: true, data: { ...STORE, zones: [DAIRY, PRODUCE] } });
    await userEvent.setup().press(screen.getByRole('button', { name: 'Move Bakery up' }));

    expect(await screen.findByText("Couldn't move the zone. Try again.")).toBeOnTheScreen();
    expect(await zoneNamesShown()).toEqual(['Dairy', 'Produce']);
    expect(mockFetchStore).toHaveBeenCalledTimes(2);
  });

  test('a zone row opens the zone', async () => {
    const router = await renderScreen();

    await userEvent.setup().press(await screen.findByText('Bakery'));

    expect(await screen.findByText('Zone screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store/zones/zone-2');
  });

  test('Rename store opens the store name screen', async () => {
    const router = await renderScreen();

    await userEvent.setup().press(await screen.findByText('Rename store'));

    expect(await screen.findByText('Store name screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store/name');
  });

  test('no zones yet', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: { ...STORE, zones: [] } });
    await renderScreen();

    expect(await screen.findByText('No zones yet')).toBeOnTheScreen();
  });

  test('Add zone opens the field; an empty or duplicate name is refused, then a name is added', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    expect(screen.queryByLabelText('New zone')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Add zone' }));

    await user.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Enter a zone name.')).toBeOnTheScreen();
    expect(mockAddZone).not.toHaveBeenCalled();

    mockAddZone.mockResolvedValueOnce({ ok: false, reason: 'duplicate' });
    await user.type(screen.getByLabelText('New zone'), 'dairy');
    expect(screen.queryByText('Enter a zone name.')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText(DUPLICATE_ZONE)).toBeOnTheScreen();
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('dairy');

    mockAddZone.mockResolvedValueOnce({ ok: true, data: FROZEN });
    mockFetchStore.mockResolvedValue({
      ok: true,
      data: { ...STORE, zones: [...STORE.zones, FROZEN] },
    });
    await user.clear(screen.getByLabelText('New zone'));
    expect(screen.queryByText(DUPLICATE_ZONE)).not.toBeOnTheScreen();
    await user.type(screen.getByLabelText('New zone'), 'Frozen');
    await user.press(screen.getByRole('button', { name: 'Add' }));

    expect(mockAddZone).toHaveBeenLastCalledWith('store-1', 'Frozen');
    expect(await screen.findByText('Frozen')).toBeOnTheScreen();
    // Stays open, empty, for the next zone.
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('');
  });

  test.each([
    ['offline', 'Adding a zone needs a connection.'],
    ['error', "Couldn't add the zone. Try again."],
  ] as const)('adding a zone %s shows an alert and keeps the name', async (reason, message) => {
    mockAddZone.mockResolvedValue({ ok: false, reason });
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    await user.type(screen.getByLabelText('New zone'), 'Frozen');
    await user.press(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expectAssertiveAlert(message);
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('Frozen');
  });

  test('a duplicate zone name reloads, so a zone that landed after a timeout appears', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    mockAddZone.mockResolvedValueOnce({ ok: false, reason: 'duplicate' });
    mockFetchStore.mockResolvedValue({
      ok: true,
      data: { ...STORE, zones: [...STORE.zones, FROZEN] },
    });
    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    await user.type(screen.getByLabelText('New zone'), 'Frozen');
    await user.press(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText(DUPLICATE_ZONE)).toBeOnTheScreen();
    expect(await screen.findByText('Frozen')).toBeOnTheScreen();
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('Frozen');
    expect(mockFetchStore).toHaveBeenCalledTimes(2);
  });

  test('Cancel closes the add-zone field and drops its text and error', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    mockAddZone.mockResolvedValueOnce({ ok: false, reason: 'duplicate' });
    await user.type(screen.getByLabelText('New zone'), 'dairy');
    await user.press(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText(DUPLICATE_ZONE)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('New zone')).not.toBeOnTheScreen();
    expect(screen.queryByText(DUPLICATE_ZONE)).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('');
  });

  test('offline shows the offline message and Retry loads again', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    await renderScreen();

    expect(await screen.findByText(OFFLINE_LOAD)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
    expect(mockFetchStore).toHaveBeenCalledTimes(2);
  });

  test('a failed reload after a move keeps the store and the typed zone name, with Retry', async () => {
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    await user.type(screen.getByLabelText('New zone'), 'Froz');
    mockFetchStore.mockResolvedValue({ ok: false, reason: 'offline' });
    await user.press(screen.getByRole('button', { name: 'Move Dairy down' }));

    expect(await screen.findByText(OFFLINE_LOAD)).toBeOnTheScreen();
    expect(await zoneNamesShown()).toEqual(['Dairy', 'Bakery', 'Produce']);
    expect(screen.getByText('Corner shop')).toBeOnTheScreen();
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('Froz');

    mockFetchStore.mockResolvedValue({
      ok: true,
      data: { ...STORE, zones: [BAKERY, DAIRY, PRODUCE] },
    });
    await user.press(screen.getByRole('button', { name: 'Retry' }));

    expect(await zoneNamesShown()).toEqual(['Bakery', 'Dairy', 'Produce']);
    expect(screen.queryByText(OFFLINE_LOAD)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('Froz');
  });

  test('a failed reload after an add keeps the store and the open field, with Retry', async () => {
    mockAddZone.mockResolvedValue({ ok: true, data: FROZEN });
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    await user.type(screen.getByLabelText('New zone'), 'Frozen');
    mockFetchStore.mockResolvedValue({ ok: false, reason: 'error' });
    await user.press(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText(ERROR_LOAD)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    expect(screen.getByText('Corner shop')).toBeOnTheScreen();
    expect(await zoneNamesShown()).toEqual(['Dairy', 'Bakery', 'Produce']);
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('');
  });
});
