import { Link, router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useShoppingLists } from '@/hooks/use-shopping-lists';
import { useTheme } from '@/hooks/use-theme';
import { formatListDate, listTitle } from '@/lib/list-title';
import type { ShoppingList } from '@/lib/shopping-lists';

const MESSAGES = {
  empty: 'No lists yet',
  offline: "You're offline — lists will load when you're back online.",
  error: "Couldn't load your lists.",
} as const;

function openNewList() {
  router.push('/lists/new');
}

export default function MyListsScreen() {
  const { state, lists, reload } = useShoppingLists();
  const theme = useTheme();

  if (state === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} accessibilityLabel="Loading lists" />
      </ThemedView>
    );
  }

  if (state === 'offline' || state === 'error') {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.message}>
          <ThemedText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.messageText}>
            {MESSAGES[state]}
          </ThemedText>
          <Button title="Retry" onPress={reload} />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={lists}
        keyExtractor={(list) => list.id}
        renderItem={({ item }) => <ListRow list={item} />}
        ListHeaderComponent={
          lists.length > 0 ? <Button title="New list" onPress={openNewList} /> : undefined
        }
        ListEmptyComponent={
          <View style={styles.message}>
            <ThemedText style={styles.messageText}>{MESSAGES.empty}</ThemedText>
            <Button title="New list" onPress={openNewList} />
          </View>
        }
        contentContainerStyle={styles.content}
      />
    </ThemedView>
  );
}

function ListRow({ list }: { list: ShoppingList }) {
  return (
    <Link href={{ pathname: '/lists/[id]', params: { id: list.id } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedText type="smallBold">{listTitle(list)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatListDate(list.createdAt)}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignSelf: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  message: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    alignItems: 'center',
    gap: Spacing.three,
  },
  messageText: {
    textAlign: 'center',
  },
  row: {
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
