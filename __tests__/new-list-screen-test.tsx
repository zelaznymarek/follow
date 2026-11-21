import { userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import NewListScreen from '@/app/(app)/(lists)/lists/new';
import type { ListsResult, ShoppingList } from '@/lib/shopping-lists';

const mockCreateList = jest.fn<Promise<ListsResult<ShoppingList>>, [string | null]>();

jest.mock('@/lib/shopping-lists', () => ({
  createList: (name: string | null) => mockCreateList(name),
}));

const CREATED: ShoppingList = { id: 'list-9', name: 'Weekend', createdAt: '2026-11-20T12:00:00Z' };

async function renderScreen() {
  return renderRouter(
    {
      _layout: () => <Stack />,
      'lists/new': NewListScreen,
      'lists/[id]': () => <Text>List screen</Text>,
    },
    { initialUrl: '/lists/new' }
  );
}

beforeEach(() => {
  mockCreateList.mockReset();
});

describe('<NewListScreen />', () => {
  test('Create calls createList once even with two quick presses, then opens the list', async () => {
    let finish: (result: ListsResult<ShoppingList>) => void = () => {};
    mockCreateList.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const router = await renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Name (optional)'), 'Weekend');
    const button = screen.getByRole('button', { name: 'Create list' });
    await user.press(button);
    await user.press(button);

    expect(mockCreateList).toHaveBeenCalledTimes(1);
    expect(mockCreateList).toHaveBeenCalledWith('Weekend');

    finish({ ok: true, data: CREATED });

    expect(await screen.findByText('List screen')).toBeOnTheScreen();
    expect(router.getPathname()).toBe('/lists/list-9');
    // Replaced, not pushed: New list is no longer underneath the opened list.
    expect(router.getRouterState()?.routes.at(-1)?.state?.routes).toHaveLength(1);
  });

  test('offline shows that creating needs a connection and stays on New list', async () => {
    mockCreateList.mockResolvedValue({ ok: false, reason: 'offline' });
    const router = await renderScreen();

    await userEvent.setup().press(screen.getByRole('button', { name: 'Create list' }));

    expect(await screen.findByText('Creating a list needs a connection.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Create list' })).toBeEnabled();
    expect(router.getPathname()).toBe('/lists/new');
  });
});
