import { Stack } from 'expo-router';

// Keeps the Store screen underneath a deep-linked or reloaded `/store/name` or `/store/zones/[id]`, so
// the header has a back button. expo-router 58 reads `anchor`; `initialRouteName` is deprecated there.
export const unstable_settings = { anchor: 'index' };

export default function StoreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Store' }} />
      <Stack.Screen name="name" options={{ title: 'Store name' }} />
      {/* The zone screen sets its own title once the zone has loaded. */}
      <Stack.Screen name="zones/[id]" options={{ title: '' }} />
    </Stack>
  );
}
