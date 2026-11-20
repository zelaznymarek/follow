import { userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen, testRouter } from 'expo-router/testing-library';
import { Alert, type AlertButton, Text } from 'react-native';

import ListScreen from '@/app/(app)/(lists)/lists/[id]';
import type { ListsResult, ShoppingList } from '@/lib/shopping-lists';

const mockFetchList = jest.fn<Promise<ListsResult<ShoppingList | null>>, [string]>();
const mockDeleteList = jest.fn<Promise<ListsResult<null>>, [string]>();

jest.mock('@/lib/shopping-lists', () => ({
  fetchList: (id: string) => mockFetchList(id),
  deleteList: (id: string) => mockDeleteList(id),
}));

const LIST: ShoppingList = { id: 'list-1', name: 'Weekend', createdAt: '2026-11-20T12:00:00Z' };

/** Opens the list on top of a My lists stub, as tapping a row would. */
async function openList() {
  const router = await renderRouter({
    _layout: () => <Stack />,
    index: () => <Text>My lists screen</Text>,
    'lists/[id]': ListScreen,
  });
  await testRouter.push('/lists/list-1');
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
  mockFetchList.mockReset();
  mockDeleteList.mockReset();
  mockFetchList.mockResolvedValue({ ok: true, data: LIST });
  mockDeleteList.mockResolvedValue({ ok: true, data: null });
});

describe('<ListScreen />', () => {
  test('shows the list title and the empty products placeholder', async () => {
    await openList();

    expect(await screen.findByText('No products yet')).toBeOnTheScreen();
    expect(screen.getByText('Weekend')).toBeOnTheScreen();
    expect(mockFetchList).toHaveBeenCalledWith('list-1');
  });

  test('Delete calls deleteList only after the confirmation is accepted, then goes back', async () => {
    const router = await openList();
    const user = userEvent.setup();
    await screen.findByText('No products yet');

    answerConfirmation('Cancel');
    await user.press(screen.getByRole('button', { name: 'Delete list' }));
    expect(mockDeleteList).not.toHaveBeenCalled();

    answerConfirmation('Delete');
    await user.press(screen.getByRole('button', { name: 'Delete list' }));

    expect(mockDeleteList).toHaveBeenCalledTimes(1);
    expect(mockDeleteList).toHaveBeenCalledWith('list-1');
    expect(await screen.findByText('My lists screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/');
  });

  test('deleting offline shows that it needs a connection', async () => {
    mockDeleteList.mockResolvedValue({ ok: false, reason: 'offline' });
    await openList();
    await screen.findByText('No products yet');

    answerConfirmation('Delete');
    await userEvent.setup().press(screen.getByRole('button', { name: 'Delete list' }));

    expect(await screen.findByText('Deleting needs a connection.')).toBeOnTheScreen();
  });

  test('a missing list says it no longer exists', async () => {
    mockFetchList.mockResolvedValue({ ok: true, data: null });
    await openList();

    expect(await screen.findByText('This list no longer exists.')).toBeOnTheScreen();
  });
});
