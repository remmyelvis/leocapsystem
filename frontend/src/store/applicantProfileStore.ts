/**
 * applicantProfileStore
 *
 * Persisted store that caches the server-side applicant profile data fetched
 * on dashboard load. Drives the accurate profile-completion calculation.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApplicantDoc } from "@/lib/applicantApi";

export interface ApplicantProfileData {
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

interface ApplicantProfileState {
  profiles: Record<string, ApplicantProfileData>;
  setProfile: (data: ApplicantProfileData) => void;
  getProfile: (userId: string) => ApplicantProfileData | undefined;
  clearProfile: (userId: string) => void;
}

export const useApplicantProfileStore = create<ApplicantProfileState>()(
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
    { name: "leocap_applicant_profiles" }
  )
);
