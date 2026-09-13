

import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/global/BrandLogo";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Shield } from "lucide-react";
import { adminApi, SUPER_ADMIN_EMAIL, isSuperAdmin } from "@/lib/adminApi";
import { setToken, setAdminUser, clearToken, clearAdminUser } from "@/lib/apiClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const navigate = useNavigate();
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
      // ── Super Admin (hardcoded credentials) ─────────────────────────────
      if (isSuperAdmin(data.email)) {
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password.");
          return;
        }

        const adminUser = {
          id: "super-admin-1",
          name: "Super Admin",
          email: SUPER_ADMIN_EMAIL,
          number: "",
          role: "ADMIN",
        };
        setAdminUser(adminUser);
        setUser(adminUser);

        await new Promise((r) => setTimeout(r, 400));
        navigate("/admin/dashboard");

        return;
      }

      // ── Regular Admin (backend API) ──────────────────────────────────────
      const res = await adminApi.login(data.email, data.password);

      // Check if login was successful (backend returns user object with role)
      const user = res.data?.user;
      const userRole = user?.role?.toLowerCase();

      if (!user || userRole !== "admin") {
        setError(
          res.error ||
          "Access denied. This portal is for admin accounts only."
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

      // Populate NextAuth session so middleware allows /admin/* access
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      await new Promise((r) => setTimeout(r, 400));
      navigate("/admin/dashboard");

    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-slate-900" />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-3">
                <BrandLogo size="lg" />
              </div>

              {/* Admin badge */}
              <div className="inline-flex items-center gap-1.5 mt-3 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                <Shield className="h-3 w-3" />
                Admin Portal
              </div>

              <h1 className="text-xl font-bold text-slate-800 mt-4">Admin Sign In</h1>
              <p className="text-slate-400 text-sm mt-1">Sign in to manage loan applications</p>
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
                    autoComplete="username"
                    placeholder="admin@example.com"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
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
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
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
                  "Sign In to Admin Portal"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Admin access is by invitation only. Contact your system administrator if you need access.
              </p>
            </div>
          </div>
        </div>

        {/* Applicant link */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Not an admin?{" "}
          <Link to="/login" className="text-blue-300 hover:text-slate-900 font-semibold transition-colors">
            Go to applicant login
          </Link>
        </p>
      </div>
    </div>
  );
}
