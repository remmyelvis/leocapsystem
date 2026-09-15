

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/contexts/AuthContext";
import { useLoanStore } from "@/store/loanStore";
import { toast } from "sonner";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useApplicantProfileStore } from "@/store/applicantProfileStore";
import { sendApplicationConfirmation } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Upload,
} from "lucide-react";
import { estimateGeneralLoan, formatKES } from "@/lib/loanCalculations";
import { applicationApi, type CreateApplicationPayload } from "@/lib/applicationApi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 4;

const TERMS_TEXT = `LOAN AGREEMENT

This Loan Agreement ("Agreement") is made and deemed executed in Nairobi, Kenya on the date of electronic acceptance by the Borrower.

PARTIES

LEOCAP INVEST, a business duly registered under the laws of Kenya, of P.O. Box 184–00100 GPO, Nairobi (the "Lender");

AND

The Applicant, being the individual whose identification and personal details are provided in the online application (the "Borrower").

A. LOAN AMOUNT AND DISBURSEMENT
The Lender agrees to advance to the Borrower a loan amount approved through the application system ("Loan Amount").
The Borrower acknowledges receipt and acceptance of the Loan Amount upon disbursement.
The Borrower shall pay:
A processing fee of 3% of the Loan Amount, and
A legal/administration fee of KES 1,000
which may be deducted from the Loan Amount prior to disbursement or charged separately as determined by the Lender.

B. INTEREST
The Loan shall attract interest at the rate communicated and accepted at approval.
Interest shall accrue on a reducing or flat balance basis as disclosed at the time of approval.

C. REPAYMENT
The Borrower shall repay the Loan Amount together with interest in monthly instalments as communicated in the repayment schedule.
The Borrower shall remain fully liable until the Loan is repaid in full.
Early repayment shall be permitted unless otherwise stated in the repayment terms.

D. DEFAULT
An event of default occurs if the Borrower fails to pay any instalment on its due date.
Upon default:
a. The outstanding amount shall continue to accrue interest at the contractual rate.
b. A late payment penalty may be charged as communicated at approval.
c. A restructuring fee of 10% of the overdue instalment or KES 1,500 (whichever is higher) may apply where repayment arrangements are revised.
The Lender may initiate recovery action, including engagement of third-party debt collectors or legal proceedings.

E. CHEQUE / PAYMENT DEFAULTS
Returned or dishonoured payments shall attract:
Actual bank charges or KES 3,000 (whichever is higher), and
A collection fee of up to 15% of the dishonoured amount.

F. DATA PROTECTION AND INFORMATION SHARING
The Borrower consents to the collection, processing, storage, and use of personal data in accordance with the Data Protection Act, 2019 of Kenya.
The Borrower consents to disclosure of relevant information to:
Credit reference bureaus (CRBs);
Debt collection agents;
Legal advisors and courts; and
Regulatory authorities where required by law.
Data shall be processed strictly for credit assessment, loan administration, and recovery purposes.

G. DISPUTE RESOLUTION
Parties shall first attempt amicable resolution.
Failing settlement, disputes shall be submitted to courts of competent jurisdiction in Kenya.

H. ELECTRONIC ACCEPTANCE
The Borrower agrees that electronic acceptance (click-wrap or digital signature) constitutes a legally binding signature under Kenyan law.
System logs and application records shall serve as evidence of acceptance.

I. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior representations.

J. LIMITATION OF LIABILITY
Nothing in this Agreement shall be construed as limiting any rights of the Borrower or Lender under applicable law.`;

// ---------------------------------------------------------------------------
// Zod schemas (one per step)
// ---------------------------------------------------------------------------

const step1Schema = z.object({
  employmentType: z.enum(["Self Employed", "Employed"], {
    error: "Please select your employment type",
  }),
});



const step3Schema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  idNumber: z.string().regex(/^\d{7,8}$/, "ID number must be 7-8 digits"),
  phoneNumber: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Please enter a valid Kenyan phone number (e.g. 0712345678)"),
  kraPin: z
    .string()
    .regex(/^[Aa]\d{9}[A-Za-z]$/, "KRA PIN format: A followed by 9 digits and a letter (e.g. A123456789Z)"),
  emailAddress: z.string().email("Please enter a valid email address"),
  companyName: z.string().optional(),
  lastEarningsMonth1: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
  lastEarningsMonth2: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
  lastEarningsMonth3: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
});

