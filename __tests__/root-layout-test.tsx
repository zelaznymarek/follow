import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import type { SessionStatus } from '@/hooks/use-session';

let mockStatus: SessionStatus = 'loading';

jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({
    status: mockStatus,
    email: mockStatus === 'signed-in' ? 'a@b.co' : null,
    signIn: jest.fn(),
    register: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// The real provider talks to Supabase; the gate only reads the (mocked) hook.
jest.mock('@/providers/session-provider', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
}));

// My lists loads from Supabase; the gate test only needs the screen to render.
jest.mock('@/lib/shopping-lists', () => ({
  fetchLists: () => Promise.resolve({ ok: true, data: [] }),
}));

// The splash overlay animates the native splash away; it is not part of the gate.
jest.mock('@/components/animated-icon', () => ({
  ...jest.requireActual('@/components/animated-icon'),
  AnimatedSplashOverlay: () => null,
}));

describe('root layout gate', () => {
  test('signed out: shows sign-in, not My lists', async () => {
    mockStatus = 'signed-out';
    await renderRouter('./src/app');

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.queryByText('No lists yet')).not.toBeOnTheScreen();
  });

  test('signed in: lands on My lists, not sign-in', async () => {
    mockStatus = 'signed-in';
    await renderRouter('./src/app');

    expect(await screen.findByText('No lists yet')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeOnTheScreen();
  });

  test('loading: no app content renders', async () => {
    mockStatus = 'loading';
    await renderRouter('./src/app');

    expect(screen.queryByText('No lists yet')).not.toBeOnTheScreen();
    expect(screen.queryByText('Lists')).not.toBeOnTheScreen();
  });
});
