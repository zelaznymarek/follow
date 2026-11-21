import { Stack } from 'expo-router';

// Keeps My lists underneath a deep-linked or reloaded `/lists/[id]`, so the header has a back button.
// expo-router 58 reads `anchor`; `initialRouteName` is deprecated there.
export const unstable_settings = { anchor: 'index' };

export default function ListsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'My lists' }} />
      <Stack.Screen name="lists/new" options={{ title: 'New list' }} />
      {/* The list screen sets its own title once the list has loaded. */}
      <Stack.Screen name="lists/[id]" options={{ title: '' }} />
    </Stack>
  );
}
