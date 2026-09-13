import { create } from "zustand";
import { adminApi, SUPER_ADMIN_EMAIL, isSuperAdmin } from "@/lib/adminApi";

export interface AdminRecord {
  id: string;
  email: string;
  name: string;
  number: string;
  addedAt: Date;
  isPrimary: boolean;
}

interface AdminState {
  admins: AdminRecord[];
  isLoading: boolean;
  error: string | null;
  fetchAdmins: () => Promise<void>;
  addAdmin: (data: {
    name: string;
    email: string;
    number: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  removeAdmin: (id: string) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  admins: [
    // Super admin is always present (hardcoded)
    {
      id: "super-admin-1",
      email: SUPER_ADMIN_EMAIL,
      name: "Super Admin",
      number: "",
      addedAt: new Date("2024-01-01"),
      isPrimary: true,
    },
  ],
  isLoading: false,
  error: null,

  fetchAdmins: async () => {
    // For now, admins are managed locally + via API
    // The backend doesn't have a "get all admins" endpoint
    // So we keep the local state and sync with API on add/remove
  },

  addAdmin: async (data) => {
    set({ isLoading: true, error: null });
    
    try {
      // Check if admin already exists locally
      const existing = get().admins.find(
        (a) => a.email.toLowerCase() === data.email.toLowerCase()
      );
      if (existing) {
        set({ isLoading: false, error: "An admin with this email already exists." });
        return { success: false, error: "An admin with this email already exists." };
      }

      // Call backend API to register admin
      const response = await adminApi.register({
        name: data.name,
        email: data.email,
        number: data.number,
        password: data.password,
      });

      if (response.error) {
        set({ isLoading: false, error: response.error });
        return { success: false, error: response.error };
      }

      if (response.data?.user) {
        const newAdmin: AdminRecord = {
          id: response.data.user.id,
          email: response.data.user.email.toLowerCase(),
          name: response.data.user.name,
          number: response.data.user.number || data.number,
          addedAt: new Date(),
          isPrimary: false,
        };
        set((state) => ({ 
          admins: [...state.admins, newAdmin],
          isLoading: false 
        }));
        return { success: true };
      }

      set({ isLoading: false, error: "Failed to create admin" });
      return { success: false, error: "Failed to create admin" };
    } catch (_err) {
      const errorMsg = "Network error. Please try again.";
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  removeAdmin: async (id) => {
    const current = get().admins.find((a) => a.id === id);
    
    // Cannot remove primary/super admin
    if (current?.isPrimary || isSuperAdmin(current?.email)) {
      return { success: false, error: "Cannot remove the super admin." };
    }

    set({ isLoading: true, error: null });

    try {
      // Call backend API to delete admin
      const response = await adminApi.deleteAdmin(id);

      if (response.error) {
        set({ isLoading: false, error: response.error });
        return { success: false, error: response.error };
      }

      // Remove from local state
      set((state) => ({ 
        admins: state.admins.filter((a) => a.id !== id),
        isLoading: false 
      }));
      return { success: true };
    } catch (_err) {
      const errorMsg = "Network error. Please try again.";
      set({ isLoading: false, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  clearError: () => set({ error: null }),
}));
