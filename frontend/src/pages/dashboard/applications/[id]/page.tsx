

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useLoanStore } from "@/store/loanStore";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, CheckCircle, AlertCircle, Clock, Mail, Download, Paperclip, RefreshCw, UploadCloud, X } from "lucide-react";
import { calculateGeneralLoan, calculateSalaryAdvanceFromAmount, formatKES } from "@/lib/loanCalculations";
import type { LoanStatus, PaymentStatus } from "@/types/loan";
import { applicationApi } from "@/lib/applicationApi";
import { downloadFile, apiCall } from "@/lib/apiClient";
import { emailApi, type Email, type EmailDocument } from "@/lib/emailApi";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<LoanStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  RATE_SET: "bg-indigo-100 text-indigo-700",
  RATE_CONFIRMED: "bg-cyan-100 text-cyan-700",
  RATE_DECLINED: "bg-orange-100 text-orange-700",
  CONFIRMED: "bg-cyan-100 text-cyan-700",
  APPROVED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  DISBURSED: "bg-purple-100 text-purple-700",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  UNPAID: "bg-orange-100 text-orange-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  FULLY_PAID: "bg-emerald-100 text-emerald-700",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  FULLY_PAID: "Fully Paid",
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  IDEON_SALARY_ADVANCE: "Ideon Salary Advance",
  NAKAMA_SALARY_ADVANCE: "Nakama Salary Advance",
  GENERAL_LOAN: "Personal / General Loan",
};

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function mapApiToApp(appData: Record<string, unknown>, bioData: Record<string, unknown>) {
  const statusMap: Record<string, LoanStatus> = {
    pending_processing: "PENDING",
    pending: "PENDING",
    approved: "APPROVED",
    declined: "DECLINED",
    rejected: "DECLINED",
    disbursed: "DISBURSED",
    rate_set: "RATE_SET",
    rate_confirmed: "RATE_CONFIRMED",
    rate_declined: "RATE_DECLINED",
    confirmed: "CONFIRMED",
  };

  let loanType = "GENERAL_LOAN";
  if (appData.loan_type === "salary_advance") {
    loanType = appData.company === "nakama" ? "NAKAMA_SALARY_ADVANCE" : "IDEON_SALARY_ADVANCE";
  }

  // Parse amount - handle string/number and ensure 0 is preserved
  // Try amount_applied first, then disbursement_amount as fallback
  const rawAmount = appData.amount_applied ?? appData.disbursement_amount ?? appData.total_repayment_amount;
  const parsedAmount = rawAmount != null ? Number(rawAmount) : undefined;
  const amountApplied = parsedAmount !== undefined && !isNaN(parsedAmount) ? parsedAmount : undefined;

  // Parse dates - API uses date_submitted/updated_at, fallback to today
  const submittedAt = appData.date_submitted || appData.created_at || new Date().toISOString();
  const updatedAt = appData.updated_at || appData.date_submitted || appData.created_at || new Date().toISOString();

  // Parse interest rate - handle various formats from API
  // Backend may send as decimal (0.10) or percentage (10)
  let parsedInterestRate: number | undefined = undefined;
  const rawInterestRate = appData.interest_rate ?? appData.interestRate ?? appData.agreed_interest_rate;
  if (rawInterestRate !== undefined && rawInterestRate !== null && rawInterestRate !== "") {
    const numRate = Number(rawInterestRate);
    if (!isNaN(numRate) && numRate > 0) {
      // If rate is > 1, it's likely a percentage (e.g., 10 for 10%)
      // If rate is <= 1, it's likely a decimal (e.g., 0.10 for 10%)
      parsedInterestRate = numRate > 1 ? numRate / 100 : numRate;
    }
  }

  // Fallback: Try to derive interest rate from total_repayment_amount and amount_applied
  // Formula: Interest = Total Repayment - Loan Amount, Rate = Interest / Loan Amount
  if (!parsedInterestRate && amountApplied && amountApplied > 0) {
    // Try both field names
    const totalRepayment = Number(appData.total_repayment_amount || appData.repayment_amount);
    if (totalRepayment && totalRepayment > amountApplied) {
      const interestAmount = totalRepayment - amountApplied;
      parsedInterestRate = interestAmount / amountApplied;
      console.log("[mapApiToApp] Derived interest rate from repayment:", {
        totalRepayment,
        amountApplied,
        interestAmount,
        derivedRate: parsedInterestRate,
      });
    }
  }

  console.log("[mapApiToApp] Interest rate parsing:", {
    raw: rawInterestRate,
    parsed: parsedInterestRate,
    status: appData.loan_status,
    totalRepayment: appData.total_repayment_amount || appData.repayment_amount,
  });

  // Parse financial fields from API (now returned by backend in GET response)
  const apiProcessingFees = appData.processing_fees ? Number(appData.processing_fees) : undefined;
  const apiLegalFees = appData.legal_fees ? Number(appData.legal_fees) : undefined;
  const apiAccessFees = appData.access_fees ? Number(appData.access_fees) : undefined;
  const apiDisbursementAmount = appData.disbursement_amount ? Number(appData.disbursement_amount) : undefined;
  const apiTotalRepayment = appData.total_repayment_amount
    ? Number(appData.total_repayment_amount)
    : appData.repayment_amount
      ? Number(appData.repayment_amount)
      : undefined;

  const loanStatusValue = typeof appData.loan_status === 'string' ? appData.loan_status : '';
  const repaymentStatusValue = typeof appData.repayment_status === 'string' ? appData.repayment_status.toLowerCase() : '';
  let paymentStatus: PaymentStatus | undefined = undefined;
  if (repaymentStatusValue === "paid" || repaymentStatusValue === "fully_paid") paymentStatus = "FULLY_PAID";
  else if (repaymentStatusValue === "partially_paid") paymentStatus = "PARTIALLY_PAID";
  else if (repaymentStatusValue === "unpaid" || repaymentStatusValue === "defaulted") paymentStatus = "UNPAID";

  const amountPaid = appData.amount_paid != null ? Number(appData.amount_paid) : undefined;

  return {
    id: appData.id,
    loanType,
    status: (statusMap[loanStatusValue?.toLowerCase()] ?? "PENDING") as LoanStatus,
    submittedAt,
    updatedAt,
    amountApplied,
    amountRequested: amountApplied,
    customerName: bioData.full_name,
    emailAddress: bioData.email,
    phoneNumber: bioData.phone_number,
    idNumber: bioData.id_number,
    kraPin: bioData.kra_pin,
    payrollNumber: appData.payroll_number,
    natureOfEmployment: appData.employment_nature,
    designation: appData.designation,
    basicPayMonth1: Number(appData.month_one) || undefined,
    basicPayMonth2: Number(appData.month_two) || undefined,
    basicPayMonth3: Number(appData.month_three) || undefined,
    employmentType: appData.employment_type === "employed" ? "Employed" : "Self Employed",
    isFirstTimeApplicant: appData.is_first_time_applicant === "True",
    lastEarningsMonth1: Number(appData.month_one) || undefined,
    lastEarningsMonth2: Number(appData.month_two) || undefined,
    lastEarningsMonth3: Number(appData.month_three) || undefined,
    loanPurpose: appData.loan_purpose,
    calculatedLoanAmount: Number(appData.amount_applied) || undefined,
    agreedInterestRate: parsedInterestRate,
    // Financial fields from API (returned by GET endpoint)
    apiProcessingFees,
    apiLegalFees,
    apiAccessFees,
    apiDisbursementAmount,
    apiTotalRepayment,
    disbursementConfirmed: undefined as boolean | undefined,
    paymentStatus,
    amountPaid,
    idCopyUrl: undefined as string | undefined,
    kraPinDocUrl: undefined as string | undefined,
    payslipUrl: undefined as string | undefined,
    interestRateSetAt: undefined as string | undefined,
    disbursementConfirmedAt: undefined as string | undefined,
    lastPaymentDate: undefined as string | undefined,
    termsAccepted: true,
    documents: appData.documents || [],
    notes: typeof appData.notes === 'string' ? appData.notes : undefined,
  };
}

