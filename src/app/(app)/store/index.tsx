import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Opacity, Spacing } from '@/constants/theme';
import { useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import {
  addZone,
  createStore,
  type MoveDirection,
  moveZone,
  STORE_NAME_MAX_LENGTH,
  type Store,
  ZONE_NAME_MAX_LENGTH,
  type Zone,
} from '@/lib/store';

const MESSAGES = {
  offline: "You're offline — your store will load when you're back online.",
  error: "Couldn't load your store.",
  noZones: 'No zones yet',
  storeExists: 'Your store was already set up, so here it is.',
} as const;

const CREATE_MESSAGES = {
  empty: 'Enter a name for your store.',
  offline: 'Naming your store needs a connection.',
  error: "Couldn't save the store. Try again.",
} as const;

const ADD_ZONE_MESSAGES = {
  empty: 'Enter a zone name.',
  duplicate: 'A zone with this name already exists.',
  offline: 'Adding a zone needs a connection.',
  error: "Couldn't add the zone. Try again.",
} as const;

const MOVE_MESSAGES = {
  offline: 'Moving a zone needs a connection.',
  error: "Couldn't move the zone. Try again.",
} as const;

export default function StoreScreen() {
  const { state, store, reload, refresh } = useStore();
  const theme = useTheme();
  const [notice, setNotice] = useState<string | null>(null);

  // The tab stays mounted, so the notice is dropped when the screen loses focus. useFocusEffect
  // re-runs whenever its callback changes, so the callback must be stable (correctness, not a
  // performance memo: the React Compiler does not run under Jest).
  useFocusEffect(useCallback(() => () => setNotice(null), []));

  function clearNotice() {
    setNotice(null);
  }

  function handleRetry() {
    setNotice(null);
    reload();
  }

  // The full-screen states only stand in for a store that has never loaded; once one has, a failed
  // or running reload keeps it (and any typed text) on screen.
  if (store === null && state === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.text} accessibilityLabel="Loading store" />
      </ThemedView>
    );
  }

  if (store === null && (state === 'offline' || state === 'error')) {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.section}>
          <ThemedText
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.centeredText}>
            {MESSAGES[state]}
          </ThemedText>
          <Button title="Retry" onPress={handleRetry} variant="secondary" />
        </View>
      </ThemedView>
    );
  }

  function handleStoreExists() {
    // Another device (or a create that timed out but landed) named the store: show it instead of the form.
    setNotice(MESSAGES.storeExists);
    refresh();
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
              <Button title="Retry" onPress={handleRetry} variant="secondary" />
            </View>
          ) : null}
          {state === 'loading' ? (
            <ActivityIndicator color={theme.text} accessibilityLabel="Loading store" />
          ) : null}
          {notice ? (
            <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">
              {notice}
            </ThemedText>
          ) : null}
          {store ? (
            <StoreDetails store={store} refresh={refresh} onAction={clearNotice} />
          ) : (
            <CreateStoreForm onCreated={refresh} onStoreExists={handleStoreExists} />
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function CreateStoreForm({
  onCreated,
  onStoreExists,
}: {
  onCreated: () => void;
  onStoreExists: () => void;
}) {
  const [name, setName] = useState('');
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
      setNameError(CREATE_MESSAGES.empty);
      return;
    }
    setSubmitting(true);
    setNameError(null);
    setFormError(null);
    const result = await createStore(name);
    if (result.ok) {
      // Stays disabled: the refreshed store replaces this form.
      onCreated();
      return;
    }
    if (result.reason === 'duplicate') {
      onStoreExists();
      return;
    }
    setFormError(CREATE_MESSAGES[result.reason]);
    setSubmitting(false);
  }

  return (
    <>
      <ThemedText type="subtitle">Name your store</ThemedText>
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
    </>
  );
}

