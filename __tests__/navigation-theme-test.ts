import { DarkTheme, DefaultTheme } from 'expo-router';

import { DarkNavigationTheme, LightNavigationTheme } from '@/constants/navigation-theme';
import { Colors } from '@/constants/theme';

describe('navigationTheme', () => {
  test.each([
    ['light', DefaultTheme, LightNavigationTheme],
    ['dark', DarkTheme, DarkNavigationTheme],
  ] as const)(
    '%s keeps the base fonts and dark flag and maps colours from Colors',
    (scheme, base, theme) => {
      const colors = Colors[scheme];

      expect(theme.dark).toBe(base.dark);
      expect(theme.fonts).toBe(base.fonts);
      expect(theme.colors).toEqual({
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.backgroundSelected,
        notification: colors.error,
      });
    }
  );
});
