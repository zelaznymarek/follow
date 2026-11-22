import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Opacity, Radius, Spacing } from '@/constants/theme';
import type { ShoppingListsState } from '@/hooks/use-shopping-lists';
import { formatListDate, listTitle } from '@/lib/list-title';
import type { ShoppingList } from '@/lib/shopping-lists';

const MESSAGES = {
  empty: { heading: 'No lists yet', body: 'Start one for your next shop.' },
  offline: {
    heading: 'No connection',
    body: "You're offline — lists will load when you're back online.",
  },
  error: { heading: 'Something went wrong', body: "Couldn't load your lists." },
} as const;

const PLACEHOLDER_ROWS = ['placeholder-1', 'placeholder-2', 'placeholder-3'];

export type MyListsViewProps = {
  state: ShoppingListsState;
  lists: ShoppingList[];
  onRetry: () => void;
  onNewList: () => void;
};

/** My lists in any load state; the data comes from props so every state can be shown side by side. */
export function MyListsView({ state, lists, onRetry, onNewList }: MyListsViewProps) {
  if (state === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <ListPlaceholder />
      </ThemedView>
    );
  }

  if (state === 'offline' || state === 'error') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <StateMessage
            kind={state}
            action={<Button title="Retry" onPress={onRetry} variant="secondary" />}
          />
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
          lists.length > 0 ? <Button title="New list" onPress={onNewList} /> : undefined
        }
        ListEmptyComponent={
          <StateMessage kind="empty" action={<Button title="New list" onPress={onNewList} />} />
        }
        contentContainerStyle={styles.content}
      />
    </ThemedView>
  );
}

/**
 * Stands in for the New list button and three rows in the same content container, so the layout
 * does not move when the lists arrive.
 */
function ListPlaceholder() {
  return (
    <View
      accessible
      accessibilityLabel="Loading lists"
      accessibilityRole="progressbar"
      style={styles.content}>
      <ThemedView type="backgroundElement" style={styles.buttonPlaceholder} />
      {PLACEHOLDER_ROWS.map((key) => (
        <Card key={key} style={styles.row}>
          <View style={styles.linePlaceholder} />
          <View style={styles.linePlaceholder} />
        </Card>
      ))}
    </View>
  );
}

/** A state of the whole list: a heading, one line of explanation and the action. */
function StateMessage({ kind, action }: { kind: keyof typeof MESSAGES; action: ReactNode }) {
  const { heading, body } = MESSAGES[kind];
  // Offline and error are announced; empty is the normal start, not news.
  const announce = kind !== 'empty';

  return (
    <View style={styles.message}>
      <View
        accessible={announce}
        accessibilityRole={announce ? 'alert' : undefined}
        accessibilityLiveRegion={announce ? 'polite' : undefined}
        style={styles.messageText}>
        <ThemedText
          type="smallBold"
          themeColor={kind === 'error' ? 'error' : 'text'}
          style={styles.centeredText}>
          {heading}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centeredText}>
          {body}
        </ThemedText>
      </View>
      {action}
    </View>
  );
}

function ListRow({ list }: { list: ShoppingList }) {
  return (
    <Link href={{ pathname: '/lists/[id]', params: { id: list.id } }} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.row}>
          <ThemedText type="smallBold">{listTitle(list)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatListDate(list.createdAt)}
          </ThemedText>
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'stretch',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  messageText: {
    gap: Spacing.one,
  },
  centeredText: {
    textAlign: 'center',
  },
  row: {
    gap: Spacing.half,
  },
  // Same height as Button (minHeight 44) and as the two ThemedText `small` lines (lineHeight 20).
  buttonPlaceholder: {
    minHeight: 44,
    borderRadius: Radius.control,
  },
  linePlaceholder: {
    height: 20,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
