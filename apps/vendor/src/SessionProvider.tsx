import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { signOut as endSession, type StoredSession } from './auth';
import { clearCache } from './cache';
import { restore, toSession, type VendorSession } from './session';

/**
 * The signed-in operator, for the screens.
 *
 * `useSession()` is only callable inside the tab subtree, which the layout
 * mounts only when somebody is signed in — so it returns a session rather
 * than `VendorSession | null` and no screen carries a null check for a state
 * it cannot be rendered in.
 */

interface SessionContextValue {
  readonly session: VendorSession | null;
  readonly signedIn: (stored: StoredSession) => void;
  readonly signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Restored synchronously on first render from the same module-scope read
  // the i18n instance used, so the two cannot disagree about the locale.
  const [session, setSession] = useState<VendorSession | null>(() => restore());

  const signedIn = useCallback((stored: StoredSession) => {
    setSession(toSession(stored));
  }, []);

  const signOut = useCallback(() => {
    const token = session?.accessToken;
    // The local copy goes first so the UI cannot be left signed in waiting on
    // a network that may not answer; the API call revokes the row behind it.
    setSession(null);
    // One phone at a dive centre is several guides. The next person to sign in
    // must not find the last one's manifest still cached on it.
    void clearCache();
    if (token !== undefined) void endSession(token);
  }, [session]);

  const value = useMemo(
    () => ({ session, signedIn, signOut }),
    [session, signedIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Inside the tabs, where a session is guaranteed. */
export function useSession(): VendorSession {
  const value = useContext(SessionContext);
  if (value === null) throw new Error('useSession must be used inside a SessionProvider.');
  if (value.session === null) {
    throw new Error('useSession was called outside the signed-in tree.');
  }
  return value.session;
}

/** For the layout and the sign-in screen, where it may legitimately be null. */
export function useSessionState(): SessionContextValue {
  const value = useContext(SessionContext);
  if (value === null) throw new Error('useSessionState must be used inside a SessionProvider.');
  return value;
}
