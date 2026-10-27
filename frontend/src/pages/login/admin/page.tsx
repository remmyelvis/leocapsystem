

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm, { type LoginFormData } from "@/components/auth/LoginForm";
import { useDemoSignIn } from "@/components/demo/demo";
import { adminApi } from "@/lib/adminApi";
import { setToken, setAdminUser, clearToken, clearAdminUser, isServerDown, SERVER_DOWN_MESSAGE } from "@/lib/apiClient";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    clearToken();
    clearAdminUser();
    setIsLoading(true);
    setError(null);

    try {
      const res = await adminApi.login(data.email, data.password);

      if (isServerDown(res.status)) {
        setError(SERVER_DOWN_MESSAGE);
        return;
      }

      // Check if login was successful (backend returns user object with role)
      const user = res.data?.user;
      const userRole = user?.role?.toLowerCase();

      if (!user || userRole !== "admin") {
        // The server says "please register" for an unknown email, which means nothing on this portal.
        setError(
          res.status === 401
            ? "Invalid email or password. This portal is for admin accounts only."
            : res.error || "Access denied. This portal is for admin accounts only."
        );
        return;
      }

      // Persist user info (token may be in cookies or use placeholder)
      const token = res.data?.access_token || "cookie-auth";
      setToken(token, "admin");
      const newAdminUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        number: user.number || "",
        role: user.role === "admin" ? "ADMIN" : user.role,
      };
      setAdminUser(newAdminUser);
      setUser(newAdminUser);

      navigate("/admin/dashboard");

    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useDemoSignIn(onSubmit);

  return (
    <AuthLayout variant="admin">
      <LoginForm variant="admin" onSubmit={onSubmit} error={error} isLoading={isLoading} hidePasswordHint />
    </AuthLayout>
  );
}
