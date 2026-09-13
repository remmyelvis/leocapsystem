/**
 * financeProfileStore
 *
 * Persisted store that caches the server-side applicant profile data fetched
 * on dashboard load. Drives the accurate profile-completion calculation.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApplicantDoc } from "@/lib/applicantApi";

export interface FinanceProfileData {
  userId: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  idNumber: string | null;
  kraPin: string | null;
  payrollNumber?: string | null;
  applicantType: string;
  docs: ApplicantDoc[];
  fetchedAt: string; // ISO timestamp
}

interface FinanceProfileState {
  profiles: Record<string, FinanceProfileData>;
  setProfile: (data: FinanceProfileData) => void;
  getProfile: (userId: string) => FinanceProfileData | undefined;
  clearProfile: (userId: string) => void;
}

export const useFinanceProfileStore = create<FinanceProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},
      setProfile: (data) =>
        set((state) => ({
          profiles: { ...state.profiles, [data.userId]: data },
        })),
      getProfile: (userId) => get().profiles[userId],
      clearProfile: (userId) =>
        set((state) => {
          const next = { ...state.profiles };
          delete next[userId];
          return { profiles: next };
        }),
    }),
    { name: "leocap_finance_profiles" }
  )
);
