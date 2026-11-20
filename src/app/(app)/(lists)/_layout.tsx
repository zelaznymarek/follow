import { Stack } from 'expo-router';

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
