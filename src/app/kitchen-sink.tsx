import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MyListsView } from '@/components/my-lists-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { ShoppingListsState } from '@/hooks/use-shopping-lists';
import { useTheme } from '@/hooks/use-theme';
import type { ShoppingList } from '@/lib/shopping-lists';

// Fixed dates keep screenshots stable; the unnamed list shows its creation date as the title.
const SAMPLE_LISTS: ShoppingList[] = [
  { id: 'sample-3', name: 'Weekend groceries', createdAt: '2026-11-20T12:00:00Z' },
  { id: 'sample-2', name: null, createdAt: '2026-11-18T12:00:00Z' },
  { id: 'sample-1', name: 'Party', createdAt: '2025-12-30T12:00:00Z' },
];

const LIST_STATES: { label: string; state: ShoppingListsState; lists: ShoppingList[] }[] = [
  { label: 'Loading', state: 'loading', lists: [] },
  { label: 'Ready', state: 'ready', lists: SAMPLE_LISTS },
  { label: 'Empty', state: 'ready', lists: [] },
  { label: 'Offline', state: 'offline', lists: [] },
  { label: 'Error', state: 'error', lists: [] },
];

function noop() {}

/** Dev-only page showing every My lists state and the Button states side by side. */
export default function KitchenSinkScreen() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <KitchenSink />;
}

function KitchenSink() {
  const theme = useTheme();
  const frameStyle = [styles.frame, { borderColor: theme.backgroundSelected }];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">Kitchen sink</ThemedText>

        <ThemedText type="smallBold" themeColor="textSecondary">
          My lists
        </ThemedText>
        <View style={styles.grid}>
          {LIST_STATES.map(({ label, state, lists }) => (
            <View key={label} style={styles.column}>
              <ThemedText type="smallBold">{label}</ThemedText>
              <View style={frameStyle}>
                <MyListsView state={state} lists={lists} onRetry={noop} onNewList={noop} />
              </View>
            </View>
          ))}
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary">
          Button
        </ThemedText>
        <View style={styles.grid}>
          <View style={styles.buttonCell}>
            <Button title="Default" onPress={noop} />
          </View>
          <View style={styles.buttonCell}>
            <Button title="Disabled" onPress={noop} disabled />
          </View>
          <View style={styles.buttonCell}>
            <Button title="Loading" onPress={noop} loading />
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  column: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.two,
  },
  frame: {
    height: 560,
    borderWidth: 1,
    overflow: 'hidden',
  },
  buttonCell: {
    width: 160,
  },
});
