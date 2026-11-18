export const VALIDATION_MESSAGES = {
  emailRequired: 'Enter your email.',
  emailInvalid: 'Enter a valid email address.',
  passwordRequired: 'Enter your password.',
  passwordWeak: 'Use at least 8 characters, including letters and digits.',
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns an error message for an email (expected already trimmed), or `undefined` when valid. */
export function validateEmail(email: string): string | undefined {
  if (!email) {
    return VALIDATION_MESSAGES.emailRequired;
  }
  if (!EMAIL_PATTERN.test(email)) {
    return VALIDATION_MESSAGES.emailInvalid;
  }
  return undefined;
}

/**
 * Password rule for new accounts. Mirrors `supabase/config.toml` `[auth]`:
 * `minimum_password_length = 8`, `password_requirements = "letters_digits"`.
 */
export function validateNewPassword(password: string): string | undefined {
  if (!password) {
    return VALIDATION_MESSAGES.passwordRequired;
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return VALIDATION_MESSAGES.passwordWeak;
  }
  return undefined;
}
