import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HRShell from "@/components/global/HRShell";

export default function HRLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login/hr" replace />;
  }

  if (user.role !== "HR_IDEON" && user.role !== "HR_NAKAMA") {
    return <Navigate to="/login" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-slate-50 items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <HRShell
        user={{
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
          role: user.role,
        }}
      >
        <Outlet />
      </HRShell>
    </Suspense>
  );
}