const step4Schema = z.object({
  bankStatementName: z.string({ message: "Bank statement is required" }).min(1, "Bank statement is required"),
  bankStatementCode: z.string().optional(),
  mpesaStatementName: z.string({ message: "M-Pesa statement is required" }).min(1, "M-Pesa statement is required"),
  mpesaStatementCode: z.string().optional(),
  payslipName: z.string().optional(),
  payslipCode: z.string().optional(),
});

const step5Schema = z.object({
  termsAccepted: z.literal(true, {
    error: 'You must select "I accept" to proceed',
  }),
  privacyAccepted: z.literal(true, {
    error: 'You must accept the Privacy Policy to proceed',
  }),
  amountApplied: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Amount must be greater than 0"),
  loanPurpose: z.string().min(2, "Please describe the purpose of the loan"),
  loanProduct: z.enum(["1_month_flat", "6_months_reducing"]).default("1_month_flat"),
  durationMonths: z.number().min(1).max(6).default(1),
});

// Combined schema for final submit
const fullSchema = step1Schema
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema);

type FullFormData = z.infer<typeof fullSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-colors placeholder:text-gray-300";

const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const errorClass = "text-red-500 text-xs mt-1.5 flex items-center gap-1";

const STEP_LABELS = [
  "Employment",
  "Bio Data",
  "Documents",
  "Terms & Amount",
];

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({
  currentStep,
  total,
}: {
  currentStep: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center mb-8 select-none">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <div key={step} className="flex items-center">
            {/* Circle */}
            <div
              className={`relative flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-black transition-colors ${isDone
                ? "bg-slate-900 border-slate-900 text-white"
                : isCurrent
                  ? "bg-brand-blue border-brand-blue text-white"
                  : "bg-white border-gray-300 text-slate-400"
                }`}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span>{step}</span>
              )}
              {/* Label below */}
              <span
                className={`absolute top-10 text-xs whitespace-nowrap font-semibold ${isDone
                  ? "text-brand-blue"
                  : isCurrent
                    ? "text-red-600"
                    : "text-slate-400"
                  }`}
              >
                {STEP_LABELS[i]}
              </span>
            </div>

            {/* Connector line (not after last) */}
            {step < total && (
              <div
                className={`h-0.5 w-10 sm:w-16 mx-0.5 transition-colors ${isDone ? "bg-blue-900" : "bg-slate-200"
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Radio pill helper
// ---------------------------------------------------------------------------

function RadioPill<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-center gap-2 cursor-pointer px-5 py-3 rounded-xl border text-sm font-medium transition-colors select-none ${value === opt.value
            ? "bg-slate-900 border-slate-900 text-white"
            : "border-slate-200 text-slate-600 hover:border-blue-300"
            }`}
        >
          <input
            type="radio"
            className="sr-only"
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function GeneralLoanPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const addApplication = useLoanStore((s) => s.addApplication);
  const applications = useLoanStore((s) => s.applications);

  const profileCompletion = useProfileCompletion();
  const getProfile = useApplicantProfileStore((s) => s.getProfile);
  const serverProfile = getProfile(session?.user?.id ?? "");

  // Redirect to apply page (which shows the profile gate UI) if profile is incomplete
  useEffect(() => {
    if (!profileCompletion.isComplete) {
      navigate("/dashboard/apply");
    }
  }, [profileCompletion.isComplete, navigate]);

  // Check if user has applied this calendar month (legal fee waiver)
  const hasAppliedThisMonth = useMemo(() => {
    const userId = session?.user?.id;
    if (!userId) return false;
    const now = new Date();
    return applications.some((app) => {
      if (app.userId !== userId) return false;
      const submitted = new Date(app.submittedAt);
      return (
        submitted.getFullYear() === now.getFullYear() &&
        submitted.getMonth() === now.getMonth()
      );
    });
  }, [applications, session?.user?.id]);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);

  // Actual File objects for upload (form fields only hold the filename string for display/validation)
  const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
  const [mpesaStatementFile, setMpesaStatementFile] = useState<File | null>(null);
  const [payslipFile, setPayslipFile] = useState<File | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    reset,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FullFormData>({
    resolver: zodResolver(fullSchema),
    mode: "onTouched",
    defaultValues: {
      lastEarningsMonth1: undefined,
      lastEarningsMonth2: undefined,
      lastEarningsMonth3: undefined,
      amountApplied: undefined,
    },
  });

  const termsAccepted = watch("termsAccepted");
  const privacyAccepted = watch("privacyAccepted");

  // Pre-fill personal details from profile (read-only)
  useEffect(() => {
    if (session?.user) {
      reset((prev) => ({
        ...prev,
        customerName: serverProfile?.name ?? session.user.name ?? "",
        idNumber: serverProfile?.idNumber ?? session.user.idNumber ?? "",
        kraPin: serverProfile?.kraPin ?? session.user.kraPin ?? "",
        phoneNumber: serverProfile?.phoneNumber ?? session.user.phoneNumber ?? "",
        emailAddress: serverProfile?.email ?? session.user.email ?? "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, serverProfile?.idNumber, serverProfile?.kraPin]);

  // Fields to validate per step
  const STEP_FIELDS: Array<Array<keyof FullFormData>> = [
    ["employmentType"],
    [
      "customerName",
      "idNumber",
      "phoneNumber",
      "kraPin",
      "emailAddress",
      "companyName",
      "lastEarningsMonth1",
      "lastEarningsMonth2",
      "lastEarningsMonth3",
    ],
    ["bankStatementName", "mpesaStatementName", "payslipName"], // Step 3: documents are required
    ["termsAccepted", "privacyAccepted", "amountApplied", "loanPurpose"],
  ];

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep - 1];
    let valid = await trigger(fields);
    
    // Custom cross-step validation enforcement
    const values = getValues();
    if (currentStep === 2 && values.employmentType === "Employed") {
        if (!values.companyName || values.companyName.trim().length < 2) {
            setError("companyName", { type: "manual", message: "Company name is required for employed applicants" });
            valid = false;
        }
    }
    if (currentStep === 3 && values.employmentType === "Employed") {
        if (!values.payslipName || values.payslipName.trim().length < 1) {
            setError("payslipName", { type: "manual", message: "Payslip is required for employed applicants" });
            valid = false;
        }
    }

    if (valid) {
      setStepErrors([]);
      setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
    } else {
      const msgs = fields
        .map((f) => (errors[f] as { message?: string } | undefined)?.message)
        .filter(Boolean) as string[];
      setStepErrors(msgs);
    }
  };

  const handleBack = () => {
    setStepErrors([]);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  const onSubmit = async (data: FullFormData) => {
    setIsSubmitting(true);

    try {
      const payload: CreateApplicationPayload = {
        employment_type: data.employmentType === "Employed" ? "employed" : "self_employed",
        company: data.companyName || "personal",
        employment_nature: data.employmentType === "Employed" ? "permanent" : "self_employed",
        payroll_number: "N/A",
        designation: "N/A",
        month_one: String(data.lastEarningsMonth1),
        month_two: String(data.lastEarningsMonth2),
        month_three: String(data.lastEarningsMonth3),
        loan_type: "personal",
        amount_applied: String(data.amountApplied),
        processing_fees: String(Math.round(data.amountApplied * 0.03)),
        legal_fees: hasAppliedThisMonth ? "0" : "1000",
        access_fees: "0",
        interest_rate: "0.1",
        disbursement_amount: String(
          Math.round(data.amountApplied - data.amountApplied * 0.03 - (hasAppliedThisMonth ? 0 : 1000))
        ),
        total_repayment_amount: String(Math.round(data.amountApplied * 1.1)),
        is_first_time_applicant: "False",
        loan_purpose: data.loanPurpose,
        mpesa_statement_passcode: data.mpesaStatementCode,
        bank_statement_passcode: data.bankStatementCode,
        payslip_passcode: data.payslipCode,
      };

      const { data: apiData, error } = await applicationApi.create(payload, {
        bankStatement: bankStatementFile,
        mpesaStatement: mpesaStatementFile,
        payslip: payslipFile,
      });

      if (error || !apiData) {
        toast.error(error ?? "Submission failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Documents are sent as part of the multipart/form-data create request above.

      // Mirror to local store so the dashboard updates immediately
      const now = new Date();
      addApplication({
        id: apiData.application?.id ?? (apiData as Record<string, unknown>).id,
        userId: session?.user?.id ?? "unknown",
        loanType: "GENERAL_LOAN" as const,
        status: "PENDING" as const,
        submittedAt: now,
        updatedAt: now,
        employmentType: data.employmentType,
        isFirstTimeApplicant: false,
        customerName: data.customerName,
        idNumber: data.idNumber,
        phoneNumber: data.phoneNumber,
        kraPin: data.kraPin,
        emailAddress: data.emailAddress,
        companyName: data.employmentType === "Employed" ? data.companyName : undefined,
        lastEarningsMonth1: data.lastEarningsMonth1,
        lastEarningsMonth2: data.lastEarningsMonth2,
        lastEarningsMonth3: data.lastEarningsMonth3,
        bankStatementUrl: data.bankStatementName,
        mpesaStatementUrl: data.mpesaStatementName,
        payslipUrl: data.payslipName,
        termsAccepted: data.termsAccepted,
        amountApplied: data.amountApplied,
        loanPurpose: data.loanPurpose,
      });

      sendApplicationConfirmation(
        { name: data.customerName, email: data.emailAddress },
        { id: apiData.application?.id ?? (apiData as Record<string, unknown>).id } as Parameters<typeof sendApplicationConfirmation>[1]
      );
      toast.success("Application submitted successfully!");
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="p-6 w-full max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 bg-green-50 rounded-xl flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Application Received!
          </h2>
          <p className="text-slate-500 text-sm max-w-md">
            We&apos;ve received your application. Our team will review it and
            reach out to discuss your personalised interest rate. You&apos;ll be
            notified here once a rate has been set.
          </p>
          <Button
            onClick={() => navigate("/dashboard/applications")}
            className="mt-4 bg-blue-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6"
          >
            View My Applications
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-gray-700 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-black text-slate-900">
          Personal / General Loan
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete all {TOTAL_STEPS} steps to submit your application.
        </p>
      </div>

      {/* Step indicator */}
      <div className="pt-2 pb-10">
        <StepIndicator currentStep={currentStep} total={TOTAL_STEPS} />
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 sm:p-8">
        {/* Step-level errors */}
        {stepErrors.length > 0 && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              {stepErrors.map((msg, i) => (
                <p key={i}>{msg}</p>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          console.error(errs);
          const firstErr = Object.values(errs)[0]?.message;
          if (firstErr) toast.error(firstErr as string);
        })} noValidate>

          {/* ════════════════════════════════════════════════════════════════
              STEP 1 — Employment Type
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-lg font-black text-slate-900 mb-1">
                Employment Type
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                How are you currently employed?
              </p>

              <label className={labelClass}>Select your employment status</label>
              <Controller
                name="employmentType"
                control={control}
                render={({ field }) => (
                  <RadioPill
                    options={[
                      { label: "Self Employed", value: "Self Employed" },
                      { label: "Employed", value: "Employed" },
                    ]}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.employmentType && (
                <p className={errorClass}>
                  <AlertCircle className="h-3 w-3" />
                  {errors.employmentType.message}
                </p>
              )}
            </div>
          )}



          {/* ════════════════════════════════════════════════════════════════
              STEP 2 — Bio Data
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-1">
                  Bio Data
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  Your personal and contact information.
                </p>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700 mb-6">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>Personal details are pre-filled from your profile and cannot be edited here. To update them, visit your <strong>Profile</strong> page.</span>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelClass}>Name of Customer</label>
                <input
                  {...register("customerName")}
                  type="text"
                  disabled
                  className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
                />
              </div>

              {/* ID + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>ID No.</label>
                  <input
                    {...register("idNumber")}
                    type="text"
                    disabled
                    className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone No.</label>
                  <input
                    {...register("phoneNumber")}
                    type="tel"
                    disabled
                    className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
                  />
                </div>
              </div>

              {/* KRA PIN + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>KRA PIN No.</label>
                  <input
                    {...register("kraPin")}
                    type="text"
                    disabled
                    className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
                  />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    {...register("emailAddress")}
                    type="email"
                    disabled
                    className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
                  />
                </div>
              </div>

              {/* Company Name — only for Employed */}
              {watch("employmentType") === "Employed" && (
                <div>
                  <label className={labelClass}>Company Name</label>
                  <input
                    {...register("companyName")}
                    type="text"
                    placeholder="e.g. Safaricom PLC"
                    className={inputClass}
                  />
                  {errors.companyName && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {errors.companyName.message}
                    </p>
                  )}
                </div>
              )}

              {/* Last 3 Months Earnings */}
              <div>
                <label className={labelClass}>
                  Last 3 Months Earnings (KES)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(
                    [
                      { key: "lastEarningsMonth1", label: "Month 1 (Latest)" },
                      { key: "lastEarningsMonth2", label: "Month 2" },
                      { key: "lastEarningsMonth3", label: "Month 3" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-xs text-slate-400 mb-1.5 font-medium">
                        {label}
                      </p>
                      <input
                        {...register(key, { valueAsNumber: true })}
                        type="number" onWheel={(e) => e.currentTarget.blur()}
                        inputMode="decimal"
                        min={1}
                        placeholder="0"
                        className={inputClass}
                      />
                      {errors[key] && (
                        <p className={errorClass}>
                          <AlertCircle className="h-3 w-3" />
                          {errors[key]?.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 3 — Document Uploads
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-1">
                  Document Uploads
                </h2>
                <p className="text-slate-400 text-sm mb-1">
                  PDF only, max 9 MB per file.
                </p>
                <p className="text-xs text-amber-600 mb-6">
                  All documents are required*
                </p>
              </div>

              {/* ── Bank Statement ── */}
              <div className="space-y-3">
                <label className={labelClass}>Bank Statement — Last 6 Months</label>
                <Controller
                  name="bankStatementName"
                  control={control}
                  render={({ field }) => (
                    <label
                      className={`flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${field.value ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${field.value ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Upload className={`h-5 w-5 ${field.value ? "text-blue-700" : "text-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {field.value ? (
                          <p className="text-sm font-semibold text-brand-blue truncate">{field.value}</p>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-600">Click to upload Bank Statement</p>
                            <p className="text-xs text-slate-400 mt-0.5">PDF · Max 9 MB</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) { alert("File exceeds 10 MB limit."); return; }
                            field.onChange(file.name);
                            setBankStatementFile(file);
                          }
                        }}
                      />
                    </label>
                  )}
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bank Statement Password / Code <span className="text-slate-400 font-normal">(if protected)</span></label>
                  <input
                    {...register("bankStatementCode")}
                    type="text"
                    placeholder="Enter the password or code to open this document"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ── M-Pesa Statement ── */}
              <div className="space-y-3">
                <label className={labelClass}>M-Pesa Statement — Last 6 Months</label>
                <Controller
                  name="mpesaStatementName"
                  control={control}
                  render={({ field }) => (
                    <label
                      className={`flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${field.value ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${field.value ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Upload className={`h-5 w-5 ${field.value ? "text-blue-700" : "text-slate-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {field.value ? (
                          <p className="text-sm font-semibold text-brand-blue truncate">{field.value}</p>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-slate-600">Click to upload M-Pesa Statement</p>
                            <p className="text-xs text-slate-400 mt-0.5">PDF · Max 9 MB</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) { alert("File exceeds 10 MB limit."); return; }
                            field.onChange(file.name);
                            setMpesaStatementFile(file);
                          }
                        }}
                      />
                    </label>
                  )}
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">M-Pesa Statement Password / Code <span className="text-slate-400 font-normal">(if protected)</span></label>
                  <input
                    {...register("mpesaStatementCode")}
                    type="text"
                    placeholder="Enter the password or code to open this document"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* ── Payslip — Employed only ── */}
              {watch("employmentType") === "Employed" && (
                <div className="space-y-3">
                  <label className={labelClass}>Payslip <span className="text-xs font-normal text-slate-400">(Required for employed applicants)</span></label>
                  <Controller
                    name="payslipName"
                    control={control}
                    render={({ field }) => (
                      <label
                        className={`flex items-center gap-4 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${field.value ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${field.value ? "bg-blue-100" : "bg-slate-100"}`}>
                          <Upload className={`h-5 w-5 ${field.value ? "text-blue-700" : "text-slate-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {field.value ? (
                            <p className="text-sm font-semibold text-brand-blue truncate">{field.value}</p>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-slate-600">Click to upload Payslip</p>
                              <p className="text-xs text-slate-400 mt-0.5">PDF · Max 9 MB</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) { alert("File exceeds 10 MB limit."); return; }
                              field.onChange(file.name);
                              setPayslipFile(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Payslip Password / Code <span className="text-slate-400 font-normal">(if protected)</span></label>
                    <input
                      {...register("payslipCode")}
                      type="text"
                      placeholder="Enter the password or code to open this document"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              STEP 4 — Terms & Conditions + Amount
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 mb-1">
                  Terms &amp; Conditions
                </h2>
                <p className="text-slate-400 text-sm mb-4">
                  Read carefully before accepting.
                </p>
              </div>

              {/* Terms text box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-h-64 overflow-y-auto">
                <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                  {TERMS_TEXT}
                </pre>
              </div>

              {/* Accept checkboxes */}
              <div className="space-y-4">
                <div>
                  <Controller
                    name="termsAccepted"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-3 cursor-pointer px-5 py-4 rounded-xl border border-slate-200 hover:bg-blue-50 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={field.value === true}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-900 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          I have read and accepted the Loan Agreement and Terms & Conditions.
                        </span>
                      </label>
                    )}
                  />
                  {errors.termsAccepted && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {errors.termsAccepted.message}
                    </p>
                  )}
                </div>

                <div>
                  <Controller
                    name="privacyAccepted"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-3 cursor-pointer px-5 py-4 rounded-xl border border-slate-200 hover:bg-blue-50 transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={field.value === true}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-900 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          I have read and understood the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Privacy Policy</a> and consent to the processing of my personal data in accordance with the Data Protection Act, 2019.
                        </span>
                      </label>
                    )}
                  />
                  {errors.privacyAccepted && (
                    <p className={errorClass}>
                      <AlertCircle className="h-3 w-3" />
                      {errors.privacyAccepted.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Purpose of Loan */}
              <div>
                <label className={labelClass}>Purpose of Loan</label>
                <input
                  {...register("loanPurpose")}
                  type="text"
                  placeholder="e.g. Medical expenses, Business expansion"
                  className={inputClass}
                />
                {errors.loanPurpose && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.loanPurpose.message}
                  </p>
                )}
              </div>

              {/* Amount Applied */}
              <div>
                <label className={labelClass}>Amount Applied (KES)</label>
                <input
                  {...register("amountApplied", { valueAsNumber: true })}
                  type="number" onWheel={(e) => e.currentTarget.blur()}
                  inputMode="decimal"
                  min={1}
                  placeholder="e.g. 50000"
                  className={inputClass}
                />
                {errors.amountApplied && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.amountApplied.message}
                  </p>
                )}

                {/* Live KES preview */}
                {(() => {
                  const amt = watch("amountApplied");
                  return amt && amt > 0 ? (
                    <p className="text-sm text-brand-blue font-semibold mt-2">
                      {formatKES(amt)}
                    </p>
                  ) : null;
                })()}
              </div>

              {/* Max Eligible Info */}
              {(() => {
                const m1 = watch("lastEarningsMonth1");
                const m2 = watch("lastEarningsMonth2");
                const m3 = watch("lastEarningsMonth3");
                if (m1 && m2 && m3 && m1 > 0 && m2 > 0 && m3 > 0) {
                  const estimate = estimateGeneralLoan(m1, m2, m3);
                  return (
                    <div className="px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-sm text-emerald-800 font-semibold">
                        Based on your earnings, your maximum eligible amount is approximately{" "}
                        <span className="font-black">{formatKES(estimate.maxLoanAmount)}</span>
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Final amount will be confirmed after review.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}



              {/* How General Loan Approval Works */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-bold text-blue-900">
                    How General Loan Approval Works
                  </h3>
                </div>

                <ol className="space-y-2 text-sm text-brand-blue">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0 mt-0.5">1</span>
                    <span>Submit your application with your details and documents</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0 mt-0.5">2</span>
                    <span>Our team reviews your application and assesses your eligibility</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0 mt-0.5">3</span>
                    <span>We contact you to discuss and agree on an interest rate</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0 mt-0.5">4</span>
                    <span>Once agreed, you&apos;ll receive a notification to review and confirm</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-brand-blue flex-shrink-0 mt-0.5">5</span>
                    <span>After your confirmation, we process and disburse your loan</span>
                  </li>
                </ol>

                <p className="text-xs text-blue-700 italic pt-2 border-t border-blue-200">
                  Interest rates for general loans are personalised based on your profile
                  and are agreed between you and Leocap Invest before any commitment is made.
                </p>
              </div>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 1 ? () => navigate(-1) : handleBack}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-900 hover:bg-slate-800 text-white font-bold rounded-xl"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || !termsAccepted || !privacyAccepted}
                className={`font-bold rounded-xl px-6 transition-all ${isSubmitting || !termsAccepted || !privacyAccepted
                  ? "bg-gray-300 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-brand-blue hover:bg-slate-800 text-white transition-colors"
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Step counter */}
      <p className="text-center text-xs text-slate-400 mt-4">
        Step {currentStep} of {TOTAL_STEPS}
      </p>
    </div>
  );
}
