import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  initialized: boolean;
  isLoggedIn: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,
  isLoggedIn: false,
  setSession: (session) => set({ session, isLoggedIn: !!session }),
  setInitialized: (initialized) => set({ initialized }),
}));
