import { Stack } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';

import { MyListsView } from '@/components/my-lists-view';
import type { ShoppingListsState } from '@/hooks/use-shopping-lists';
import type { ShoppingList } from '@/lib/shopping-lists';

const LIST: ShoppingList = { id: 'list-1', name: 'Groceries', createdAt: '2026-11-19T12:00:00Z' };

async function renderView(state: ShoppingListsState, lists: ShoppingList[] = []) {
  return renderRouter({
    _layout: () => <Stack />,
    index: () => (
      <MyListsView state={state} lists={lists} onRetry={jest.fn()} onNewList={jest.fn()} />
    ),
  });
}

describe('<MyListsView />', () => {
  test('loading shows placeholders as a progressbar without text', async () => {
    await renderView('loading');

    expect(screen.getByRole('progressbar', { name: 'Loading lists' })).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/./)).toBeNull();
  });

  test('ready shows the lists and New list, without an alert', async () => {
    await renderView('ready', [LIST]);

    expect(screen.getByText('Groceries')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'New list' })).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('empty explains the state and offers New list, without an alert', async () => {
    await renderView('ready');

    expect(screen.getByText('No lists yet')).toBeOnTheScreen();
    expect(screen.getByText('Start one for your next shop.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'New list' })).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test.each([
    ['offline', 'No connection', "You're offline — lists will load when you're back online."],
    ['error', 'Something went wrong', "Couldn't load your lists."],
  ] as const)('%s is announced as an alert with Retry', async (state, heading, body) => {
    await renderView(state);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(`${heading}${body}`);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeOnTheScreen();
  });
});