function StoreDetails({
  store,
  refresh,
  onAction,
}: {
  store: Store;
  refresh: () => Promise<void>;
  /** Called when the user starts a change, so a leftover notice goes away. */
  onAction: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function handleMove(zone: Zone, direction: MoveDirection) {
    if (moving) {
      return;
    }
    onAction();
    setMoving(true);
    setMoveError(null);
    try {
      const result = await moveZone(zone.id, direction);
      if (!result.ok) {
        setMoveError(MOVE_MESSAGES[result.reason]);
      }
      // Reloads after a failed move too, so a zone deleted elsewhere disappears. The arrows stay
      // disabled until the new order is on screen, so the next move acts on what the user sees.
      await refresh();
    } finally {
      setMoving(false);
    }
  }

  const lastIndex = store.zones.length - 1;

  return (
    <>
      <View style={styles.heading}>
        <ThemedText type="subtitle">{store.name}</ThemedText>
        <Link href="/store/name" asChild>
          <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Rename store
            </ThemedText>
          </Pressable>
        </Link>
      </View>

      {moveError ? (
        <ThemedText
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          themeColor="error">
          {moveError}
        </ThemedText>
      ) : null}

      {store.zones.length === 0 ? (
        <ThemedText themeColor="textSecondary">{MESSAGES.noZones}</ThemedText>
      ) : (
        <View style={styles.zones}>
          {store.zones.map((zone, index) => (
            <ZoneRow
              key={zone.id}
              zone={zone}
              canMoveUp={index > 0}
              canMoveDown={index < lastIndex}
              moving={moving}
              onMove={handleMove}
            />
          ))}
        </View>
      )}

      <AddZoneForm storeId={store.id} onAdded={refresh} onAction={onAction} />
    </>
  );
}

function ZoneRow({
  zone,
  canMoveUp,
  canMoveDown,
  moving,
  onMove,
}: {
  zone: Zone;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moving: boolean;
  onMove: (zone: Zone, direction: MoveDirection) => void;
}) {
  return (
    <Card style={styles.row}>
      <Link href={{ pathname: '/store/zones/[id]', params: { id: zone.id } }} asChild>
        <Pressable style={({ pressed }) => [styles.rowName, pressed && styles.pressed]}>
          <ThemedText type="smallBold">{zone.name}</ThemedText>
        </Pressable>
      </Link>
      <Button
        title="↑"
        accessibilityLabel={`Move ${zone.name} up`}
        onPress={() => onMove(zone, 'up')}
        disabled={moving || !canMoveUp}
        variant="secondary"
      />
      <Button
        title="↓"
        accessibilityLabel={`Move ${zone.name} down`}
        onPress={() => onMove(zone, 'down')}
        disabled={moving || !canMoveDown}
        variant="secondary"
      />
    </Card>
  );
}

/** Closed until "Add zone" is pressed; stays open after an add so several zones go in one after another. */
function AddZoneForm({
  storeId,
  onAdded,
  onAction,
}: {
  storeId: string;
  onAdded: () => void;
  onAction: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpen() {
    onAction();
    setOpen(true);
  }

  function handleChangeName(text: string) {
    setName(text);
    setNameError(null);
  }

  function handleCancel() {
    setOpen(false);
    setName('');
    setNameError(null);
    setFormError(null);
  }

  async function handleAdd() {
    if (submitting) {
      return;
    }
    onAction();
    if (!name.trim()) {
      setNameError(ADD_ZONE_MESSAGES.empty);
      return;
    }
    setSubmitting(true);
    setNameError(null);
    setFormError(null);
    try {
      const result = await addZone(storeId, name);
      if (result.ok) {
        setName('');
        onAdded();
        return;
      }
      if (result.reason === 'duplicate') {
        setNameError(ADD_ZONE_MESSAGES.duplicate);
        // The zone may be one this screen hasn't loaded yet: an earlier add that timed out but
        // landed, or one added on another device.
        onAdded();
      } else {
        setFormError(ADD_ZONE_MESSAGES[result.reason]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return <Button title="Add zone" onPress={handleOpen} />;
  }

  return (
    <View style={styles.addZone}>
      <TextField
        label="New zone"
        value={name}
        onChangeText={handleChangeName}
        error={nameError ?? undefined}
        maxLength={ZONE_NAME_MAX_LENGTH}
        editable={!submitting}
        onSubmitEditing={handleAdd}
      />
      {formError ? (
        <ThemedText
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          themeColor="error">
          {formError}
        </ThemedText>
      ) : null}
      <Button title="Add" onPress={handleAdd} loading={submitting} />
      <Button title="Cancel" onPress={handleCancel} disabled={submitting} variant="secondary" />
    </View>
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
  heading: {
    gap: Spacing.one,
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  zones: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
  },
  rowName: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  addZone: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
});
