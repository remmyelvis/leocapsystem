import { Suspense } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminShell from "@/components/global/AdminShell";

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login/admin" replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-slate-50 items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AdminShell
        user={{
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
          role: user.role,
        }}
      >
        <Outlet />
      </AdminShell>
    </Suspense>
  );
}
