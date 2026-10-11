import { createContext, useContext, useState, type ReactNode } from 'react';

import * as api from './api';
import type { User } from './types';

type Session = {
  user: User | null;
  setUser: (user: User | null) => void;
  update: (patch: Parameters<typeof api.updateProfile>[0]) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const value: Session = {
    user,
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
