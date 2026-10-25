

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm, { type LoginFormData } from "@/components/auth/LoginForm";
import { useDemoSignIn } from "@/components/demo/demo";
import { applicantApi } from "@/lib/applicantApi";
import { setToken, clearToken, clearAdminUser } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import { fetchCompanyName } from "@/lib/company";
import type { UserRole } from "@/types/user";

function getRoleHome(role: string): { url: string; userRole: UserRole } {
  const r = role?.toLowerCase();
  if (r === "hr") return { url: "/hr/dashboard", userRole: "HR" };
  if (r === "finance") return { url: "/finance/dashboard", userRole: "FINANCE" };
  return { url: "/dashboard", userRole: "USER" };
}

export default function ApplicantLoginPage() {
  const navigate = useNavigate();
  const setStoreUser = useAuthStore((s) => s.setUser);
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    clearToken();
    clearAdminUser();
    setIsLoading(true);
    setError(null);

    try {
      const res = await applicantApi.login(data.email, data.password);

      if (res.error || !res.data) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      const { applicant, access_token } = res.data;
      const { url: redirectUrl, userRole } = getRoleHome(applicant.role ?? "");
      const company = applicant.applicant_type ?? "";
      const companyName =
        userRole !== "USER" && company ? await fetchCompanyName(company) : undefined;

      setToken(access_token, "applicant");
      const userData = {
        id: applicant.id,
        name: applicant.name,
        email: applicant.email,
        role: userRole,
        company,
        companyName,
        createdAt: new Date(),
      };
      setStoreUser(userData);
      setUser(userData);

      // Persist company so the apply page can route without waiting for session
      if (applicant.applicant_type) {
        localStorage.setItem("leocap_user_company", applicant.applicant_type);
      }

      navigate(redirectUrl);

    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useDemoSignIn(onSubmit);

  return (
    <AuthLayout variant="applicant">
      <LoginForm variant="applicant" onSubmit={onSubmit} error={error} isLoading={isLoading} />
    </AuthLayout>
  );
}
