import { userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton, Text } from 'react-native';

import ZoneScreen from '@/app/(app)/store/zones/[id]';
import type { RequestResult } from '@/lib/request';
import type { Zone } from '@/lib/store';

const mockFetchZone = jest.fn<Promise<RequestResult<Zone | null>>, [string]>();
const mockRenameZone = jest.fn<Promise<RequestResult<Zone, 'duplicate'>>, [string, string]>();
const mockDeleteZone = jest.fn<Promise<RequestResult<void>>, [string]>();

jest.mock('@/lib/store', () => ({
  fetchZone: (id: string) => mockFetchZone(id),
  renameZone: (id: string, name: string) => mockRenameZone(id, name),
  deleteZone: (id: string) => mockDeleteZone(id),
}));

const ZONE: Zone = { id: 'zone-2', name: 'Bakery', position: 2 };

/** Opens the zone on top of a Store stub, as tapping a zone row would. */
async function openZone() {
  const router = await renderRouter(
    {
      _layout: () => <Stack />,
      'store/index': () => <Text>Store screen</Text>,
      'store/zones/[id]': ZoneScreen,
    },
    { initialUrl: '/store' }
  );
  await testRouter.push('/store/zones/zone-2');
  return router;
}

/** Answers the next confirmation dialog by pressing the button with this text. */
function answerConfirmation(answer: 'Cancel' | 'Delete') {
  jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === answer)?.onPress?.();
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
  mockFetchZone.mockReset();
  mockRenameZone.mockReset();
  mockDeleteZone.mockReset();
  mockFetchZone.mockResolvedValue({ ok: true, data: ZONE });
  mockDeleteZone.mockResolvedValue({ ok: true, data: undefined });
});

describe('<ZoneScreen />', () => {
  test('the field starts with the zone name', async () => {
    await openZone();

    expect(await screen.findByLabelText('Zone name')).toHaveDisplayValue('Bakery');
    expect(mockFetchZone).toHaveBeenCalledWith('zone-2');
  });

  test('a duplicate name shows the field error and stays', async () => {
    mockRenameZone.mockResolvedValue({ ok: false, reason: 'duplicate' });
    const router = await openZone();
    const user = userEvent.setup();

    const field = await screen.findByLabelText('Zone name');
    await user.clear(field);
    await user.type(field, 'dairy');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockRenameZone).toHaveBeenCalledWith('zone-2', 'dairy');
    expect(await screen.findByText('A zone with this name already exists')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store/zones/zone-2');
  });

  test('Save renames the zone and goes back', async () => {
    mockRenameZone.mockResolvedValue({ ok: true, data: { ...ZONE, name: 'Bread' } });
    const router = await openZone();
    const user = userEvent.setup();

    const field = await screen.findByLabelText('Zone name');
    await user.clear(field);
    await user.type(field, 'Bread');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
  });

  test('Delete calls deleteZone only after the confirmation is accepted, then goes back', async () => {
    const router = await openZone();
    const user = userEvent.setup();
    await screen.findByLabelText('Zone name');

    answerConfirmation('Cancel');
    await user.press(screen.getByRole('button', { name: 'Delete zone' }));
    expect(mockDeleteZone).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Zone name')).toBeOnTheScreen();

    answerConfirmation('Delete');
    await user.press(screen.getByRole('button', { name: 'Delete zone' }));

    expect(mockDeleteZone).toHaveBeenCalledTimes(1);
    expect(mockDeleteZone).toHaveBeenCalledWith('zone-2');
    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
  });

  test('a missing zone says it no longer exists', async () => {
    mockFetchZone.mockResolvedValue({ ok: true, data: null });
    await openZone();

    expect(await screen.findByText('This zone no longer exists.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeOnTheScreen();
  });

  test('loading offline shows the offline message and Retry loads the zone', async () => {
    mockFetchZone.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    await openZone();

    expect(
      await screen.findByText("You're offline — this zone will load when you're back online.")
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByLabelText('Zone name')).toHaveDisplayValue('Bakery');
    expect(mockFetchZone).toHaveBeenCalledTimes(2);
  });
});
