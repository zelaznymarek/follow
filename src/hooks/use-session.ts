import { use } from 'react';

import { SessionContext, type SessionContextValue } from '@/providers/session-provider';

export type { AuthResult, SessionStatus } from '@/providers/session-provider';

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession() must be used inside <SessionProvider>.');
  }
  return value;
}
