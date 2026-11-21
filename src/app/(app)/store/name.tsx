import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { renameStore, type Store } from '@/lib/store';

/** Matches the database check on `stores.name`. */
const NAME_MAX_LENGTH = 80;

const MESSAGES = {
  offline: "You're offline — your store will load when you're back online.",
  error: "Couldn't load your store.",
} as const;

const SAVE_MESSAGES = {
  empty: 'Enter a name for your store.',
  offline: 'Renaming the store needs a connection.',
  error: "Couldn't rename the store. Try again.",
} as const;

export default function StoreNameScreen() {
  const { state, store, reload } = useStore();
  const theme = useTheme();

  if (state === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} accessibilityLabel="Loading store" />
      </ThemedView>
    );
  }

  if (state === 'offline' || state === 'error') {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.section}>
          <ThemedText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.centeredText}>
            {MESSAGES[state]}
          </ThemedText>
          <Button title="Retry" onPress={reload} />
        </View>
      </ThemedView>
    );
  }

  if (!store) {
    // Nothing to rename yet: the Store screen offers to name one.
    return <Redirect href="/store" />;
  }

  return <RenameStoreForm store={store} />;
}

/** Mounted once the store has loaded, so the field starts with its current name. */
function RenameStoreForm({ store }: { store: Store }) {
  const [name, setName] = useState(store.name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (submitting) {
      return;
    }
    if (!name.trim()) {
      setError(SAVE_MESSAGES.empty);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await renameStore(store.id, name);
      if (result.ok) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/store');
        }
        return;
      }
      setError(SAVE_MESSAGES[result.reason]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <TextField
            label="Store name"
            value={name}
            onChangeText={setName}
            error={error ?? undefined}
            maxLength={NAME_MAX_LENGTH}
            editable={!submitting}
            onSubmitEditing={handleSave}
          />
          <Button title="Save" onPress={handleSave} loading={submitting} />
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
