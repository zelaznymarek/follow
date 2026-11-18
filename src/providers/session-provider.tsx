import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createContext, type ReactNode, useEffect, useState } from 'react';

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
  weakPassword: 'Use at least 8 characters, including letters and digits.',
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

/**
 * Start-up decision. A session from `getSession()` signs the user in. When the session could not be
 * refreshed because the network is unreachable, the stored session is trusted (offline rule);
 * anything else signs the user out.
 */
async function resolveStartupState(supabase: SupabaseClient): Promise<AuthState> {
  let error: unknown = null;
  try {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (data.session) {
      return signedIn(data.session.user.email);
    }
    error = sessionError;
  } catch (thrown) {
    error = thrown;
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
          if (session) {
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

  async function signOut(): Promise<void> {
    try {
      // `local` clears this device's session without needing the network.
      await getSupabase().auth.signOut({ scope: 'local' });
    } finally {
      setState(SIGNED_OUT);
    }
  }

  return (
    <SessionContext value={{ status: state.status, email: state.email, signIn, register, signOut }}>
      {children}
    </SessionContext>
  );
}
