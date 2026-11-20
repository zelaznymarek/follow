import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createContext, type ReactNode, useEffect, useRef, useState } from 'react';

import { VALIDATION_MESSAGES } from '@/lib/auth-validation';
import { getSupabase, SUPABASE_STORAGE_KEY } from '@/lib/supabase';

export type SessionStatus = 'loading' | 'signed-in' | 'signed-out';

export type AuthResult = { ok: true } | { ok: false; message: string };

export type SessionContextValue = {
  status: SessionStatus;
  email: string | null;
  signIn(email: string, password: string): Promise<AuthResult>;
  register(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

type AuthState = { status: SessionStatus; email: string | null };

const LOADING: AuthState = { status: 'loading', email: null };
const SIGNED_OUT: AuthState = { status: 'signed-out', email: null };

function signedIn(email: string | null | undefined): AuthState {
  return { status: 'signed-in', email: email ?? null };
}

export const AUTH_MESSAGES = {
  invalidCredentials: 'Wrong email or password.',
  emailTaken: 'An account with this email already exists. Try signing in instead.',
  weakPassword: VALIDATION_MESSAGES.passwordWeak,
  network: "Can't reach the server. Check your connection and try again.",
  noSession: "Couldn't sign you in after registering. Try signing in, or use a different email.",
  unknown: 'Something went wrong. Please try again.',
} as const;

function messageFor(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return AUTH_MESSAGES.network;
  }
  if (isAuthWeakPasswordError(error)) {
    return AUTH_MESSAGES.weakPassword;
  }
  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return AUTH_MESSAGES.invalidCredentials;
      case 'user_already_exists':
      case 'email_exists':
        return AUTH_MESSAGES.emailTaken;
      case 'weak_password':
        return AUTH_MESSAGES.weakPassword;
    }
  }
  return AUTH_MESSAGES.unknown;
}

function failure(error: unknown): AuthResult {
  return { ok: false, message: messageFor(error) };
}

/** The session the client persisted under its storage key, if it looks usable. */
function readStoredSession(): { email: string | null } | null {
  try {
    const raw = globalThis.localStorage?.getItem(SUPABASE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const stored: unknown = JSON.parse(raw);
    if (
      typeof stored === 'object' &&
      stored !== null &&
      'access_token' in stored &&
      'refresh_token' in stored &&
      'user' in stored &&
      typeof stored.access_token === 'string' &&
      typeof stored.refresh_token === 'string' &&
      typeof stored.user === 'object' &&
      stored.user !== null
    ) {
      const email = 'email' in stored.user ? stored.user.email : null;
      return { email: typeof email === 'string' ? email : null };
    }
  } catch {
    // Unreadable or malformed storage counts as no session.
  }
  return null;
}

/** How long the splash waits for the server before trusting the stored session. */
export const STARTUP_TIMEOUT_MS = 3000;

/** How long Sign out waits for auth-js before showing sign-in; auth-js keeps clearing the session in the background. */
export const SIGN_OUT_TIMEOUT_MS = 2000;

function timeout(ms: number): { promise: Promise<'timeout'>; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  return { promise, cancel: () => clearTimeout(timer) };
}

/**
 * Start-up decision. A session from `getSession()` signs the user in. When the session could not be
 * refreshed because the network is unreachable or too slow, the stored session is trusted (offline
 * rule); anything else signs the user out.
 */
async function resolveStartupState(supabase: SupabaseClient): Promise<AuthState> {
  let error: unknown = null;
  const limit = timeout(STARTUP_TIMEOUT_MS);
  try {
    // An expired access token is refreshed over the network, and auth-js retries that for up to 30 s.
    const result = await Promise.race([supabase.auth.getSession(), limit.promise]);
    if (result === 'timeout') {
      // Slow or no network: trust the stored session; later auth events correct the status.
      const stored = readStoredSession();
      return stored ? signedIn(stored.email) : SIGNED_OUT;
    }
    const { data, error: sessionError } = result;
    if (data.session) {
      return signedIn(data.session.user.email);
    }
    error = sessionError;
  } catch (thrown) {
    error = thrown;
  } finally {
    limit.cancel();
  }

  if (isAuthRetryableFetchError(error)) {
    const stored = readStoredSession();
    if (stored) {
      return signedIn(stored.email);
    }
  }
  return SIGNED_OUT;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Effects never run during the server render, so web output stays `loading` there and the first
  // client render matches it.
  const [state, setState] = useState<AuthState>(LOADING);
  // True while auth-js is still clearing a session that the UI already shows as signed out.
  const signOutPending = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    let eventSeen = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          // A refresh that lands while sign-out is still clearing the session must not sign the user back in.
          if (session && !(event === 'TOKEN_REFRESHED' && signOutPending.current)) {
            eventSeen = true;
            setState(signedIn(session.user.email));
          }
          break;
        case 'SIGNED_OUT':
          eventSeen = true;
          setState(SIGNED_OUT);
          break;
        // INITIAL_SESSION is ignored: it fires with `null` offline even though a session is
        // stored, so the start-up decision below owns the initial status.
      }
    });

    resolveStartupState(supabase).then((startup) => {
      if (active && !eventSeen) {
        setState(startup);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      return error ? failure(error) : { ok: true };
    } catch (thrown) {
      return failure(thrown);
    }
  }

  async function register(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await getSupabase().auth.signUp({ email, password });
      if (error) {
        return failure(error);
      }
      // With email confirmation off, a successful sign-up always returns a session.
      return data.session ? { ok: true } : { ok: false, message: AUTH_MESSAGES.noSession };
    } catch (thrown) {
      return failure(thrown);
    }
  }

  async function clearLocalSession(): Promise<void> {
    signOutPending.current = true;
    try {
      // `local` clears this device's session; offline, auth-js may first retry a token refresh for ~25 s.
      const { error } = await getSupabase().auth.signOut({ scope: 'local' });
      if (error) {
        // The local session is removed before auth-js reports this error.
        console.warn('Sign-out could not revoke the session on the server:', error.message);
      }
    } catch (thrown) {
      console.warn('Sign-out did not clear the stored session:', thrown);
    } finally {
      signOutPending.current = false;
    }
  }

  async function signOut(): Promise<void> {
    const limit = timeout(SIGN_OUT_TIMEOUT_MS);
    try {
      await Promise.race([clearLocalSession(), limit.promise]);
    } finally {
      limit.cancel();
      setState(SIGNED_OUT);
    }
  }

  return (
    <SessionContext value={{ status: state.status, email: state.email, signIn, register, signOut }}>
      {children}
    </SessionContext>
  );
}
