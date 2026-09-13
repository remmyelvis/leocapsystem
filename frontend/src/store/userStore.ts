import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  idNumber: string;
  phoneNumber: string;
  createdAt: string;
}

interface UserStoreState {
  registeredUsers: RegisteredUser[];
  addUser: (user: RegisteredUser) => void;
  findUserByEmail: (email: string) => RegisteredUser | undefined;
  findUserById: (id: string) => RegisteredUser | undefined;
}

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      registeredUsers: [],

      addUser: (user) =>
        set((state) => ({
          registeredUsers: [...state.registeredUsers, user],
        })),

      findUserByEmail: (email) =>
        get().registeredUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        ),

      findUserById: (id) =>
        get().registeredUsers.find((u) => u.id === id),
    }),
    {
      name: "leocap-user-store",
    }
  )
);
