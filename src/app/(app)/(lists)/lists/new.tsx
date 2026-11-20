import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { createList } from '@/lib/shopping-lists';

/** Matches the database check on `shopping_lists.name`. */
const NAME_MAX_LENGTH = 80;

const MESSAGES = {
  offline: 'Creating a list needs a connection.',
  error: "Couldn't create the list. Try again.",
} as const;

export default function NewListScreen() {
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createList(name);
      if (result.ok) {
        router.replace({ pathname: '/lists/[id]', params: { id: result.data.id } });
        return;
      }
      setFormError(MESSAGES[result.reason]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <TextField
            label="Name (optional)"
            value={name}
            onChangeText={setName}
            maxLength={NAME_MAX_LENGTH}
            editable={!submitting}
            onSubmitEditing={handleCreate}
          />

          {formError ? (
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              themeColor="error">
              {formError}
            </ThemedText>
          ) : null}

          <Button title="Create list" onPress={handleCreate} loading={submitting} />
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
    alignItems: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    gap: Spacing.three,
  },
});
