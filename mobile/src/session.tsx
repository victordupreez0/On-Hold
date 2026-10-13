import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import * as api from './api';
import { ApiError } from './api';
import { supabase } from './supabase';
import type { User } from './types';

// Only these events mean the profile might actually be different; a token
// refresh (hourly) or a tab regaining focus shouldn't re-fetch or, on a
// transient network/server hiccup, sign someone out of a session that's
// still perfectly valid.
const PROFILE_EVENTS = new Set(['SIGNED_IN', 'INITIAL_SESSION', 'USER_UPDATED']);

type Session = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  update: (patch: Parameters<typeof api.updateProfile>[0]) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the Supabase session on launch (fixes "reload signs you out"),
  // then keep the profile in sync with sign-in/out/refresh events.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (!authSession) {
        setUser(null);
        setLoading(false);
        return;
      }
      if (!PROFILE_EVENTS.has(event)) return; // e.g. TOKEN_REFRESHED -- session is still good, nothing to refetch
      try {
        setUser(await api.getMe());
      } catch (e) {
        // Only a real "that token is no good" clears the session. A network
        // blip or a cold-starting API shouldn't sign out someone who's
        // still validly logged in.
        if (e instanceof ApiError && e.status === 401) setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: Session = {
    user,
    loading,
    setUser,
    update: async (patch) => setUser(await api.updateProfile(patch)),
    signOut: async () => {
      await api.signOut();
      setUser(null);
    },
  };
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** For screens behind the auth redirect, where a user always exists. */
export function useUser() {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}
