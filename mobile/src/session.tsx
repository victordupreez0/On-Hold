import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import * as api from './api';
import { supabase } from './supabase';
import type { User } from './types';

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
      try {
        setUser(await api.getMe());
      } catch {
        setUser(null);
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
