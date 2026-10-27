import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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

// No sub-heading: the label above the form (and, on a desktop, the brand panel) already says which portal this is.
const COPY: Record<AuthVariant, { title: string; submit: string; emailAutocomplete: string; placeholder: string }> = {
  applicant: {
    title: "Welcome back",
    submit: "Sign in",
    emailAutocomplete: "email",
    placeholder: "you@example.com",
  },
  admin: {
    title: "Admin sign-in",
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
  const { search, state } = useLocation(); // search keeps ?session=expired when someone goes to the other sign-in
  // Right after sign-up the sign-in page opens with the address just used already in the email box. It travels in the
  // navigation state (see the register page), never in the web address.
  const signedUpEmail: string = typeof state?.email === "string" ? state.email : "";
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema), mode: "onTouched", defaultValues: { email: signedUpEmail } });

  // Put the cursor on a desktop screen (on a phone that would only throw the keyboard up): in the password box when the
  // email is already there, otherwise in the email box.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setFocus(signedUpEmail ? "password" : "email");
  }, [setFocus, signedUpEmail]);

  return (
    <>
      <AuthHeading title={copy.title} />

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
                <Link to="/forgot-password" className="tap-btn inline-flex min-h-[28px] items-center text-[12px] font-semibold text-brand-blue hover:underline">
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
          <p className="mt-6 text-center text-[14px] text-slate-600">
            New applicant?{" "}
            <Link to="/register" className="font-semibold text-brand-blue hover:underline">
              Create an account
            </Link>
          </p>
        ) : (
          <>
            <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-center text-[12px] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
              Admin access is by invitation only. Contact your system administrator if you need access.
            </p>
            <p className="mt-4 text-center text-[14px] text-slate-600">
              Applicant or staff?{" "}
              <Link to={{ pathname: "/login/applicant", search }} className="tap-link font-semibold text-brand-blue hover:underline">
                Sign in here
              </Link>
            </p>
          </>
        )}
      </div>
    </>
  );
}
