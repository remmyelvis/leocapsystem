

import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/global/BrandLogo";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
} from "lucide-react";
import { applicantApi } from "@/lib/applicantApi";
import { toast } from "sonner";

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
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

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
      toast.success("Password reset email sent");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-blue-900/30 overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-800 to-red-600" />

          <div className="px-8 py-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-1">
                <BrandLogo size="md" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 mt-5">
                {submitted ? "Check your email" : "Forgot your password?"}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {submitted
                  ? "We've sent a new password to your email address"
                  : "Enter your email and we'll send you a new password"}
              </p>
            </div>

            {!submitted ? (
              <>
                {/* Error alert */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                  noValidate
                >
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

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl mt-2 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send New Password"
                    )}
                  </Button>
                </form>

                {/* Info message */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mt-6 text-sm text-brand-blue">
                  <p>
                    If the email exists in our system, you&apos;ll receive a new password
                    shortly. Check your spam folder if you don&apos;t see it.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Success state */}
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 mb-6">
                  <p className="font-semibold mb-1">Password reset email sent</p>
                  <p>
                    A new password has been sent to <strong>{submittedEmail}</strong>.
                    Check your inbox and use it to sign in.
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full bg-blue-900 hover:bg-slate-800 text-white font-bold h-12 rounded-xl text-sm"
                >
                  <Link to="/login">Back to Sign In</Link>
                </Button>
              </>
            )}

            {!submitted && (
              <p className="text-center text-sm text-slate-500 mt-6">
                Remember your password?{" "}
                <Link to="/login"
                  className="text-brand-blue font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Back to portal selector */}
        {!submitted && (
          <p className="text-center text-blue-200/80 text-sm mt-6">
            <Link to="/login"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to portal selection
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