// ---------------------------------------------------------------------------
// Field row helper
// ---------------------------------------------------------------------------

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  const display =
    typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : typeof value === "number"
        ? value.toLocaleString()
        : String(value);
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-slate-800 font-medium">{display}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-5">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = { id: id! };
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [app, setApp] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const confirmLoanRate = useLoanStore((s) => s.confirmLoanRate);

  // Rate store data (fetched separately because backend doesn't return rate details to applicants)
  const [rateStoreData, setRateStoreData] = useState<{
    interestRate: number;
    processingFees: number;
    legalFees: number;
    disbursementAmount: number;
    repaymentAmount: number;
    loanAmount: number;
  } | null>(null);

  // Email state
  const [emails, setEmails] = useState<Array<Email & { documents?: EmailDocument[] }>>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Update document state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updatePasscode, setUpdatePasscode] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateDocument = async (docType: string) => {
    if (!updateFile) {
      toast.error("Please select a file to upload");
      return;
    }
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append(docType, updateFile);
      if (updatePasscode) {
        formData.append(`${docType}_passcode`, updatePasscode);
      }

      const { error } = await apiCall(`/api/applications/update/${id}`, {
        method: "PATCH",
        isFormData: true,
        formData,
      });

      if (error) {
        throw new Error(error);
      }

      toast.success("Document updated successfully");
      setEditingDocId(null);
      setUpdateFile(null);
      setUpdatePasscode("");
      // Reload to see the new document
      window.location.reload();
    } catch (err: unknown) {
      const error = err as { message?: string } | undefined;
      toast.error(error?.message || "Failed to update document. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };



  useEffect(() => {
    async function fetchApplication() {
      if (!id || id === "undefined") {
        setFetchError("Invalid application ID");
        setLoading(false);
        return;
      }
      const { data, error } = await applicationApi.getOne(id);
      if (error) {
        setFetchError(error);
      } else if (data) {
        // Debug log - remove after verifying
        console.log("API Response (raw):", data);
        const appData = ((data as unknown) as Record<string, unknown>).application ?? data;
        const bioData = ((data as unknown) as Record<string, unknown>).bio_data ?? {};
        console.log("Application data:", appData);
        console.log("Amount fields:", {
          amount_applied: appData.amount_applied,
          disbursement_amount: appData.disbursement_amount,
          total_repayment_amount: appData.total_repayment_amount,
          repayment_amount: appData.repayment_amount,
        });
        console.log("Fee fields:", {
          processing_fees: appData.processing_fees,
          legal_fees: appData.legal_fees,
          access_fees: appData.access_fees,
        });
        console.log("Interest rate fields:", {
          interest_rate: appData.interest_rate,
          interestRate: appData.interestRate,
          agreed_interest_rate: appData.agreed_interest_rate,
          loan_status: appData.loan_status,
        });
        console.log("Date fields:", {
          created_at: appData.created_at,
          updated_at: appData.updated_at,
        });
        setApp(mapApiToApp(appData, bioData));
      }
      setLoading(false);
    }
    fetchApplication();
  }, [id]);

  // Fetch rate details from rate-store when status is rate_set but rate is missing
  useEffect(() => {
    async function fetchRateDetails() {
      if (!id || !app) return;

      // Only fetch if status is rate_set and we don't have rate from API
      if (app.status === "RATE_SET" && !app.agreedInterestRate) {
        console.log("[RateStore] Fetching rate details for:", id);
        try {
          const response = await apiCall(`/api/rate-store/${id}`);
          if (!response.error && response.data) {
            const data = response.data as any;
            console.log("[RateStore] Got rate details:", data);
            setRateStoreData(data);
          } else {
            console.log("[RateStore] No rate details found (404)");
          }
        } catch (err) {
          console.error("[RateStore] Failed to fetch rate details:", err);
        }
      }
    }
    fetchRateDetails();
  }, [id, app?.status, app?.agreedInterestRate]);

  // Fetch emails for this application
  useEffect(() => {
    async function fetchEmails() {
      if (!id || id === "undefined") return;
      setLoadingEmails(true);
      try {
        const { data, error } = await emailApi.getByApplication(id);
        if (!error && data) {
          // Fetch documents for each email
          const emailsWithDocs = await Promise.all(
            (Array.isArray(data) ? data : []).map(async (email) => {
              const { data: docs } = await emailApi.getDocumentsByEmail(email.id);
              return { ...email, documents: docs ?? [] };
            })
          );
          setEmails(emailsWithDocs);
        }
      } catch (err) {
        console.error("Failed to fetch emails:", err);
      } finally {
        setLoadingEmails(false);
      }
    }
    fetchEmails();
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading application...
      </div>
    );
  }

  if (fetchError || !app) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">{fetchError ?? "Application not found."}</p>
        <Button
          onClick={() => navigate(-1)}
          variant="outline"
          className="mt-4 rounded-xl"
        >
          Go Back
        </Button>
      </div>
    );
  }

  const isSalaryAdvance =
    app.loanType === "IDEON_SALARY_ADVANCE" ||
    app.loanType === "NAKAMA_SALARY_ADVANCE";

  // Check if rate has been set - backend now properly sets status to "RATE_SET"
  const hasRateBeenSet = app.status === "RATE_SET";

  // Get interest rate - prioritize API response, then rate store
  const effectiveInterestRate = app.agreedInterestRate ?? rateStoreData?.interestRate;

  // Debug: Log rate set calculation
  console.log("[LoanBreakdown] hasRateBeenSet:", hasRateBeenSet);
  console.log("[LoanBreakdown] agreedInterestRate (from API):", app.agreedInterestRate);
  console.log("[LoanBreakdown] rateStoreData:", rateStoreData);
  console.log("[LoanBreakdown] effectiveInterestRate:", effectiveInterestRate);
  console.log("[LoanBreakdown] calculatedLoanAmount:", app.calculatedLoanAmount);
  console.log("[LoanBreakdown] amountApplied:", app.amountApplied);

  // Calculate loan breakdown for RATE_SET status (general loan)
  // Priority: 1) API financial fields (most accurate), 2) Rate store, 3) Calculate from rate
  let loanBreakdown = null;
  if (hasRateBeenSet) {
    const loanAmount = app.calculatedLoanAmount ?? app.amountApplied ?? 0;
    if (effectiveInterestRate && app.apiProcessingFees !== undefined && app.apiTotalRepayment !== undefined) {
      // Use exact values from API GET response
      loanBreakdown = {
        loanAmount,
        processingFees: app.apiProcessingFees,
        legalFees: app.apiLegalFees ?? 0,
        disbursementAmount: app.apiDisbursementAmount ?? 0,
        interestAmount: loanAmount * effectiveInterestRate,
        repaymentAmount: app.apiTotalRepayment,
        interestRate: effectiveInterestRate,
      };
      console.log("[LoanBreakdown] Using API values:", loanBreakdown);
    } else if (rateStoreData) {
      // Fallback: use rate store data
      loanBreakdown = {
        loanAmount: rateStoreData.loanAmount,
        processingFees: rateStoreData.processingFees,
        legalFees: rateStoreData.legalFees,
        disbursementAmount: rateStoreData.disbursementAmount,
        interestAmount: rateStoreData.loanAmount * rateStoreData.interestRate,
        repaymentAmount: rateStoreData.repaymentAmount,
        interestRate: rateStoreData.interestRate,
      };
      console.log("[LoanBreakdown] Using rate store data:", loanBreakdown);
    } else if (effectiveInterestRate) {
      // Fallback: calculate from effective rate
      loanBreakdown = calculateGeneralLoan(loanAmount, effectiveInterestRate);
      console.log("[LoanBreakdown] Calculated breakdown:", loanBreakdown);
    } else {
      console.log("[LoanBreakdown] No breakdown available - waiting for rate data");
    }
  }

  // Calculate disbursement breakdown for approved salary advance
  const approvedAmount = isSalaryAdvance
    ? (app.amountRequested ?? app.amountApplied ?? 0)
    : 0;
  const originalAppliedAmount = isSalaryAdvance ? (app.amountApplied ?? 0) : 0;
  const _amountWasChanged = isSalaryAdvance && approvedAmount !== originalAppliedAmount && originalAppliedAmount > 0;
  const _disbursementBreakdown =
    isSalaryAdvance && app.status === "APPROVED" && app.disbursementConfirmed !== true
      ? calculateSalaryAdvanceFromAmount(approvedAmount)
      : null;

  const handleConfirmRate = async () => {
    setConfirming(true);
    try {
      console.log("[Rate Confirm] Confirming rate for application:", app.id);
      const { error } = await applicationApi.confirmRate(app.id);
      if (error) {
        console.error("[Rate Confirm] Error:", error);
        toast.error(`Could not confirm rate: ${error}`);
        setConfirming(false);
        return;
      }
      console.log("[Rate Confirm] Success!");
      toast.success("Interest rate accepted! Your application is being processed.");
      // Also update local store for immediate UI feedback
      confirmLoanRate(app.id);
      // Show success briefly then redirect
      setTimeout(() => {
        navigate("/dashboard/applications");
      }, 1500);
    } catch (err) {
      console.error("[Rate Confirm] Exception:", err);
      toast.error("Something went wrong. Please try again.");
      setConfirming(false);
    }
  };

  const handleDeclineRate = async () => {
    try {
      console.log("[Rate Decline] Declining rate for application:", app.id);
      const { error } = await applicationApi.declineRate(app.id);
      if (error) {
        console.error("[Rate Decline] Error:", error);
        toast.error(`Could not decline rate: ${error}`);
        return;
      }
      console.log("[Rate Decline] Success!");
      toast.success("Interest rate declined. The lender will be notified.");
      setTimeout(() => {
        navigate("/dashboard/applications");
      }, 1500);
    } catch (err) {
      console.error("[Rate Decline] Exception:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">
            {LOAN_TYPE_LABELS[app.loanType] ?? app.loanType}
          </h1>
          <p className="text-slate-400 text-xs mt-0.5 font-mono">
            {app.id.slice(0, 8)}…
          </p>
        </div>
        <span
          className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[(app.status as LoanStatus) ?? "PENDING"]
            }`}
        >
          {app.status}
        </span>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Date Submitted",
            value: formatDate(app.submittedAt),
          },
          {
            label: "Amount",
            value: app.amountApplied != null ? KES.format(app.amountApplied) : "—",
          },
          {
            label: "Last Updated",
            value: formatDate(app.updatedAt),
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-4"
          >
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-sm font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Bio Data */}
      <Section title="Bio Data">
        <Field label="Full Name" value={app.customerName} />
        <Field label="ID Number" value={app.idNumber} />
        <Field label="Phone Number" value={app.phoneNumber} />
        <Field label="Email Address" value={app.emailAddress} />
        {app.kraPin && <Field label="KRA PIN" value={app.kraPin} />}
      </Section>

      {/* ── LOAN DETAILS ── */}
      <Section title="Loan Details">
        <Field label="Loan Type" value={LOAN_TYPE_LABELS[app.loanType] ?? app.loanType} />
        <Field label="Amount Applied" value={`Ksh ${app.amountApplied ?? 0}`} />
        <Field label="Processing Fees" value={`Ksh ${app.apiProcessingFees ?? 0}`} />
        <Field label="Legal Fees" value={`Ksh ${app.apiLegalFees ?? 0}`} />
        <Field label="Access Fees" value={`Ksh ${app.apiAccessFees ?? 0}`} />
        <Field
          label="Interest Rate"
          value={effectiveInterestRate
            ? `${(effectiveInterestRate * 100).toFixed(2)}%`
            : null
          }
        />
        <Field label="Disbursement Amount" value={`Ksh ${app.apiDisbursementAmount ?? 0}`} />
        <Field label="Repayment Amount" value={`Ksh ${app.apiTotalRepayment ?? 0}`} />
      </Section>

      {/* ── DOCUMENTS ── */}
      {app.documents && app.documents.length > 0 && (
        <Section title="Documents">
          {app.documents.map((doc: any) => (
            <div key={doc.id} className="col-span-1 sm:col-span-2 flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {doc.document_type.replace(/_/g, " ")}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4 transition-colors hover:bg-slate-100/80 gap-4">
                <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                  <div className="bg-white p-2 rounded-lg ring-1 ring-slate-200 shadow-sm flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{doc.file_name}</p>
                    {doc.document_passcode && (
                      <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="bg-slate-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">Passcode</span>
                        {doc.document_passcode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl bg-white shadow-sm border-slate-200 text-gray-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50"
                    onClick={async () => {
                      const { error } = await downloadFile(`/api/application/documents/download/${doc.id}`, doc.file_name);
                      if (error) toast.error(error);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1.5" />
                    Download
                  </Button>

                </div>
              </div>

              {/* Update Document Inline Form */}
              {editingDocId === doc.id && (
                <div className="mt-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-blue-900">Update Document</h4>
                    <button onClick={() => setEditingDocId(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        New File
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-1 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Passcode (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter passcode"
                        value={updatePasscode}
                        onChange={(e) => setUpdatePasscode(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateDocument(doc.document_type)}
                      disabled={isUpdating || !updateFile}
                      className="bg-brand-blue hover:bg-slate-800 text-white rounded-xl"
                    >
                      {isUpdating ? "Updating..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Salary Advance fields */}
      {isSalaryAdvance && (
        <Section title="Salary Advance Details">
          <Field label="Payroll Number" value={app.payrollNumber} />
          <Field label="Nature of Employment" value={app.natureOfEmployment} />
          <Field label="Designation" value={app.designation} />
          <Field
            label="Basic Pay – Month 1"
            value={
              app.basicPayMonth1
                ? `KES ${app.basicPayMonth1.toLocaleString()}`
                : undefined
            }
          />
          <Field
            label="Basic Pay – Month 2"
            value={
              app.basicPayMonth2
                ? `KES ${app.basicPayMonth2.toLocaleString()}`
                : undefined
            }
          />
          <Field
            label="Basic Pay – Month 3"
            value={
              app.basicPayMonth3
                ? `KES ${app.basicPayMonth3.toLocaleString()}`
                : undefined
            }
          />
        </Section>
      )}

      {/* Already confirmed/declined note */}
      {isSalaryAdvance && app.status === "APPROVED" && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 text-sm text-emerald-700">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="font-semibold">Your loan has been approved</span>
          </div>
          <p className="mt-1 text-emerald-600">Your funds are being processed for disbursement. You will be notified once disbursed.</p>
        </div>
      )}

      {/* General Loan fields */}
      {app.loanType === "GENERAL_LOAN" && (
        <Section title="General Loan Details">
          <Field label="Employment Type" value={app.employmentType} />
          <Field
            label="First Time Applicant"
            value={app.isFirstTimeApplicant}
          />
          <Field
            label="Month 1 Earnings"
            value={
              app.lastEarningsMonth1
                ? `KES ${app.lastEarningsMonth1.toLocaleString()}`
                : undefined
            }
          />
          <Field
            label="Month 2 Earnings"
            value={
              app.lastEarningsMonth2
                ? `KES ${app.lastEarningsMonth2.toLocaleString()}`
                : undefined
            }
          />
          <Field
            label="Month 3 Earnings"
            value={
              app.lastEarningsMonth3
                ? `KES ${app.lastEarningsMonth3.toLocaleString()}`
                : undefined
            }
          />
          <Field label="Terms Accepted" value={app.termsAccepted} />
        </Section>
      )}

      {/* Fallback: Rate set but interest rate not available */}
      {hasRateBeenSet && !loanBreakdown && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden">
          <div className="bg-amber-100 px-6 py-4 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="font-black text-amber-900">
                  Rate Pending Review
                </h2>
                <p className="text-sm text-amber-700 mt-0.5">
                  The admin has updated your application. Please refresh to see the latest details or contact support if this persists.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      )}

      {/* Rate Confirmation Section - Shows when rate has been set (RATE_SET status or pending with interest rate) */}
      {hasRateBeenSet && loanBreakdown && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl overflow-hidden">
          <div className="bg-blue-100 px-6 py-4 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-black text-blue-900">
                  Action Required: Confirm Your Loan Terms
                </h2>
                <p className="text-sm text-blue-700 mt-0.5">
                  Please review the proposed interest rate and loan breakdown below.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Interest Rate Badge */}
            <div className="flex items-center justify-center">
              <div className="bg-white border-2 border-blue-300 rounded-xl px-8 py-4 text-center">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                  Proposed Interest Rate
                </p>
                <p className="text-4xl font-black text-blue-900">
                  {((effectiveInterestRate ?? 0) * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Set by admin on {formatDate(app.interestRateSetAt)}
                </p>
              </div>
            </div>

            {/* Loan Breakdown */}
            <div className="bg-white rounded-xl border border-blue-200 p-5">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
                Loan Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Loan Amount</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatKES(loanBreakdown.loanAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Processing Fees (3%)</span>
                  <span className="text-sm font-medium text-red-600">
                    - {formatKES(loanBreakdown.processingFees)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">Legal Fees</span>
                  <span className="text-sm font-medium text-red-600">
                    - {formatKES(loanBreakdown.legalFees)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-emerald-50 -mx-5 px-5">
                  <span className="text-sm font-semibold text-emerald-700">
                    You Will Receive
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    {formatKES(loanBreakdown.disbursementAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">
                    Interest ({((effectiveInterestRate ?? 0) * 100).toFixed(0)}%)
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {formatKES(loanBreakdown.interestAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 bg-slate-50 -mx-5 px-5 rounded-b-xl">
                  <span className="text-sm font-semibold text-gray-700">
                    Total Repayment
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {formatKES(loanBreakdown.repaymentAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!confirming ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleConfirmRate}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  I Accept These Terms
                </button>
                <button
                  onClick={handleDeclineRate}
                  className="flex-1 border-2 border-red-300 hover:border-red-400 hover:bg-red-50 text-red-700 font-bold px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <AlertCircle className="h-5 w-5" />
                  I Reject This Rate
                </button>
              </div>
            ) : (
              <div className="bg-emerald-100 border border-emerald-200 rounded-xl px-6 py-4 text-center">
                <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-emerald-800 font-semibold">
                  Terms Confirmed! Redirecting...
                </p>
              </div>
            )}

            <p className="text-xs text-blue-600 text-center">
              By accepting, you agree to repay {formatKES(loanBreakdown.repaymentAmount)} as per the loan terms.
            </p>
          </div>
        </div>
      )}

      {/* Documents */}
      {(app.idCopyUrl || app.kraPinDocUrl || app.payslipUrl) && (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-4">
            Documents Submitted
          </h2>
          <div className="space-y-2">
            {app.idCopyUrl && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">ID Copy:</span>
                <span className="text-slate-400">{app.idCopyUrl}</span>
              </div>
            )}
            {app.kraPinDocUrl && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">KRA PIN Doc:</span>
                <span className="text-slate-400">{app.kraPinDocUrl}</span>
              </div>
            )}
            {app.payslipUrl && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Payslip:</span>
                <span className="text-slate-400">{app.payslipUrl}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Status - Only show for disbursed loans */}
      {app.status === "DISBURSED" && (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Payment Status
            </h2>
            {app.paymentStatus && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_STYLES[(app.paymentStatus as PaymentStatus) ?? "UNPAID"]
                  }`}
              >
                {PAYMENT_STATUS_LABELS[(app.paymentStatus as PaymentStatus) ?? "UNPAID"]}
              </span>
            )}
          </div>

          {/* Payment details */}
          {(() => {
            const totalRepayment = app.apiTotalRepayment ?? 
              (isSalaryAdvance ? (app.amountRequested ?? app.amountApplied ?? 0) : (app.amountApplied ?? 0));
            const actualPaid = app.amountPaid ?? 0;

            let displayAmountPaid = 0;
            let displayAmountRemaining = 0;

            if (app.paymentStatus === "FULLY_PAID") {
              displayAmountPaid = totalRepayment;
              displayAmountRemaining = 0;
            } else if (app.paymentStatus === "UNPAID") {
              displayAmountPaid = 0;
              displayAmountRemaining = totalRepayment;
            } else {
              // PARTIALLY_PAID or other
              displayAmountPaid = actualPaid;
              displayAmountRemaining = Math.max(0, totalRepayment - actualPaid);
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                    Loan Amount
                  </p>
                  <p className="text-lg font-bold text-slate-800">
                    {KES.format(
                      isSalaryAdvance
                        ? (app.amountRequested ?? app.amountApplied ?? 0)
                        : (app.amountApplied ?? 0)
                    )}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">
                    Amount Paid
                  </p>
                  <p className="text-lg font-bold text-emerald-700">
                    {KES.format(displayAmountPaid)}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">
                    Amount Remaining
                  </p>
                  <p className="text-lg font-bold text-orange-700">
                    {KES.format(displayAmountRemaining)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Payment status messages */}
          {app.paymentStatus === "FULLY_PAID" && (
            <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
              Your loan has been fully paid. Thank you!
              {app.lastPaymentDate && (
                <span className="text-emerald-600 ml-1">
                  (Last payment: {formatDate(app.lastPaymentDate)})
                </span>
              )}
            </div>
          )}
          {app.paymentStatus === "PARTIALLY_PAID" && (
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
              You have made partial payments. Please continue with the remaining balance.
            </div>
          )}
          {(app.paymentStatus === "UNPAID" || !app.paymentStatus) && (
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-orange-700">
              {app.loanType === "GENERAL_LOAN"
                ? "Your loan is disbursed. Please make your payment before the due date."
                : "Your salary advance is disbursed. The amount will be deducted from your salary."
              }
            </div>
          )}
        </div>
      )}

      {/* Status note */}
      {app.status === "PENDING" && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-5 py-4 text-sm text-yellow-700">
          Your application is under review. You will be notified once a
          decision is made (within 24 hours).
        </div>
      )}
      {app.status === "CONFIRMED" && (
        <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-5 py-4 text-sm text-cyan-700">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="font-semibold">Terms Confirmed</span>
          </div>
          You have accepted the loan terms. Your application is now awaiting final
          admin approval and disbursement.
        </div>
      )}
      {app.status === "APPROVED" && (
        <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-4 text-sm text-green-700">
          Your application has been approved. Disbursement is being processed.
        </div>
      )}
      {app.status === "DECLINED" && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-700">
          Your application was not approved at this time. Contact us for more
          information.
        </div>
      )}

      {/* ── Messages from Admin ── */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Messages from Admin
          </h2>
        </div>

        {loadingEmails ? (
          <div className="text-center text-slate-400 py-4">Loading messages...</div>
        ) : emails.length === 0 ? (
          <p className="text-sm text-slate-500">
            No messages yet. Admin communications regarding your application will appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-slate-500">
                    {new Date(email.created_at).toLocaleDateString("en-KE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">
                  {email.confirmation_text}
                </p>

                {/* Attachments */}
                {email.documents && email.documents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Attachments
                    </p>
                    <div className="space-y-2">
                      {email.documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={emailApi.getDownloadUrl(doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span>{doc.filename || "Attachment"}</span>
                          <Download className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {app.notes && (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Admin Notes
            </h2>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <p className="text-sm text-amber-800 whitespace-pre-wrap">
              {String(app.notes)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
