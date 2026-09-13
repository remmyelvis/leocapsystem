

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useLoanStore } from "@/store/loanStore";
import { usePersonalDetailsStore } from "@/store/personalDetailsStore";
import { useFinanceProfileStore } from "@/store/financeProfileStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { ProfileApplyGate } from "@/components/profile/ProfileCompletion";
import {
  calculateSalaryAdvance,
  calculateSalaryAdvanceForAmount,
  formatKES,
} from "@/lib/loanCalculations";
import {
  LoanBreakdownCard,
  createSalaryAdvanceBreakdown,
} from "@/components/loans/LoanBreakdownCard";
import { LOAN_SETTINGS } from "@/configs/loanSettings";
import { applicationApi, type CreateApplicationPayload } from "@/lib/applicationApi";
import type { UserRole } from "@/types/user";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const getTermsText = (employerName: string) => `LOAN AGREEMENT

This Loan Agreement ("Agreement") is made and deemed executed in Nairobi, Kenya on the date of electronic acceptance by the Borrower.

PARTIES

1. LEOCAP INVEST, a business duly incorporated/registered under the laws of the Republic of Kenya, of P.O. Box 184–00100 GPO, Nairobi (hereinafter referred to as the "Lender", which expression shall include its successors and assigns);

AND

2. The Applicant, being the individual whose identification details, employment details, and address are provided in the online application form (hereinafter referred to as the "Borrower", which expression shall include personal representatives and assigns).

A. LOAN AMOUNT AND DISBURSEMENT
The Lender agrees to advance to the Borrower a loan amount as approved through the online application system ("Loan Amount").
The Borrower acknowledges that approval is subject to employment verification under the Memorandum of Understanding between the Lender and ${employerName}.
The Borrower shall pay:
A processing fee of 3%, An Admin & Access Fee of 2% of the Loan Amount, and
Legal Fees of KES 1,500
These fees may be deducted upfront from the Loan Amount prior to disbursement.

B. LOAN LIMIT
The Borrower's approved loan limit shall be determined solely by the Lender based on internal credit assessment and employer MOU limits.
The Lender reserves the right to review, vary, or revoke the loan limit at its discretion.
The Borrower shall not be entitled to exceed the approved loan limit unless expressly authorized in writing.

C. LOAN TERM
The loan shall be for a maximum period of one (1) month, unless otherwise extended or rescheduled in writing by the Lender.

D. INTEREST
The Loan shall attract interest at the rate communicated and agreed at the time of approval.
Interest shall accrue monthly and be payable together with the principal unless otherwise agreed.

E. REPAYMENT
The Borrower shall repay the Loan Amount together with interest in accordance with the repayment schedule provided.
Repayment shall be effected through salary deduction under the employer check-off arrangement pursuant to the MOU with ${employerName}.
Any unpaid balance shall continue to accrue interest at the contractual rate until fully settled.

F. DEFAULT
An event of default occurs when the Borrower fails to pay any instalment on its due date.
Upon default:
a. The overdue instalment may be rescheduled subject to a rescheduling fee of 10% of the instalment or KES 1,500 (whichever is higher);
b. A debt recovery fee of 15% of the outstanding balance may be charged after 7 days of default and issuance of demand notice;
c. Returned or unpaid cheques shall attract actual bank charges or KES 3,000 (whichever is higher) plus 15% collection fee.
The Lender reserves the right to engage third-party debt collection agents or legal counsel for recovery.

G. DATA PROTECTION AND DISCLOSURE CONSENT
The Borrower expressly consents to the collection, processing, storage, and sharing of their personal and employment data strictly for purposes of:
Loan assessment and administration;
Salary verification and check-off processing;
Debt recovery and enforcement.
The Borrower acknowledges that data may be shared with:
${employerName} (employer);
Authorized debt collection agents;
Legal practitioners; and
Regulatory authorities where required by law.
All processing shall comply with the Data Protection Act, 2019 of Kenya.

H. DISPUTE RESOLUTION
Any dispute arising shall first be resolved amicably through negotiation.
If unresolved, the dispute shall be referred to the courts of competent jurisdiction in Kenya.

I. ELECTRONIC ACCEPTANCE
The Borrower agrees that ticking acceptance on the online portal constitutes a legally binding electronic signature under Kenyan law.
The Borrower confirms they have read, understood, and accepted all terms herein.

J. ENTIRE AGREEMENT
This Agreement constitutes the entire understanding between the parties and supersedes all prior representations or agreements.`;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const salaryAdvanceSchema = z.object({
  payrollNumber: z.string().min(1, "Please enter your payroll number"),
  customerName: z.string().min(2, "Customer name is required"),
  idNumber: z.string().regex(/^\d{7,8}$/, "ID number must be 7-8 digits"),
  kraPin: z
    .string()
    .regex(/^[Aa]\d{9}[A-Za-z]$/, "KRA PIN format: A followed by 9 digits and a letter"),
  phoneNumber: z
    .string()
    .regex(/^(\+254|0)[17]\d{8}$/, "Enter a valid Kenyan phone number"),
  natureOfEmployment: z.enum(["Agent", "Management", "Other"], {
    error: "Please select nature of employment",
  }),
  natureOfEmploymentOther: z.string().optional(),
  designation: z.string().min(1, "Designation is required"),
  emailAddress: z.string().email("Please enter a valid email address"),
  basicPayMonth1: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
  basicPayMonth2: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
  basicPayMonth3: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
  amountRequested: z
    .number({ error: "Please enter a valid amount in KES" })
    .positive("Please enter a valid amount in KES"),
  loanPurpose: z.string().min(2, "Please describe the purpose of the loan"),
  termsAccepted: z.literal(true, {
    error: 'You must accept the terms and conditions to proceed',
  }),
  privacyAccepted: z.literal(true, {
    error: 'You must accept the Privacy Policy to proceed',
  }),
}).refine(
  (data) =>
    data.natureOfEmployment !== "Other" ||
    (data.natureOfEmploymentOther && data.natureOfEmploymentOther.trim().length > 0),
  {
    message: "Please specify your nature of employment",
    path: ["natureOfEmploymentOther"],
  }
);

