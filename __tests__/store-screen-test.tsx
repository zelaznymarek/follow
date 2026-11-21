import { act, userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
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
  fetchStore: () => mockFetchStore(),
  createStore: (name: string) => mockCreateStore(name),
  addZone: (storeId: string, name: string) => mockAddZone(storeId, name),
  moveZone: (id: string, direction: MoveDirection) => mockMoveZone(id, direction),
}));

const DAIRY: Zone = { id: 'zone-1', name: 'Dairy', position: 1 };
const BAKERY: Zone = { id: 'zone-2', name: 'Bakery', position: 2 };
const PRODUCE: Zone = { id: 'zone-3', name: 'Produce', position: 3 };

const STORE: Store = { id: 'store-1', name: 'Corner shop', zones: [DAIRY, BAKERY, PRODUCE] };

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
  const names = await screen.findAllByText(/^(Dairy|Bakery|Produce)$/);
  return names.map((node) => node.props.children);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mockFetchStore.mockReset();
  mockCreateStore.mockReset();
  mockAddZone.mockReset();
  mockMoveZone.mockReset();
});

describe('<StoreScreen />', () => {
  test('with no store, an empty name is refused and a name creates the store', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: null });
    mockCreateStore.mockResolvedValue({ ok: true, data: { id: 'store-1', name: 'Corner shop' } });
    await renderScreen();
    const user = userEvent.setup();

    expect(await screen.findByText('Name your store')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a name for your store.')).toBeOnTheScreen();
    expect(mockCreateStore).not.toHaveBeenCalled();

    mockFetchStore.mockResolvedValueOnce({ ok: true, data: { ...STORE, zones: [] } });
    await user.type(screen.getByLabelText('Store name'), 'Corner shop');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockCreateStore).toHaveBeenCalledWith('Corner shop');
    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
    expect(screen.getByText('No zones yet')).toBeOnTheScreen();
    expect(screen.queryByText('Name your store')).not.toBeOnTheScreen();
  });

  test('a store created elsewhere meanwhile is reported and shown', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: null });
    mockCreateStore.mockResolvedValue({ ok: false, reason: 'duplicate' });
    await renderScreen();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Store name'), 'Market');
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: STORE });
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('This account already has a store.')).toBeOnTheScreen();
    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
  });

  test('lists zones in route order with the edge arrows disabled', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
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
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: STORE });
    mockMoveZone.mockResolvedValue({ ok: true, data: undefined });
    await renderScreen();
    await zoneNamesShown();

    mockFetchStore.mockResolvedValueOnce({
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

  test('every move button is disabled while a move is in flight', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
    const move = deferred<RequestResult<void>>();
    mockMoveZone.mockReturnValue(move.promise);
    await renderScreen();
    await zoneNamesShown();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Move Produce up' }));

    for (const name of ['Dairy', 'Bakery', 'Produce']) {
      expect(screen.getByRole('button', { name: `Move ${name} up` })).toBeDisabled();
      expect(screen.getByRole('button', { name: `Move ${name} down` })).toBeDisabled();
    }

    await act(async () => move.resolve({ ok: true, data: undefined }));

    expect(screen.getByRole('button', { name: 'Move Produce up' })).toBeEnabled();
    expect(mockMoveZone).toHaveBeenCalledTimes(1);
  });

  test('a failed move shows a message', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
    mockMoveZone.mockResolvedValue({ ok: false, reason: 'offline' });
    await renderScreen();
    await zoneNamesShown();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Move Dairy down' }));

    expect(await screen.findByText('Moving a zone needs a connection.')).toBeOnTheScreen();
  });

  test('a zone row opens the zone', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
    const router = await renderScreen();

    await userEvent.setup().press(await screen.findByText('Bakery'));

    expect(await screen.findByText('Zone screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store/zones/zone-2');
  });

  test('Rename store opens the store name screen', async () => {
    mockFetchStore.mockResolvedValue({ ok: true, data: STORE });
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
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: STORE });
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
    expect(await screen.findByText('A zone with this name already exists')).toBeOnTheScreen();
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('dairy');

    const FROZEN: Zone = { id: 'zone-4', name: 'Frozen', position: 4 };
    mockAddZone.mockResolvedValueOnce({ ok: true, data: FROZEN });
    mockFetchStore.mockResolvedValueOnce({
      ok: true,
      data: { ...STORE, zones: [...STORE.zones, FROZEN] },
    });
    await user.clear(screen.getByLabelText('New zone'));
    expect(screen.queryByText('A zone with this name already exists')).not.toBeOnTheScreen();
    await user.type(screen.getByLabelText('New zone'), 'Frozen');
    await user.press(screen.getByRole('button', { name: 'Add' }));

    expect(mockAddZone).toHaveBeenLastCalledWith('store-1', 'Frozen');
    expect(await screen.findByText('Frozen')).toBeOnTheScreen();
    // Stays open, empty, for the next zone.
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('');
  });

  test('Cancel closes the add-zone field and drops its text and error', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: STORE });
    await renderScreen();
    const user = userEvent.setup();
    await zoneNamesShown();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    mockAddZone.mockResolvedValueOnce({ ok: false, reason: 'duplicate' });
    await user.type(screen.getByLabelText('New zone'), 'dairy');
    await user.press(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByText('A zone with this name already exists')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('New zone')).not.toBeOnTheScreen();
    expect(screen.queryByText('A zone with this name already exists')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Add zone' }));
    expect(screen.getByLabelText('New zone')).toHaveDisplayValue('');
  });

  test('offline shows the offline message and Retry loads again', async () => {
    mockFetchStore.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    mockFetchStore.mockResolvedValueOnce({ ok: true, data: STORE });
    await renderScreen();

    expect(
      await screen.findByText("You're offline — your store will load when you're back online.")
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Corner shop')).toBeOnTheScreen();
    expect(mockFetchStore).toHaveBeenCalledTimes(2);
  });
});
