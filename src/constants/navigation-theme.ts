import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { Colors } from '@/constants/theme';

/** React Navigation theme in the app palette, so headers match the screens under them. */
export function navigationTheme(base: Theme, colors: (typeof Colors)['light' | 'dark']): Theme {
  return {
    ...base,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.backgroundSelected,
      notification: colors.error,
    },
  };
}

export const LightNavigationTheme = navigationTheme(DefaultTheme, Colors.light);
export const DarkNavigationTheme = navigationTheme(DarkTheme, Colors.dark);
