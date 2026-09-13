

import { useState, useEffect } from "react";
import { apiCall } from "@/lib/apiClient";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  Building2,
  UserCheck,
  Briefcase,
} from "lucide-react";
import BrandLogo from "@/components/global/BrandLogo";
import { applicantApi } from "@/lib/applicantApi";

const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone_number: z
      .string()
      .regex(
        /^(\+254|0)[17]\d{8}$/,
        "Enter a valid Kenyan phone (e.g. 0712345678 or +254712345678)"
      ),
    applicant_type: z.string().min(1, "Please select your company or loan type"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    privacyAccepted: z.literal(true, {
      error: "You must accept the Privacy Policy to create an account",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamic companies
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await apiCall<any>("/api/companies?all=true");
        // Always append Personal at the end
        const fetched = res.data.companies || [];
        setCompanies([...fetched, { code: "personal", name: "Personal" }]);
      } catch (e) {
        console.error("Failed to fetch companies:", e);
        // Fallback
        setCompanies([{ code: "personal", name: "Personal" }]);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const selectedType = watch("applicant_type");
  const isPrivacyAccepted = watch("privacyAccepted");

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await applicantApi.register({
        name: data.name,
        email: data.email,
        phone_number: data.phone_number,
        password: data.password,
        applicant_type: data.applicant_type,
      });

      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }

      toast.success("Account created successfully! Please sign in.");
      navigate("/login/applicant");
    } catch {
      const msg = "Something went wrong. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/30 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-800 to-red-600" />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="text-center mb-7">
              <div className="flex justify-center mb-1">
                <BrandLogo size="md" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 mt-4">
                Create your account
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Join thousands of Kenyan professionals
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register("name")}
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Mwangi"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>
                )}
              </div>

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
                    placeholder="jane@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register("phone_number")}
                    type="tel"
                    autoComplete="tel"
                    placeholder="0712345678"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
                  />
                </div>
                {errors.phone_number && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.phone_number.message}
                  </p>
                )}
              </div>

              {/* Company / Applicant Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Your Company
                </label>
                <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      {...register("applicant_type")}
                      className={`w-full pl-11 pr-10 py-3 rounded-xl border-2 bg-gray-50 focus:bg-white transition-colors appearance-none ${
                        errors.applicant_type 
                          ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10" 
                          : "border-gray-100 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
                      }`}
                      disabled={loadingCompanies}
                    >
                      <option value="" disabled hidden>
                        {loadingCompanies ? "Loading companies..." : "Select your company..."}
                      </option>
                      {companies.map((comp) => (
                        <option key={comp.code} value={comp.code}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                {errors.applicant_type && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.applicant_type.message}
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
                    autoComplete="new-password"
                    placeholder="Min. 6 characters"
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
                  <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    {...register("confirmPassword")}
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300"
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1.5">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Privacy Policy */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-blue-50 transition-colors select-none">
                  <input
                    type="checkbox"
                    {...register("privacyAccepted")}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-900 cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    I have read and understood the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a> and consent to the processing of my personal data in accordance with the Data Protection Act, 2019.
                  </span>
                </label>
                {errors.privacyAccepted && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.privacyAccepted.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading || !isPrivacyAccepted}
                className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl mt-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account?{" "}
              <Link to="/login/applicant"
                className="text-brand-blue font-semibold hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <p className="text-center text-blue-200/80 text-sm mt-6">
          <Link to="/" className="hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
