import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner and blocks presses while a request is in flight. */
  loading?: boolean;
  /** The accessible name when the title alone is not enough (e.g. an arrow); defaults to the title. */
  accessibilityLabel?: string;
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.text },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}>
      {loading ? <ActivityIndicator size="small" color={theme.background} /> : null}
      <ThemedText type="smallBold" themeColor="background">
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  inactive: {
    opacity: 0.5,
  },
});
