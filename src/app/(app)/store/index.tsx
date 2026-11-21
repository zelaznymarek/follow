import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useStore } from '@/hooks/use-store';
import { useTheme } from '@/hooks/use-theme';
import {
  addZone,
  createStore,
  type MoveDirection,
  moveZone,
  type Store,
  type Zone,
} from '@/lib/store';

/** Matches the database checks on `stores.name` and `zones.name`. */
const STORE_NAME_MAX_LENGTH = 80;
const ZONE_NAME_MAX_LENGTH = 40;

const MESSAGES = {
  offline: "You're offline — your store will load when you're back online.",
  error: "Couldn't load your store.",
  noZones: 'No zones yet',
  storeExists: 'This account already has a store.',
} as const;

const CREATE_MESSAGES = {
  empty: 'Enter a name for your store.',
  offline: 'Naming your store needs a connection.',
  error: "Couldn't save the store. Try again.",
} as const;

const ADD_ZONE_MESSAGES = {
  empty: 'Enter a zone name.',
  duplicate: 'A zone with this name already exists',
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

  function handleStoreExists() {
    // Another device named the store meanwhile: show that one instead of the form.
    setNotice(MESSAGES.storeExists);
    refresh();
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          {notice ? (
            <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite">
              {notice}
            </ThemedText>
          ) : null}
          {store ? (
            <StoreDetails store={store} refresh={refresh} />
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (submitting) {
      return;
    }
    if (!name.trim()) {
      setError(CREATE_MESSAGES.empty);
      return;
    }
    setSubmitting(true);
    setError(null);
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
    setError(CREATE_MESSAGES[result.reason]);
    setSubmitting(false);
  }

  return (
    <>
      <ThemedText type="subtitle">Name your store</ThemedText>
      <TextField
        label="Store name"
        value={name}
        onChangeText={setName}
        error={error ?? undefined}
        maxLength={STORE_NAME_MAX_LENGTH}
        editable={!submitting}
        onSubmitEditing={handleSave}
      />
      <Button title="Save" onPress={handleSave} loading={submitting} />
    </>
  );
}

function StoreDetails({ store, refresh }: { store: Store; refresh: () => void }) {
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function handleMove(zone: Zone, direction: MoveDirection) {
    if (moving) {
      return;
    }
    setMoving(true);
    setMoveError(null);
    try {
      const result = await moveZone(zone.id, direction);
      if (result.ok) {
        refresh();
      } else {
        setMoveError(MOVE_MESSAGES[result.reason]);
      }
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
          <Pressable
            accessibilityRole="link"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
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

      <AddZoneForm storeId={store.id} onAdded={refresh} />
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
    <ThemedView type="backgroundElement" style={styles.row}>
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
      />
      <Button
        title="↓"
        accessibilityLabel={`Move ${zone.name} down`}
        onPress={() => onMove(zone, 'down')}
        disabled={moving || !canMoveDown}
      />
    </ThemedView>
  );
}

/** Closed until "Add zone" is pressed; stays open after an add so several zones go in one after another. */
function AddZoneForm({ storeId, onAdded }: { storeId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChangeName(text: string) {
    setName(text);
    setError(null);
  }

  function handleCancel() {
    setOpen(false);
    setName('');
    setError(null);
  }

  async function handleAdd() {
    if (submitting) {
      return;
    }
    if (!name.trim()) {
      setError(ADD_ZONE_MESSAGES.empty);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await addZone(storeId, name);
      if (result.ok) {
        setName('');
        onAdded();
        return;
      }
      setError(ADD_ZONE_MESSAGES[result.reason]);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return <Button title="Add zone" onPress={() => setOpen(true)} />;
  }

  return (
    <View style={styles.addZone}>
      <TextField
        label="New zone"
        value={name}
        onChangeText={handleChangeName}
        error={error ?? undefined}
        maxLength={ZONE_NAME_MAX_LENGTH}
        editable={!submitting}
        onSubmitEditing={handleAdd}
      />
      <Button title="Add" onPress={handleAdd} loading={submitting} />
      <Button title="Cancel" onPress={handleCancel} disabled={submitting} />
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
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
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
    opacity: 0.7,
  },
});
