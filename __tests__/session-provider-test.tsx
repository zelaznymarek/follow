import {
  AuthApiError,
  type AuthChangeEvent,
  AuthRetryableFetchError,
  type Session,
} from '@supabase/supabase-js';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSession } from '@/hooks/use-session';
import {
  AUTH_MESSAGES,
  type SessionContextValue,
  SessionProvider,
  STARTUP_TIMEOUT_MS,
} from '@/providers/session-provider';

type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

const mockAuth = {
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
};

jest.mock('@/lib/supabase', () => ({
  SUPABASE_STORAGE_KEY: 'follow-auth',
  getSupabase: () => ({ auth: mockAuth }),
}));

const storage = new Map<string, string>();
const unsubscribe = jest.fn();
let emitAuthEvent: AuthCallback;
let session: SessionContextValue;

function fakeSession(email: string) {
  return {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_at: 0,
    token_type: 'bearer',
    user: { id: 'user-1', email },
  };
}

function Probe() {
  session = useSession();
  return (
    <Text testID="session">
      {session.status}|{session.email ?? 'none'}
    </Text>
  );
}

async function renderProvider() {
  await render(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  );
}

async function expectSession(text: string) {
  expect(await screen.findByText(text)).toBeOnTheScreen();
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
    },
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  storage.clear();
  mockAuth.onAuthStateChange.mockImplementation((callback: AuthCallback) => {
    emitAuthEvent = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

describe('<SessionProvider /> start-up', () => {
  test('a stored valid session signs the user in', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: fakeSession('a@b.co') },
      error: null,
    });

    await renderProvider();

    await expectSession('signed-in|a@b.co');
  });

  test('no session signs the user out', async () => {
    await renderProvider();

    await expectSession('signed-out|none');
  });

  test('offline rule: a retryable error with a stored session keeps the user signed in', async () => {
    storage.set('follow-auth', JSON.stringify(fakeSession('offline@b.co')));
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });

    await renderProvider();

    await expectSession('signed-in|offline@b.co');
  });

  test('a retryable error with nothing stored signs the user out', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });

    await renderProvider();

    await expectSession('signed-out|none');
  });

  describe('when the server does not answer in time', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockAuth.getSession.mockReturnValue(new Promise(() => {}));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('a stored session signs the user in after the start-up timeout', async () => {
      storage.set('follow-auth', JSON.stringify(fakeSession('slow@b.co')));
      await renderProvider();
      expect(screen.getByText('loading|none')).toBeOnTheScreen();

      await act(async () => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS));

      expect(screen.getByText('signed-in|slow@b.co')).toBeOnTheScreen();
    });

    test('nothing stored signs the user out after the start-up timeout', async () => {
      await renderProvider();

      await act(async () => jest.advanceTimersByTime(STARTUP_TIMEOUT_MS));

      expect(screen.getByText('signed-out|none')).toBeOnTheScreen();
    });
  });

  test('unsubscribes from auth events on unmount', async () => {
    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );
    await expectSession('signed-out|none');

    await screen.unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe('<SessionProvider /> auth events', () => {
  test('SIGNED_OUT signs the user out', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: fakeSession('a@b.co') },
      error: null,
    });
    await renderProvider();
    await expectSession('signed-in|a@b.co');

    await act(async () => emitAuthEvent('SIGNED_OUT', null));

    await expectSession('signed-out|none');
  });

  test('INITIAL_SESSION with null does not override a stored-session decision', async () => {
    storage.set('follow-auth', JSON.stringify(fakeSession('offline@b.co')));
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    });
    await renderProvider();
    await expectSession('signed-in|offline@b.co');

    await act(async () => emitAuthEvent('INITIAL_SESSION', null));

    await expectSession('signed-in|offline@b.co');
  });
});

describe('<SessionProvider /> actions', () => {
  test('signIn with invalid credentials returns a user-facing message', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    });
    await renderProvider();
    await expectSession('signed-out|none');

    const result = await session.signIn('a@b.co', 'wrong-password1');

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.co',
      password: 'wrong-password1',
    });
    expect(result).toEqual({ ok: false, message: AUTH_MESSAGES.invalidCredentials });
  });

  test('signOut clears the session with local scope', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: fakeSession('a@b.co') },
      error: null,
    });
    mockAuth.signOut.mockResolvedValue({ error: null });
    await renderProvider();
    await expectSession('signed-in|a@b.co');

    await act(() => session.signOut());

    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    await expectSession('signed-out|none');
  });
});

describe('useSession()', () => {
  test('throws outside <SessionProvider>', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(render(<Probe />)).rejects.toThrow('inside <SessionProvider>');

    consoleError.mockRestore();
  });
});
