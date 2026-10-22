import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, TriangleAlert } from "lucide-react";
import SessionExpiredNotice from "@/components/global/SessionExpiredNotice";
import type { AuthVariant } from "./AuthLayout";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

const COPY: Record<AuthVariant, { title: string; sub: string; submit: string; emailAutocomplete: string; placeholder: string }> = {
  applicant: {
    title: "Welcome back",
    sub: "Applicants, HR and Finance staff sign in here.",
    submit: "Sign in",
    emailAutocomplete: "email",
    placeholder: "you@example.com",
  },
  admin: {
    title: "Admin sign-in",
    sub: "For Leocap administrators only.",
    submit: "Sign in to admin console",
    emailAutocomplete: "username",
    placeholder: "name@leocapinvest.co.ke",
  },
};

const inputBase =
  "w-full min-h-[48px] rounded-xl border bg-white pl-11 text-[15px] text-slate-900 placeholder:text-slate-400 transition-[border-color,box-shadow] focus:outline-none focus:ring-4";
const inputOk = "border-slate-200 hover:border-slate-300 focus:border-brand-blue focus:ring-brand-blue/10";
const inputBad = "border-red-300 focus:border-red-400 focus:ring-red-100";

export default function LoginForm({
  variant,
  onSubmit,
  error,
  isLoading,
}: {
  variant: AuthVariant;
  onSubmit: (data: LoginFormData) => void | Promise<void>;
  error: string | null;
  isLoading: boolean;
}) {
  const copy = COPY[variant];
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), mode: "onTouched" });

  // Put the cursor in the email box on a desktop screen; on a phone that would only throw the keyboard up.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setFocus("email");
  }, [setFocus]);

  const emailId = `${variant}-email`;
  const passwordId = `${variant}-password`;

  return (
    <>
      <h1 className="mt-7 text-[28px] font-bold leading-tight tracking-[-0.015em] text-slate-900">{copy.title}</h1>
      <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">{copy.sub}</p>

      <div className="mt-6">
        <SessionExpiredNotice />
        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700 ring-1 ring-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <label htmlFor={emailId} className="mb-1.5 block text-[13px] font-semibold text-slate-700">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id={emailId}
                {...register("email")}
                type="email"
                autoComplete={copy.emailAutocomplete}
                placeholder={copy.placeholder}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${emailId}-err` : undefined}
                className={`${inputBase} pr-4 ${errors.email ? inputBad : inputOk}`}
              />
            </div>
            {errors.email && (
              <p id={`${emailId}-err`} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" /> {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor={passwordId} className="block text-[13px] font-semibold text-slate-700">
                Password
              </label>
              {variant === "applicant" && (
                <Link to="/forgot-password" className="inline-flex min-h-[28px] items-center text-[12px] font-semibold text-brand-blue hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id={passwordId}
                {...register("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Your password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? `${passwordId}-err` : capsOn ? `${passwordId}-caps` : undefined}
                onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                className={`${inputBase} pr-12 ${errors.password ? inputBad : inputOk}`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id={`${passwordId}-err`} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" /> {errors.password.message}
              </p>
            )}
            {capsOn && !errors.password && (
              <p id={`${passwordId}-caps`} role="status" className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-amber-700">
                <TriangleAlert className="h-3.5 w-3.5 flex-shrink-0" /> Caps Lock is on
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-blue text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(15,44,89,0.65)] transition-all hover:bg-[#0b2246] hover:shadow-[0_12px_28px_-10px_rgba(15,44,89,0.75)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                {copy.submit}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {variant === "applicant" ? (
          <p className="mt-6 text-center text-[14px] text-slate-500">
            New applicant?{" "}
            <Link to="/register" className="font-semibold text-brand-blue hover:underline">
              Create an account
            </Link>
          </p>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-[12px] leading-relaxed text-slate-500 ring-1 ring-slate-200/70">
            Admin access is by invitation only. Contact your system administrator if you need access.
          </p>
        )}
      </div>
    </>
  );
}
