import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { type StoreState, useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import { renameStore, STORE_NAME_MAX_LENGTH, type Store } from '@/lib/store';

const MESSAGES = {
  offline: "You're offline — your store will load when you're back online.",
  error: "Couldn't load your store.",
} as const;

const SAVE_MESSAGES = {
  empty: 'Enter a name for your store.',
  offline: 'Renaming the store needs a connection.',
  error: "Couldn't rename the store. Try again.",
} as const;

/**
 * Back to the Store screen, or onto it when this screen was opened directly (e.g. a reloaded web page).
 * Not a `<Redirect>`: under the store stack's `index` anchor that would stack a second Store screen.
 */
function leave() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/store');
  }
}

export default function StoreNameScreen() {
  const { state, store, reload } = useStore();
  const theme = useTheme();
  const noStore = state === 'ready' && store === null;

  useEffect(() => {
    if (noStore) {
      // Nothing to rename yet: the Store screen offers to name one. Navigates from an effect, not
      // during render.
      leave();
    }
  }, [noStore]);

  // The full-screen states only stand in for a store that has never loaded; once one has, a failed
  // or running reload keeps the (possibly edited) form on screen.
  if (store === null) {
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

    return null; // No store: leaving (see the effect above).
  }

  return <RenameStoreForm store={store} state={state} onRetry={reload} />;
}

/** Mounted once the store has loaded, so the field starts with its current name. */
function RenameStoreForm({
  store,
  state,
  onRetry,
}: {
  store: Store;
  state: StoreState;
  onRetry: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(store.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChangeName(text: string) {
    setName(text);
    setNameError(null);
  }

  async function handleSave() {
    if (submitting) {
      return;
    }
    if (!name.trim()) {
      setNameError(SAVE_MESSAGES.empty);
      return;
    }
    setSubmitting(true);
    setNameError(null);
    setFormError(null);
    try {
      const result = await renameStore(store.id, name);
      if (result.ok) {
        leave();
        return;
      }
      setFormError(SAVE_MESSAGES[result.reason]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          {state === 'offline' || state === 'error' ? (
            <View style={styles.reloadProblem}>
              <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">
                {MESSAGES[state]}
              </ThemedText>
              <Button title="Retry" onPress={onRetry} />
            </View>
          ) : null}
          {state === 'loading' ? (
            <ActivityIndicator color={theme.text} accessibilityLabel="Loading store" />
          ) : null}
          <TextField
            label="Store name"
            value={name}
            onChangeText={handleChangeName}
            error={nameError ?? undefined}
            maxLength={STORE_NAME_MAX_LENGTH}
            editable={!submitting}
            onSubmitEditing={handleSave}
          />
          {formError ? (
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              themeColor="error">
              {formError}
            </ThemedText>
          ) : null}
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
  reloadProblem: {
    gap: Spacing.two,
  },
});
