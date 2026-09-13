import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAdminUser, getUserType } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

// Re-export plain helpers from their own module so this file only
// contains React components/hooks (required for Vite Fast Refresh).
export { signIn, signOut } from '@/lib/authHelpers';

interface User {
  id: string;
  email: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser }: { children: React.ReactNode, initialUser?: User | null }) {
  const [user, setUser] = useState<User | null>(() => {
    if (initialUser) return initialUser;
    if (typeof window !== "undefined") {
      const type = getUserType();
      if (type === "admin") {
        return getAdminUser();
      } else if (type === "applicant") {
        return useAuthStore.getState().currentUser;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If not using initialUser, you could fetch session here
    if (!user && typeof window !== "undefined") {
      const type = getUserType();
      if (type === "applicant") {
        const applicantUser = useAuthStore.getState().currentUser;
        if (applicantUser) {
          setUser(applicantUser);
        }
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, setUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// NextAuth mock exports to minimize refactoring
export function useSession() {
  const { user, isLoading } = useAuth();
  return React.useMemo(() => ({
    data: user ? { user } : null,
    status: isLoading ? "loading" : (user ? "authenticated" : "unauthenticated")
  }), [user, isLoading]);
}
