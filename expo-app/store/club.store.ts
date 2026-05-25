import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';

type ClubState = {
  activeClubId: string | null;
  onboardingCompleted: boolean;
  pendingInviteCode: string | null;
  _hasHydrated: boolean;
  setActiveClubId: (id: string | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setPendingInviteCode: (code: string | null) => void;
  _setHasHydrated: (v: boolean) => void;
};

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      activeClubId: null,
      onboardingCompleted: false,
      pendingInviteCode: null,
      _hasHydrated: false,
      setActiveClubId: (id) => set({ activeClubId: id }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'club-store',
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({
        // CRITICAL: _hasHydrated and _setHasHydrated are EXCLUDED (Pitfall 7)
        activeClubId: state.activeClubId,
        onboardingCompleted: state.onboardingCompleted,
        pendingInviteCode: state.pendingInviteCode,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);
