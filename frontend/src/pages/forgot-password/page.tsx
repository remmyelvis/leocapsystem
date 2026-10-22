import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthAlert, AuthField, AuthHeading, AuthLinkButton, AuthSubmit, BackLink } from "@/components/auth/AuthField";
import { applicantApi } from "@/lib/applicantApi";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema), mode: "onTouched" });

  // Cursor in the box on a desktop screen (also when someone comes back from "use a different email")
  useEffect(() => {
    if (!submitted && window.matchMedia("(min-width: 1024px)").matches) setFocus("email");
  }, [submitted, setFocus]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await applicantApi.forgotPassword(data.email);

      if (res.error) {
        setError(res.error);
        return;
      }

      setSubmittedEmail(data.email);
      setSubmitted(true);
      toast.success("Check your email");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="forgot">
      <BackLink to="/login/applicant">Back to sign in</BackLink>

      {!submitted ? (
        <>
          <AuthHeading title="Forgot your password?" sub="Enter your email and we will send you a link to choose a new one." />

          <div className="mt-6">
            {error && <AuthAlert>{error}</AuthAlert>}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <AuthField
                id="forgot-email"
                label="Email address"
                icon={Mail}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <AuthSubmit loading={isSubmitting} loadingLabel="Sending…">
                Send reset link
              </AuthSubmit>
            </form>

            <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
              If the email is registered, the link arrives within a few minutes. It works once and expires in 1 hour. Check your spam folder if you do not see it.
            </p>
          </div>
        </>
      ) : (
        <div role="status">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/60 motion-safe:animate-auth-rise">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <AuthHeading
            title="Check your email"
            sub={
              <>
                If <strong className="break-all font-semibold text-slate-700">{submittedEmail}</strong> is registered, we have sent it a link to choose a new password.
              </>
            }
          />
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
            The link works once and expires in 1 hour. Nothing there? Check your spam folder.
          </p>
          <div className="mt-6 space-y-3">
            <AuthLinkButton to="/login/applicant">Back to sign in</AuthLinkButton>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="flex min-h-[44px] w-full items-center justify-center text-[14px] font-semibold text-brand-blue hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      )}

      {!submitted && (
        <p className="mt-6 text-center text-[14px] text-slate-600">
          Remember it?{" "}
          <Link to="/login/applicant" className="font-semibold text-brand-blue hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
