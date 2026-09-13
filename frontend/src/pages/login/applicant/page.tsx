

import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/global/BrandLogo";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { applicantApi } from "@/lib/applicantApi";
import { setToken, clearToken, clearAdminUser } from "@/lib/apiClient";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types/user";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function getRoleHome(role: string, applicantType: string): { url: string; userRole: UserRole } {
  const r = role?.toLowerCase();
  const t = applicantType?.toLowerCase();

  if (r === "hr") {
    return t === "nakama"
      ? { url: "/hr/nakama", userRole: "HR_NAKAMA" }
      : { url: "/hr/ideon", userRole: "HR_IDEON" };
  }
  if (r === "finance") {
    return t === "nakama"
      ? { url: "/finance", userRole: "FINANCE_NAKAMA" }
      : { url: "/finance", userRole: "FINANCE_IDEON" };
  }
  return { url: "/dashboard", userRole: "USER" };
}

export default function ApplicantLoginPage() {
  const navigate = useNavigate();
  const setStoreUser = useAuthStore((s) => s.setUser);
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

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
      const { url: redirectUrl, userRole } = getRoleHome(
        applicant.role ?? "",
        applicant.applicant_type ?? ""
      );

      setToken(access_token, "applicant");
      const userData = {
        id: applicant.id,
        name: applicant.name,
        email: applicant.email,
        role: userRole,
        createdAt: new Date(),
      };
      setStoreUser(userData);
      setUser(userData);

      // Persist company so the apply page can route without waiting for session
      if (applicant.applicant_type) {
        localStorage.setItem("leocap_user_company", applicant.applicant_type);
      }

      // Populate NextAuth session so middleware can read the role
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      await new Promise((r) => setTimeout(r, 400));
      navigate(redirectUrl);

    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/30 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-800 to-red-600" />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-1">
                <BrandLogo size="lg" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 mt-5">Welcome back</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to your account</p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <Link to="/forgot-password"
                    className="text-xs text-brand-blue hover:underline font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl mt-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-slate-500 mt-6">
              New applicant?{" "}
              <Link to="/register" className="text-brand-blue font-semibold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Back to portal selector */}
        <p className="text-center text-slate-500 text-sm mt-6">
          <Link to="/login"
            className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to portal selection
          </Link>
        </p>
      </div>
    </div>
  );
}
