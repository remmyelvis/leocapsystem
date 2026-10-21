import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";

interface AuthState {
  currentUser: User | null;
  setUser: (user: User) => void;
  updateUser: (patch: Partial<User>) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      setUser: (user) => set({ currentUser: user }),
      updateUser: (patch) =>
        set((state) => ({ currentUser: state.currentUser ? { ...state.currentUser, ...patch } : null })),
      clearUser: () => set({ currentUser: null }),
    }),
    {
      name: "leocap_auth_store",
    }
  )
);
