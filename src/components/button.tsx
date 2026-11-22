import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Opacity, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner and blocks presses while a request is in flight. */
  loading?: boolean;
  /** The accessible name when the title alone is not enough (e.g. an arrow); defaults to the title. */
  accessibilityLabel?: string;
  /** `primary` (accent) for the main action of a screen area; `secondary` (neutral) for helper actions. */
  variant?: 'primary' | 'secondary';
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  variant = 'primary',
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const fill = variant === 'primary' ? 'primary' : 'backgroundSelected';
  const content = variant === 'primary' ? 'onPrimary' : 'text';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme[fill] },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}>
      {loading ? <ActivityIndicator size="small" color={theme[content]} /> : null}
      <ThemedText type="smallBold" themeColor={content}>
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
    borderRadius: Radius.control,
  },
  pressed: {
    opacity: Opacity.pressed,
  },
  inactive: {
    opacity: Opacity.disabled,
  },
});
