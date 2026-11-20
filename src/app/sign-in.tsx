import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { VALIDATION_MESSAGES, validateEmail } from '@/lib/auth-validation';

type FieldErrors = { email?: string; password?: string };

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) {
      return;
    }
    const trimmedEmail = email.trim();
    const errors: FieldErrors = {
      email: validateEmail(trimmedEmail),
      password: password ? undefined : VALIDATION_MESSAGES.passwordRequired,
    };
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email || errors.password) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(trimmedEmail, password);
      // On success the root gate swaps this screen for the app; nothing to do here.
      if (!result.ok) {
        setFormError(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <ThemedText type="subtitle">Sign in</ThemedText>

            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              autoCapitalize="none"
              editable={!submitting}
              onSubmitEditing={handleSubmit}
            />

            {formError ? (
              <ThemedText
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                themeColor="error">
                {formError}
              </ThemedText>
            ) : null}

            <Button title="Sign in" onPress={handleSubmit} loading={submitting} />

            <View style={styles.footer}>
              <ThemedText type="small" themeColor="textSecondary">
                No account yet?
              </ThemedText>
              <Link href="/register">
                <ThemedText type="linkPrimary">Create an account</ThemedText>
              </Link>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    gap: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
});