type FormData = z.infer<typeof salaryAdvanceSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-700/20 focus:border-violet-700 transition-colors placeholder:text-gray-300";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";
const errorClass = "text-red-500 text-xs mt-1.5 flex items-center gap-1";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FinanceApplyPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const addApplication = useLoanStore((s) => s.addApplication);
  const applications = useLoanStore((s) => s.applications);
  const getOverride = usePersonalDetailsStore((s) => s.getOverride);
  const getProfile = useFinanceProfileStore((s) => s.getProfile);
  const serverProfile = getProfile(session?.user?.id ?? "");

  const role = session?.user?.role as UserRole | undefined;
  const company = role === "FINANCE_IDEON" ? "ideon" : "nakama";
  const companyLabel = company === "ideon" ? "Ideon Limited" : "Nakama";

  const profileCompletion = useProfileCompletion();

  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCalc, setSubmittedCalc] = useState<ReturnType<typeof calculateSalaryAdvanceForAmount> | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(salaryAdvanceSchema),
    defaultValues: {
      basicPayMonth1: undefined,
      basicPayMonth2: undefined,
      basicPayMonth3: undefined,
      amountRequested: undefined,
    },
  });

  // Pre-fill personal details from session + personalDetailsStore overrides
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id ?? "";
    const override = getOverride(userId) ?? {};
    reset((prev) => ({
      ...prev,
      customerName: serverProfile?.name ?? session.user.name ?? "",
      idNumber: (serverProfile?.idNumber ?? session.user.idNumber) || override.idNumber || "",
      kraPin: (serverProfile?.kraPin ?? session.user.kraPin) || override.kraPin || "",
      phoneNumber: (serverProfile?.phoneNumber ?? session.user.phoneNumber) || override.phoneNumber || "",
      emailAddress: serverProfile?.email ?? session.user.email ?? "",
      payrollNumber: serverProfile?.payrollNumber ?? session.user.payrollNumber ?? "",
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, serverProfile?.payrollNumber]);

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

  const natureOfEmployment = watch("natureOfEmployment");
  const rawPay1 = watch("basicPayMonth1");
  const rawPay2 = watch("basicPayMonth2");
  const rawPay3 = watch("basicPayMonth3");
  const rawRequested = watch("amountRequested");
  const termsAccepted = watch("termsAccepted");
  const privacyAccepted = watch("privacyAccepted");

  const pay1 = rawPay1 && !isNaN(rawPay1) ? rawPay1 : 0;
  const pay2 = rawPay2 && !isNaN(rawPay2) ? rawPay2 : 0;
  const pay3 = rawPay3 && !isNaN(rawPay3) ? rawPay3 : 0;
  const requestedAmount = rawRequested && !isNaN(rawRequested) ? rawRequested : 0;

  const salaryCalc = useMemo(() => {
    if (!pay1 || !pay2 || !pay3) return null;
    return calculateSalaryAdvance(pay1, pay2, pay3);
  }, [pay1, pay2, pay3]);

  const requestedCalc = useMemo(() => {
    if (!requestedAmount) return null;
    return calculateSalaryAdvanceForAmount(requestedAmount);
  }, [requestedAmount]);

  const displayCalc = requestedCalc ?? salaryCalc;
  const maxLoanAmount = salaryCalc?.loanAmount ?? 0;

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      const calc = calculateSalaryAdvanceForAmount(data.amountRequested);

      const payload: CreateApplicationPayload = {
        employment_type: data.natureOfEmployment === "Agent" ? "employed" : "self_employed",
        company,
        employment_nature: data.natureOfEmployment,
        payroll_number: data.payrollNumber,
        designation: data.designation,
        month_one: String(data.basicPayMonth1),
        month_two: String(data.basicPayMonth2),
        month_three: String(data.basicPayMonth3),
        loan_type: "salary_advance",
        amount_applied: String(Math.round(calc.loanAmount)),
        processing_fees: String(Math.round(calc.processingFees)),
        legal_fees: hasAppliedThisMonth ? "0" : String(calc.legalCharge),
        access_fees: String(Math.round(calc.accessFees)),
        disbursement_amount: String(Math.round(calc.disbursementAmount)),
        total_repayment_amount: String(Math.round(calc.repaymentAmount)),
        is_first_time_applicant: "False",
        loan_purpose: data.loanPurpose,
        interest_rate: "0.1",
      };

      const { data: apiData, error } = await applicationApi.create(payload);

      if (error || !apiData) {
        toast.error(error ?? "Submission failed. Please try again.");
        return;
      }

      const now = new Date();
      addApplication({
        id: apiData.application?.id ?? (apiData as Record<string, unknown>).id,
        userId: session?.user?.id ?? "unknown",
        loanType: company === "ideon" ? "IDEON_SALARY_ADVANCE" : "NAKAMA_SALARY_ADVANCE",
        status: "PENDING" as const,
        submittedAt: now,
        updatedAt: now,
        payrollNumber: data.payrollNumber,
        customerName: data.customerName,
        idNumber: data.idNumber,
        kraPin: data.kraPin,
        phoneNumber: data.phoneNumber,
        natureOfEmployment:
          data.natureOfEmployment === "Other"
            ? (data.natureOfEmploymentOther as "Agent" | "Management" | "Other") ?? "Other"
            : data.natureOfEmployment,
        designation: data.designation,
        emailAddress: data.emailAddress,
        basicPayMonth1: data.basicPayMonth1,
        basicPayMonth2: data.basicPayMonth2,
        basicPayMonth3: data.basicPayMonth3,
        amountRequested: data.amountRequested,
        loanPurpose: data.loanPurpose,
        companyName: company === "ideon" ? "Ideon" : "Nakama",
        termsAccepted: data.termsAccepted,
        calculatedLoanAmount: calc.loanAmount,
        calculatedProcessingFees: calc.processingFees,
        calculatedAccessFees: calc.accessFees,
        calculatedLegalFees: calc.legalCharge,
        calculatedDisbursement: calc.disbursementAmount,
        calculatedInterest: calc.interestAmount,
        calculatedRepayment: calc.repaymentAmount,
        agreedInterestRate: LOAN_SETTINGS.salaryAdvance.interestRate,
      });

      setSubmittedCalc(calc);
      toast.success("Application submitted successfully!");
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!profileCompletion.isComplete) {
    return <ProfileApplyGate profileHref="/finance/profile" />;
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="p-6 w-full max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl ring-1 ring-slate-200 shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-violet-50 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-violet-500" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Application Submitted!</h2>
          <p className="text-slate-500 text-sm">
            Your {companyLabel} salary advance application has been received. The HR Manager will review it.
          </p>
        </div>

        {submittedCalc && (
          <LoanBreakdownCard
            title="Your Loan Summary"
            items={createSalaryAdvanceBreakdown(
              salaryCalc?.averageSalary ?? 0,
              submittedCalc.loanAmount,
              submittedCalc.processingFees,
              submittedCalc.accessFees,
              submittedCalc.legalCharge,
              submittedCalc.disbursementAmount,
              submittedCalc.interestAmount,
              submittedCalc.repaymentAmount,
              formatKES
            )}
            footer={
              <p className="text-xs text-slate-500">
                Repayment is due in {LOAN_SETTINGS.salaryAdvance.repaymentDays} days after disbursement.
              </p>
            }
          />
        )}

        <Button
          onClick={() => navigate("/finance/my-loans")}
          className="w-full bg-violet-700 hover:bg-violet-800 text-white font-bold h-12 rounded-xl"
        >
          View My Applications
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-6 min-h-full">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-gray-700 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
            {companyLabel}
          </span>
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          {companyLabel} Salary Advance Application
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          All fields are required. Ensure your details match your payslip.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          After submission, the <strong>HR Manager</strong> has the right to adjust the loan amount before final processing.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

          {/* Pre-filled info banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2 text-xs text-blue-700">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Personal details are pre-filled from your profile and cannot be edited here. To update them, visit your <strong>Profile</strong> page.
            </span>
          </div>

          {/* Payroll Number */}
          <div>
            <label className={labelClass}>Payroll Number</label>
            <input
              {...register("payrollNumber")}
              type="text"
              placeholder="e.g. EMP-0001"
              className={inputClass}
            />
            {errors.payrollNumber && (
              <p className={errorClass}>
                <AlertCircle className="h-3 w-3" />
                {errors.payrollNumber.message}
              </p>
            )}
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

          {/* ID + KRA PIN */}
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
              <label className={labelClass}>KRA PIN</label>
              <input
                {...register("kraPin")}
                type="text"
                disabled
                className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone No.</label>
            <input
              {...register("phoneNumber")}
              type="tel"
              disabled
              className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
            />
          </div>

          {/* Nature of Employment */}
          <div>
            <label className={labelClass}>Nature of Employment</label>
            <Controller
              name="natureOfEmployment"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {(["Agent", "Management", "Other"] as const).map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors select-none ${
                        field.value === opt
                          ? "bg-violet-700 border-violet-700 text-white"
                          : "border-slate-200 text-slate-600 hover:border-violet-300"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        value={opt}
                        checked={field.value === opt}
                        onChange={() => field.onChange(opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.natureOfEmployment && (
              <p className={errorClass}>
                <AlertCircle className="h-3 w-3" />
                {errors.natureOfEmployment.message}
              </p>
            )}
            {natureOfEmployment === "Other" && (
              <div className="mt-3">
                <input
                  {...register("natureOfEmploymentOther")}
                  type="text"
                  placeholder="Please specify…"
                  className={inputClass}
                />
                {errors.natureOfEmploymentOther && (
                  <p className={errorClass}>
                    <AlertCircle className="h-3 w-3" />
                    {errors.natureOfEmploymentOther.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Designation */}
          <div>
            <label className={labelClass}>Designation</label>
            <input
              {...register("designation")}
              type="text"
              placeholder="e.g. Finance Manager"
              className={inputClass}
            />
            {errors.designation && (
              <p className={errorClass}>
                <AlertCircle className="h-3 w-3" />
                {errors.designation.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email Address</label>
            <input
              {...register("emailAddress")}
              type="email"
              disabled
              className={inputClass + " disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"}
            />
          </div>

          {/* Basic Pay last 3 months */}
          <div>
            <label className={labelClass}>Basic Pay — Last 3 Months (KES)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  { key: "basicPayMonth1", label: "Month 1 (Latest)" },
                  { key: "basicPayMonth2", label: "Month 2" },
                  { key: "basicPayMonth3", label: "Month 3" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key}>
                  <p className="text-xs text-slate-400 mb-1.5 font-medium">{label}</p>
                  <input
                    {...register(key, { valueAsNumber: true })}
                    type="number"
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

            {salaryCalc && (
              <div className="mt-3 space-y-2">
                <div className="px-4 py-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-brand-blue font-semibold">
                    Average Basic Pay:{" "}
                    <span className="font-black">{formatKES(salaryCalc.averageSalary)}</span>
                  </p>
                </div>
                <div className="px-4 py-3 bg-violet-50 rounded-xl border border-violet-100">
                  <p className="text-sm text-violet-800 font-semibold">
                    Maximum You Can Apply For:{" "}
                    <span className="font-black">{formatKES(salaryCalc.loanAmount)}</span>
                  </p>
                </div>
              </div>
            )}
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

          {/* Amount Requested */}
          <div>
            <label className={labelClass}>Amount You Want to Apply For (KES)</label>
            <input
              {...register("amountRequested", { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              min={1}
              max={maxLoanAmount > 0 ? maxLoanAmount : undefined}
              placeholder={maxLoanAmount > 0 ? `Up to ${formatKES(maxLoanAmount)}` : "e.g. 50000"}
              className={inputClass}
            />
            {errors.amountRequested && (
              <p className={errorClass}>
                <AlertCircle className="h-3 w-3" />
                {errors.amountRequested.message}
              </p>
            )}
            {requestedAmount > maxLoanAmount && maxLoanAmount > 0 && (
              <p className="text-orange-600 text-xs mt-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Amount exceeds maximum eligible ({formatKES(maxLoanAmount)})
              </p>
            )}
          </div>

          {/* Live Calculation Breakdown */}
          {displayCalc && (
            <div className="space-y-4">
              <LoanBreakdownCard
                title="Your Estimated Breakdown"
                items={createSalaryAdvanceBreakdown(
                  salaryCalc?.averageSalary ?? 0,
                  displayCalc.loanAmount,
                  displayCalc.processingFees,
                  displayCalc.accessFees,
                  hasAppliedThisMonth ? 0 : displayCalc.legalCharge,
                  hasAppliedThisMonth
                    ? displayCalc.disbursementAmount + displayCalc.legalCharge
                    : displayCalc.disbursementAmount,
                  displayCalc.interestAmount,
                  displayCalc.repaymentAmount,
                  formatKES
                )}
                footer={
                  <>
                    {hasAppliedThisMonth && (
                      <p className="text-xs text-emerald-700 font-semibold mb-1">
                        ✓ Legal fee waived — you have already applied this month.
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Repayment is due in {LOAN_SETTINGS.salaryAdvance.repaymentDays} days after disbursement.
                    </p>
                  </>
                }
              />
              <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  The interest rate for salary advances is fixed at{" "}
                  {(LOAN_SETTINGS.salaryAdvance.interestRate * 100).toFixed(0)}%.
                </p>
              </div>
            </div>
          )}

          {/* ── Terms & Conditions ── */}
          <div className="space-y-4 pt-4">
            <div>
              <h3 className="text-base font-black text-slate-900 mb-2">
                Terms &amp; Conditions
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Please read and accept the terms before submitting your application.
              </p>
            </div>

            {/* Terms text box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-h-64 overflow-y-auto">
              <pre className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed font-sans">
                {getTermsText(company === "ideon" ? "Ideon Limited" : "Nakama Tech Limited")}
              </pre>
            </div>

            {/* Accept checkbox */}
            <div className="space-y-4">
              <div>
                <Controller
                  name="termsAccepted"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-violet-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={field.value === true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-violet-900 cursor-pointer flex-shrink-0"
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
                    <label className="flex items-start gap-3 cursor-pointer p-4 rounded-xl border border-slate-200 hover:bg-violet-50 transition-colors select-none">
                      <input
                        type="checkbox"
                        checked={field.value === true}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="w-5 h-5 mt-0.5 rounded border-gray-300 text-violet-900 cursor-pointer flex-shrink-0"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        I have read and understood the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">Privacy Policy</a> and consent to the processing of my personal data in accordance with the Data Protection Act, 2019.
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
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading || !termsAccepted || !privacyAccepted}
              className={`w-full font-bold h-12 rounded-xl text-sm transition-all ${
                isLoading || !termsAccepted || !privacyAccepted
                  ? "bg-gray-300 text-slate-500 cursor-not-allowed opacity-50"
                  : "bg-violet-700 hover:bg-violet-800 text-white"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
