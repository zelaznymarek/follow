import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmDelete } from '@/lib/confirm-delete';
import { deleteZone, fetchZone, renameZone, type Zone, ZONE_NAME_MAX_LENGTH } from '@/lib/store';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; zone: Zone }
  | { status: 'missing' | 'offline' | 'error' };

const MESSAGES = {
  missing: 'This zone no longer exists.',
  offline: "You're offline — this zone will load when you're back online.",
  error: "Couldn't load this zone.",
} as const;

const SAVE_MESSAGES = {
  empty: 'Enter a zone name.',
  duplicate: 'A zone with this name already exists.',
  offline: 'Renaming a zone needs a connection.',
  error: "Couldn't rename the zone. Try again.",
} as const;

const DELETE_MESSAGES = {
  offline: 'Deleting needs a connection.',
  error: "Couldn't delete the zone. Try again.",
} as const;

const CONFIRM = { title: 'Delete this zone?', message: "This can't be undone." } as const;

/** Back to the Store screen, or onto it when the zone was opened directly (e.g. a reloaded web page). */
function leave() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/store');
  }
}

/** Loads one zone; `retry` loads it again. */
function useZone(id: string) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const latestRequest = useRef(0);

  // The effect below re-runs whenever this callback changes, so it must be stable (once per id, not
  // on every render). This is correctness, not a performance memo (the React Compiler does not run
  // under Jest).
  const fetchCurrent = useCallback(async () => {
    latestRequest.current += 1;
    const request = latestRequest.current;
    setLoad({ status: 'loading' });
    const result = await fetchZone(id);
    if (request !== latestRequest.current) {
      return; // A newer load started meanwhile; its result wins.
    }
    if (!result.ok) {
      setLoad({ status: result.reason });
    } else if (result.data) {
      setLoad({ status: 'ready', zone: result.data });
    } else {
      setLoad({ status: 'missing' });
    }
  }, [id]);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  function markMissing() {
    latestRequest.current += 1;
    setLoad({ status: 'missing' });
  }

  return { load, retry: fetchCurrent, markMissing };
}

/** True only when the zone is confirmed gone; a failed check keeps the caller's own message. */
async function zoneIsGone(id: string) {
  const result = await fetchZone(id);
  return result.ok && result.data === null;
}

export default function ZoneScreen() {
  const { id } = useLocalSearchParams<'/store/zones/[id]'>();
  const theme = useTheme();
  const { load, retry, markMissing } = useZone(id);

  if (load.status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} accessibilityLabel="Loading zone" />
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

  return <ZoneForm zone={load.zone} onMissing={markMissing} />;
}

/** Mounted once the zone has loaded, so the field starts with its current name. */
function ZoneForm({ zone, onMissing }: { zone: Zone; onMissing: () => void }) {
  const [name, setName] = useState(zone.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = saving || deleting;

  function handleChangeName(text: string) {
    setName(text);
    setNameError(null);
  }

  async function handleSave() {
    if (busy) {
      return;
    }
    if (!name.trim()) {
      setNameError(SAVE_MESSAGES.empty);
      return;
    }
    setSaving(true);
    setNameError(null);
    setSaveError(null);
    try {
      const result = await renameZone(zone.id, name);
      if (result.ok) {
        leave();
        return;
      }
      if (result.reason === 'duplicate') {
        setNameError(SAVE_MESSAGES.duplicate);
      } else if (result.reason === 'error' && (await zoneIsGone(zone.id))) {
        // A rename that matches no row fails as an error; the zone was deleted elsewhere.
        onMissing();
      } else {
        setSaveError(SAVE_MESSAGES[result.reason]);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (busy || !(await confirmDelete(CONFIRM))) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteZone(zone.id);
      if (result.ok) {
        leave();
        return;
      }
      setDeleteError(DELETE_MESSAGES[result.reason]);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: zone.name }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <TextField
            label="Zone name"
            value={name}
            onChangeText={handleChangeName}
            error={nameError ?? undefined}
            maxLength={ZONE_NAME_MAX_LENGTH}
            editable={!busy}
            onSubmitEditing={handleSave}
          />

          {saveError ? (
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              themeColor="error">
              {saveError}
            </ThemedText>
          ) : null}

          <Button title="Save" onPress={handleSave} loading={saving} disabled={deleting} />

          {deleteError ? (
            <ThemedText
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              themeColor="error">
              {deleteError}
            </ThemedText>
          ) : null}

          <Button title="Delete zone" onPress={handleDelete} loading={deleting} disabled={saving} />
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
