import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail } from "lucide-react";
import SessionExpiredNotice from "@/components/global/SessionExpiredNotice";
import type { AuthVariant } from "./AuthLayout";
import { AuthAlert, AuthField, AuthHeading, AuthSubmit, PasswordField } from "./AuthField";

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

  return (
    <>
      <div className="mt-7">
        <AuthHeading title={copy.title} sub={copy.sub} />
      </div>

      <div className="mt-6">
        <SessionExpiredNotice />
        {error && <AuthAlert>{error}</AuthAlert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <AuthField
            id={`${variant}-email`}
            label="Email address"
            icon={Mail}
            type="email"
            autoComplete={copy.emailAutocomplete}
            placeholder={copy.placeholder}
            error={errors.email?.message}
            {...register("email")}
          />

          <PasswordField
            id={`${variant}-password`}
            label="Password"
            caps
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password?.message}
            labelRight={
              variant === "applicant" ? (
                <Link to="/forgot-password" className="inline-flex min-h-[28px] items-center text-[12px] font-semibold text-brand-blue hover:underline">
                  Forgot password?
                </Link>
              ) : undefined
            }
            {...register("password")}
          />

          <AuthSubmit loading={isLoading} loadingLabel="Signing in…">
            {copy.submit}
          </AuthSubmit>
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
