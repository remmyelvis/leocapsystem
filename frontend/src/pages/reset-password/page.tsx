import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthAlert, AuthHeading, AuthLinkButton, AuthSubmit, BackLink, MatchNote, PasswordField, StrengthMeter } from "@/components/auth/AuthField";
import { applicantApi } from "@/lib/applicantApi";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the link's token out of the address bar and the browser history once it has been read
  useEffect(() => {
    if (token) window.history.replaceState(null, "", window.location.pathname);
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema), mode: "onTouched" });

  const password = watch("password") ?? "";
  const confirm = watch("confirmPassword") ?? "";

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await applicantApi.resetPassword(token, data.password);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success("Password updated. Please sign in.");
      navigate("/login/applicant");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout variant="reset">
      <BackLink to="/login/applicant">Back to sign in</BackLink>
      <AuthHeading title="Choose a new password" sub="Enter it twice to be sure you typed it right." />

      <div className="mt-6">
        {!token ? (
          <>
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700 ring-1 ring-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>This page needs the link from your reset email. Reset links work once and expire after 1 hour.</span>
            </div>
            <AuthLinkButton to="/forgot-password">Request a new link</AuthLinkButton>
          </>
        ) : (
          <>
            {error && (
              <AuthAlert>
                {error}{" "}
                <Link to="/forgot-password" className="font-semibold underline">
                  Request a new link
                </Link>
              </AuthAlert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <PasswordField
                id="reset-password"
                label="New password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                error={errors.password?.message}
                below={<StrengthMeter value={password} />}
                {...register("password")}
              />
              <PasswordField
                id="reset-confirm"
                label="Confirm new password"
                autoComplete="new-password"
                placeholder="Type it again"
                error={errors.confirmPassword?.message}
                below={<MatchNote show={!!confirm && confirm === password} />}
                {...register("confirmPassword")}
              />
              <AuthSubmit loading={isSubmitting} loadingLabel="Saving…">
                Save new password
              </AuthSubmit>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
