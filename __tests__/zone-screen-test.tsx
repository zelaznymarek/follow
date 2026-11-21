import { userEvent } from '@testing-library/react-native';
import { router as expoRouter, Stack } from 'expo-router';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton, Text } from 'react-native';

import ZoneScreen from '@/app/(app)/store/zones/[id]';
import type { RequestResult } from '@/lib/request';
import type { Zone } from '@/lib/store';

const mockFetchZone = jest.fn<Promise<RequestResult<Zone | null>>, [string]>();
const mockRenameZone = jest.fn<Promise<RequestResult<Zone, 'duplicate'>>, [string, string]>();
const mockDeleteZone = jest.fn<Promise<RequestResult<void>>, [string]>();

jest.mock('@/lib/store', () => ({
  ZONE_NAME_MAX_LENGTH: 40,
  fetchZone: (id: string) => mockFetchZone(id),
  renameZone: (id: string, name: string) => mockRenameZone(id, name),
  deleteZone: (id: string) => mockDeleteZone(id),
}));

const ZONE: Zone = { id: 'zone-2', name: 'Bakery', position: 2 };

function renderAt(initialUrl: string) {
  return renderRouter(
    {
      _layout: () => <Stack />,
      'store/index': () => <Text>Store screen</Text>,
      'store/zones/[id]': ZoneScreen,
    },
    { initialUrl }
  );
}

/** Opens the zone on top of a Store stub, as tapping a zone row would. */
async function openZone() {
  const router = await renderAt('/store');
  await testRouter.push('/store/zones/zone-2');
  return router;
}

/** A request failure is an assertive alert, apart from the field's polite validation error. */
function expectAssertiveAlert(message: string) {
  const alert = screen.getByText(message);
  expect(alert).toHaveProp('accessibilityRole', 'alert');
  expect(alert).toHaveProp('accessibilityLiveRegion', 'assertive');
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

  test('a duplicate name shows the field error and stays; typing clears it', async () => {
    mockRenameZone.mockResolvedValue({ ok: false, reason: 'duplicate' });
    const router = await openZone();
    const user = userEvent.setup();

    const field = await screen.findByLabelText('Zone name');
    await user.clear(field);
    await user.type(field, 'dairy');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(mockRenameZone).toHaveBeenCalledWith('zone-2', 'dairy');
    expect(await screen.findByText('A zone with this name already exists.')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store/zones/zone-2');

    await user.type(field, 's');
    expect(screen.queryByText('A zone with this name already exists.')).not.toBeOnTheScreen();
  });

  test.each([
    ['offline', 'Renaming a zone needs a connection.'],
    ['error', "Couldn't rename the zone. Try again."],
  ] as const)('renaming %s shows an alert and stays', async (reason, message) => {
    mockRenameZone.mockResolvedValue({ ok: false, reason });
    const router = await openZone();

    await screen.findByLabelText('Zone name');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expectAssertiveAlert(message);
    expect(router.getPathname()).toBe('/store/zones/zone-2');
  });

  test('an empty name is refused without a request', async () => {
    await openZone();
    const user = userEvent.setup();

    await user.clear(await screen.findByLabelText('Zone name'));
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText('Enter a zone name.')).toBeOnTheScreen();
    expect(mockRenameZone).not.toHaveBeenCalled();
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

  test('Save opened directly (nothing to go back to) replaces it with the Store screen', async () => {
    mockRenameZone.mockResolvedValue({ ok: true, data: ZONE });
    const router = await renderAt('/store/zones/zone-2');

    await screen.findByLabelText('Zone name');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Store screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/store');
    expect(expoRouter.canGoBack()).toBe(false);
  });

  test.each([
    ['offline', 'Deleting needs a connection.'],
    ['error', "Couldn't delete the zone. Try again."],
  ] as const)('a delete that fails %s shows an alert and stays', async (reason, message) => {
    mockDeleteZone.mockResolvedValue({ ok: false, reason });
    const router = await openZone();
    await screen.findByLabelText('Zone name');

    answerConfirmation('Delete');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Delete zone' }));

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expectAssertiveAlert(message);
    expect(router.getPathname()).toBe('/store/zones/zone-2');
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

  test('a load error shows the error message with Retry', async () => {
    mockFetchZone.mockResolvedValue({ ok: false, reason: 'error' });
    await openZone();

    expect(await screen.findByText("Couldn't load this zone.")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Zone name')).not.toBeOnTheScreen();
  });
});
