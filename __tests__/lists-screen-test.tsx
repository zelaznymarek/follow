import { userEvent } from '@testing-library/react-native';
import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import MyListsScreen from '@/app/(app)/(lists)/index';
import type { ListsResult, ShoppingList } from '@/lib/shopping-lists';

const mockFetchLists = jest.fn<Promise<ListsResult<ShoppingList[]>>, []>();

jest.mock('@/lib/shopping-lists', () => ({
  fetchLists: () => mockFetchLists(),
}));

const THIS_YEAR = new Date().getFullYear();

const NEWER: ShoppingList = {
  id: 'list-2',
  name: 'Party',
  createdAt: `${THIS_YEAR}-11-20T12:00:00Z`,
};
const OLDER: ShoppingList = {
  id: 'list-1',
  name: 'Groceries',
  createdAt: `${THIS_YEAR}-11-19T12:00:00Z`,
};

async function renderScreen() {
  return renderRouter({
    _layout: () => <Stack />,
    index: MyListsScreen,
    'lists/new': () => <Text>New list screen</Text>,
    'lists/[id]': () => <Text>List screen</Text>,
  });
}

beforeEach(() => {
  mockFetchLists.mockReset();
});

describe('<MyListsScreen />', () => {
  test('renders lists in the order they are fetched, newest first', async () => {
    mockFetchLists.mockResolvedValue({ ok: true, data: [NEWER, OLDER] });
    await renderScreen();

    const titles = await screen.findAllByText(/^(Party|Groceries)$/);

    expect(titles.map((node) => node.props.children)).toEqual(['Party', 'Groceries']);
  });

  test('a row opens its list', async () => {
    mockFetchLists.mockResolvedValue({ ok: true, data: [NEWER] });
    const router = await renderScreen();

    await userEvent.setup().press(await screen.findByText('Party'));

    expect(router.getPathname()).toBe('/lists/list-2');
  });

  test('empty state shows its text and a New list button', async () => {
    mockFetchLists.mockResolvedValue({ ok: true, data: [] });
    const router = await renderScreen();

    expect(await screen.findByText('No lists yet')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'New list' }));

    expect(router.getPathname()).toBe('/lists/new');
  });

  test('offline shows the offline message and Retry loads again', async () => {
    mockFetchLists.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    mockFetchLists.mockResolvedValueOnce({ ok: true, data: [OLDER] });
    await renderScreen();

    expect(
      await screen.findByText("You're offline — lists will load when you're back online.")
    ).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Groceries')).toBeOnTheScreen();
    expect(mockFetchLists).toHaveBeenCalledTimes(2);
  });

  test('an error shows the error message', async () => {
    mockFetchLists.mockResolvedValue({ ok: false, reason: 'error' });
    await renderScreen();

    expect(await screen.findByText("Couldn't load your lists.")).toBeOnTheScreen();
  });
});
