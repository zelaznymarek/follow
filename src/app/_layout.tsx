import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Platform, StyleSheet } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemedView } from '@/components/themed-view';
import { DarkNavigationTheme, LightNavigationTheme } from '@/constants/navigation-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { SessionProvider } from '@/providers/session-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkNavigationTheme : LightNavigationTheme}>
      <SessionProvider>
        <SplashController />
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

/**
 * Keeps the native splash up until the session status is known. The animated overlay hides the
 * native splash as soon as it lays out, so it is mounted only once loading has finished; the
 * screen underneath (sign-in while loading) never flashes before a stored session loads.
 */
function SplashController() {
  const { status } = useSession();
  if (status === 'loading') {
    // Native keeps its splash up; web has none, so cover the sign-in screen mounted underneath.
    return Platform.OS === 'web' ? <ThemedView style={styles.loadingCover} /> : null;
  }
  return <AnimatedSplashOverlay />;
}

function RootNavigator() {
  const { status } = useSession();
  const signedIn = status === 'signed-in';

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      {/* While loading, the sign-in screen mounts under the splash so the stack always has a screen. */}
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="register" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingCover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
  },
});
