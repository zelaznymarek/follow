import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listTitle } from '@/lib/list-title';
import { deleteList, fetchList, type ShoppingList } from '@/lib/shopping-lists';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; list: ShoppingList }
  | { status: 'missing' | 'offline' | 'error' };

const MESSAGES = {
  missing: 'This list no longer exists.',
  offline: "You're offline — this list will load when you're back online.",
  error: "Couldn't load this list.",
  deleteOffline: 'Deleting needs a connection.',
  deleteError: "Couldn't delete the list. Try again.",
} as const;

const CONFIRM_TITLE = 'Delete this list?';
const CONFIRM_MESSAGE = "This can't be undone.";

/** Resolves `true` only when the user confirms. `Alert.alert` buttons do not run on web. */
function confirmDelete(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${CONFIRM_TITLE} ${CONFIRM_MESSAGE}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      CONFIRM_TITLE,
      CONFIRM_MESSAGE,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/** Loads one list; `retry` loads it again. */
function useList(id: string) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const latestRequest = useRef(0);

  // The effect below re-runs whenever this callback changes, so it must be stable (once per id, not
  // on every render). This is correctness, not a performance memo (the React Compiler does not run
  // under Jest).
  const fetchCurrent = useCallback(async () => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    setLoad({ status: 'loading' });
    const result = await fetchList(id);
    if (request !== latestRequest.current) {
      return; // A newer load started meanwhile; its result wins.
    }
    if (!result.ok) {
      setLoad({ status: result.reason });
    } else if (result.data) {
      setLoad({ status: 'ready', list: result.data });
    } else {
      setLoad({ status: 'missing' });
    }
  }, [id]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  return { load, retry: fetchCurrent };
}

export default function ListScreen() {
  const { id } = useLocalSearchParams<'/lists/[id]'>();
  const theme = useTheme();
  const { load, retry } = useList(id);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting || !(await confirmDelete())) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteList(id);
      if (result.ok) {
        if (router.canGoBack()) {
          router.back();
        } else {
          // Opened directly (e.g. a reloaded web page): there is no My lists screen underneath.
          router.replace('/');
        }
        return;
      }
      setDeleteError(result.reason === 'offline' ? MESSAGES.deleteOffline : MESSAGES.deleteError);
    } finally {
      setDeleting(false);
    }
  }

  if (load.status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} accessibilityLabel="Loading list" />
      </ThemedView>
    );
  }

  if (load.status !== 'ready') {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.section}>
          <ThemedText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.centeredText}>
            {MESSAGES[load.status]}
          </ThemedText>
          {load.status === 'missing' ? null : <Button title="Retry" onPress={retry} />}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: listTitle(load.list) }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <ThemedText type="subtitle">{listTitle(load.list)}</ThemedText>
          <ThemedText themeColor="textSecondary">No products yet</ThemedText>

          {deleteError ? (
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              themeColor="error">
              {deleteError}
            </ThemedText>
          ) : null}

          <Button title="Delete list" onPress={handleDelete} loading={deleting} />
        </View>
      </ScrollView>
    </ThemedView>
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
  centeredText: {
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  section: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    gap: Spacing.three,
  },
});
