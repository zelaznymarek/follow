import { Alert, Platform } from 'react-native';

export type ConfirmDeleteOptions = {
  title: string;
  message: string;
};

/** Resolves `true` only when the user confirms. `Alert.alert` buttons do not run on web. */
export function confirmDelete({ title, message }: ConfirmDeleteOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title} ${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
