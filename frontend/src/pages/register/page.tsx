import { useState, useEffect } from "react";
import { apiCall } from "@/lib/apiClient";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Mail, Phone, User } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { AuthAlert, AuthField, AuthHeading, AuthSelect, AuthSubmit, FieldError, MatchNote, PasswordField, StrengthMeter } from "@/components/auth/AuthField";
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic companies
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        // Active companies only; "personal" is one of them
        const res = await apiCall<any>("/api/companies", { requiresAuth: false });
        const fetched = res.data?.companies || [];
        setCompanies(fetched.length ? fetched : [{ code: "personal", name: "Personal / Individual" }]);
      } catch (e) {
        console.error("Failed to fetch companies:", e);
        // Fallback
        setCompanies([{ code: "personal", name: "Personal / Individual" }]);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  const {
    register,
    handleSubmit,
    setFocus,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { applicant_type: "" },
    mode: "onTouched",
  });

  // Cursor in the first box on a desktop screen; on a phone that would only throw the keyboard up.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setFocus("name");
  }, [setFocus]);

  const isPrivacyAccepted = watch("privacyAccepted");
  const password = watch("password") ?? "";
  const confirm = watch("confirmPassword") ?? "";

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
    <AuthLayout variant="register" top>
      <AuthHeading title="Create your account" sub="It takes about a minute. You can sign in as soon as it is created." />

      <div className="mt-6">
        {error && <AuthAlert>{error}</AuthAlert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <AuthField id="reg-name" label="Full name" icon={User} type="text" autoComplete="name" placeholder="Jane Mwangi" error={errors.name?.message} {...register("name")} />
          <AuthField id="reg-email" label="Email address" icon={Mail} type="email" autoComplete="email" placeholder="jane@example.com" error={errors.email?.message} {...register("email")} />
          <AuthField id="reg-phone" label="Phone number" icon={Phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="0712345678" error={errors.phone_number?.message} {...register("phone_number")} />

          <AuthSelect id="reg-company" label="Your company" icon={Building2} disabled={loadingCompanies} error={errors.applicant_type?.message} {...register("applicant_type")}>
            <option value="" disabled hidden>
              {loadingCompanies ? "Loading companies…" : "Select your company…"}
            </option>
            {companies.map((comp) => (
              <option key={comp.code} value={comp.code}>
                {comp.name}
              </option>
            ))}
          </AuthSelect>

          <PasswordField
            id="reg-password"
            label="Password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            error={errors.password?.message}
            below={<StrengthMeter value={password} />}
            {...register("password")}
          />
          <PasswordField
            id="reg-confirm"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Type it again"
            error={errors.confirmPassword?.message}
            below={<MatchNote show={!!confirm && confirm === password} />}
            {...register("confirmPassword")}
          />

          <div>
            <label className="flex cursor-pointer select-none items-start gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50 has-[:checked]:border-brand-blue/40 has-[:checked]:bg-blue-50/40 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-blue/10">
              <input type="checkbox" {...register("privacyAccepted")} className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer rounded border-slate-300 accent-[#0F2C59]" />
              <span className="text-[13px] leading-relaxed text-slate-600">
                I have read and understood the{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue hover:underline">
                  Privacy Policy
                </a>{" "}
                and consent to the processing of my personal data in accordance with the Data Protection Act, 2019.
              </span>
            </label>
            {errors.privacyAccepted && <FieldError id="reg-privacy-err">{errors.privacyAccepted.message}</FieldError>}
          </div>

          <AuthSubmit loading={isLoading} loadingLabel="Creating account…" disabled={!isPrivacyAccepted}>
            Create account
          </AuthSubmit>
        </form>

        <p className="mt-6 text-center text-[14px] text-slate-600">
          Already have an account?{" "}
          <Link to="/login/applicant" className="font-semibold text-brand-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
