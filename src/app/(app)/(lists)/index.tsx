import { router } from 'expo-router';

import { MyListsView } from '@/components/my-lists-view';
import { useShoppingLists } from '@/hooks/use-shopping-lists';

function openNewList() {
  router.push('/lists/new');
}

export default function MyListsScreen() {
  const { state, lists, reload } = useShoppingLists();

  return <MyListsView state={state} lists={lists} onRetry={reload} onNewList={openNewList} />;
}
