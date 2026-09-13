/**
 * personalDetailsStore
 *
 * Locally persisted overrides for personal detail fields that are not yet
 * returned from the session for HR / Finance staff users.
 *
 * Keyed by userId so multiple users on the same device stay separate.
 *
 * When real staff profile update APIs are available, replace the `save`
 * action with an API call and sync the values back into the NextAuth session.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PersonalDetailsOverride {
  phoneNumber?: string;
  idNumber?: string;
  kraPin?: string;
}

interface PersonalDetailsState {
  /** Map of userId → override data */
  overrides: Record<string, PersonalDetailsOverride>;
  /** Save / merge override data for a specific user */
  saveOverride: (userId: string, data: PersonalDetailsOverride) => void;
  /** Get override data for a specific user */
  getOverride: (userId: string) => PersonalDetailsOverride | undefined;
}

export const usePersonalDetailsStore = create<PersonalDetailsState>()(
  persist(
    (set, get) => ({
      overrides: {},
      saveOverride: (userId, data) =>
        set((state) => ({
          overrides: {
            ...state.overrides,
            [userId]: { ...state.overrides[userId], ...data },
          },
        })),
      getOverride: (userId) => get().overrides[userId],
    }),
    {
      name: "leocap_personal_details",
    }
  )
);
