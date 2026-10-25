

import { canDeleteApplication } from "@/lib/loanStatus";
import { formatName } from "@/lib/formatName";
import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Banknote,
  AlertTriangle,
  Percent,
  Mail,
  Paperclip,
  Send,
  X,
  FileText,
  Download,
  Trash2,
  Gavel,
} from "lucide-react";
import {
  useAdminApplication,
  getStatusDisplay,
  getLoanTypeDisplay,
} from "@/hooks/useAdminData";
import { adminApplicationsApi } from "@/lib/adminApi";
import { downloadFile, apiCall } from "@/lib/apiClient";
import { emailApi } from "@/lib/emailApi";
import { formatKES } from "@/lib/loanCalculations";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The start of the day a timestamp falls on, as the value of a datetime-local input (undefined if it is not a date)
const localDayStart = (value: string) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00`;
};

// "now" as the value of a datetime-local input (the browser's own clock, to the minute)
const localNow = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; style: string }> = {
  "unpaid": { label: "Unpaid", style: "bg-orange-100 text-orange-700" },
  "partially_paid": { label: "Partially Paid", style: "bg-blue-100 text-blue-700" },
  "delinquent": { label: "Delinquent", style: "bg-red-100 text-red-700" },
  "fully_paid": { label: "Fully Paid", style: "bg-emerald-100 text-emerald-700" },
};

// ---------------------------------------------------------------------------
// Field row helper
// ---------------------------------------------------------------------------

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === "") return null;
  const display =
    typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : typeof value === "number"
        ? KES.format(value)
        : String(value);
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className={`text-sm text-slate-800 font-medium break-words ${/^[a-z][a-z _-]*$/.test(display) ? "capitalize" : ""}`}>{display}</p>
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
    <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-3">
        {children}
      </div>
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
  const { application: app, isLoading, error, refetch } = useAdminApplication(params.id);

  const [notes, setNotes] = useState("");
  const [disbursementNote, setDisbursementNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const [showPartialPayment, setShowPartialPayment] = useState(false);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
  const [partialPaymentDate, setPartialPaymentDate] = useState("");
  const [externalReference, setExternalReference] = useState("");


  const [showChargeInterest, setShowChargeInterest] = useState(false);
  const [chargeInterestAmount, setChargeInterestAmount] = useState("");
  const [chargeInterestDate, setChargeInterestDate] = useState("");

  const [showPenalty, setShowPenalty] = useState(false);
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltyDate, setPenaltyDate] = useState("");
  const [penaltyDescription, setPenaltyDescription] = useState("");
  const [penaltyNotify, setPenaltyNotify] = useState(true);

  const [activeDeclineForm, setActiveDeclineForm] = useState<"top" | "bottom" | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  // Editable loan fields state for all loan types
  const [interestRate, setInterestRate] = useState<string>("");
  const [loanAmount, setLoanAmount] = useState<string>("");
  const [processingFees, setProcessingFees] = useState<string>("");
  const [legalFees, setLegalFees] = useState<string>("");
  const [accessFees, setAccessFees] = useState<string>("");
  const [settingRate, setSettingRate] = useState(false);
  // Store the set rate locally (backend GET doesn't return it)
  const [setRateValue, setSetRateValue] = useState<number | null>(null);
  
  // Ledger Preview State
  const [showLedger, setShowLedger] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  
  // Audit Trail State
    const [riskProfile, setRiskProfile] = useState<any>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  useEffect(() => {
    const fetchRisk = async () => {
      if (!app?.applicantId) return;
      setLoadingRisk(true);
      try {
        const res = await apiCall(`/api/applicants/${app.applicantId}/risk-profile`);
        if (!res.error) {
          setRiskProfile(res.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRisk(false);
      }
    };
    fetchRisk();
  }, [app?.applicantId]);

const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const fetchAuditTrail = async () => {
    if (!app) return;
    setLoadingAudit(true);
    try {
      const res = await apiCall(`/api/applications/audit-trails?application_id=${app.id}`);
      if (!res.error && res.data) {
        setAuditTrail((res.data as any).data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const getLoanRecommendation = (score: number, amount: number) => {
    if (!score || !amount) return null;
    let recommendedPercent = 0;
    let recommendation = "";
    let style = "";
    let icon = null;
    
    if (score >= 800) {
      recommendedPercent = 100;
      recommendation = "Low Risk. Safe to approve full requested amount.";
      style = "bg-emerald-50 border-emerald-200 text-emerald-900";
    } else if (score >= 600) {
      recommendedPercent = 75;
      recommendation = "Moderate Risk. Approve with a 25% haircut to limit exposure.";
      style = "bg-sky-50 border-sky-200 text-sky-900";
    } else if (score >= 400) {
      recommendedPercent = 25;
      recommendation = "High Risk. Recommend a micro-approval test limit (25%) or outright rejection.";
      style = "bg-amber-50 border-amber-200 text-amber-900";
    } else {
      recommendedPercent = 0;
      recommendation = "Severe Risk. Auto-rejection advised.";
      style = "bg-rose-50 border-rose-200 text-rose-900";
    }
    
    const recommendedAmount = amount * (recommendedPercent / 100);
    return { recommendedAmount, recommendation, style };
  };

  useEffect(() => {
    if (app && showAudit && auditTrail.length === 0) {
      fetchAuditTrail();
    }
  }, [app, showAudit]);

  const handlePreviewLedger = async () => {
    if (!app || !app.applicantId) return;
    setLoadingLedger(true);
    try {
      const res = await apiCall(`/api/applicant/statement/${app.applicantId}?application_id=${app.id}`);
      if (!res.error && res.data) {
        setLedgerEntries(res.data as any[]);
        setShowLedger(true);
      } else {
        toast.error(res.error || "Failed to load ledger");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load ledger");
    } finally {
      setLoadingLedger(false);
    }
  };

  
  const [downloadingDossier, setDownloadingDossier] = useState(false);


  const handleDownloadDossier = async () => {
    if (!app) return;
    setDownloadingDossier(true);
    try {
        const { error } = await downloadFile(`/api/applications/${app.id}/dossier`, `Debt_Collection_Profile_${app.customerName.replace(/ /g, '_')}_${app.id.substring(0,8)}.pdf`);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Debt Collection Dossier downloaded successfully");
      }
    } finally {
      setDownloadingDossier(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!app || !app.applicantId) return;
    setDownloadingPdf(true);
    try {
      const { error } = await downloadFile(`/api/applicant/statement/download/${app.applicantId}?application_id=${app.id}`, `statement_${app.id}.pdf`);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Statement downloaded successfully");
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Initialize editable fields when app data loads
  useEffect(() => {
    if (app) {

      setLoanAmount(app.amountApplied?.toString() || "");
      // Convert processing fees to percentage (3% by default)
      if (app.processingFees && app.amountApplied && app.amountApplied > 0) {
        const processingFeePercentage = ((app.processingFees / app.amountApplied) * 100).toFixed(2);
        setProcessingFees(processingFeePercentage);
      } else {
        setProcessingFees("3"); // Default 3% if no fees or amount
      }
      setLegalFees(app.legalFees?.toString() || "0");

      // Convert access fees to percentage (0% by default)
      if (app.accessFees && app.amountApplied && app.amountApplied > 0) {
        const accessFeePercentage = ((app.accessFees / app.amountApplied) * 100).toFixed(2);
        setAccessFees(accessFeePercentage);
      } else {
        setAccessFees("0");
      }

      // Handle interest rate - could be decimal (0.10) or percentage (10)
      if (app.interestRate !== undefined && app.interestRate !== null && app.interestRate !== 0) {
        // If rate is <= 1, assume it's decimal format (e.g., 0.10 = 10%)
        // If rate is > 1, assume it's already percentage (e.g., 10 = 10%)
        const rateValue = app.interestRate <= 1
          ? (app.interestRate * 100).toFixed(2)  // Convert 0.10 to 10
          : app.interestRate.toString();         // Already 10, keep as is
        setInterestRate(rateValue);
      } else {
        // Default to 10% for new applications
        setInterestRate("10");
      }
    }
  }, [app]);

  // Fetch stored rate on mount (in case page is refreshed after setting rate)
  useEffect(() => {
    async function fetchStoredRate() {
      if (!params.id) return;
      try {
        const response = await apiCall(`/api/rate-store/${params.id}`);
        if (!response.error && response.data) {
          const data = response.data as any;
          if (data.interestRate) {
            // Convert decimal to percentage
            setSetRateValue(data.interestRate * 100);
          }
        }
        // 404 is expected when rate-store has been reset — safe to ignore
      } catch {
        // Network errors are non-critical for the rate store fallback
      }
    }
    fetchStoredRate();
  }, [params.id]);

  // Email state
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Delete states
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize email subject when app loads or composer opens
  const defaultSubject = app ? `Regarding Your Loan Application #${app.id.slice(0, 8)}` : "";

  const handleOpenComposer = () => {
    setEmailSubject(defaultSubject);
    setShowEmailComposer(true);
  };

  const handleStatus = async (newStatus: "Approved" | "Declined" | "Disbursed", message?: string) => {
    if (!app) return;
    setUpdating(true);

    try {
      const response = await adminApplicationsApi.updateStatus(app.id, newStatus, message);
      if (response.error) {
        toast.error(response.error);
        return;
      }

      if (newStatus === "Approved") toast.success("Application approved");
      else if (newStatus === "Declined") toast.error("Application declined");
      else if (newStatus === "Disbursed") toast.success("Loan marked as disbursed");

      refetch();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDisburse = async () => {
    if (!app) return;
    setUpdating(true);
    try {
      const { error } = await apiCall(`/api/applications/disbursed/${app.id}`, {
        method: "PATCH",
        body: { message: disbursementNote }
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Loan marked as disbursed");
      refetch();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handlePartialPayment = async () => {
    if (!app || !partialPaymentAmount || isNaN(Number(partialPaymentAmount)) || Number(partialPaymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!partialPaymentDate) {
      toast.error("Please select a date and time");
      return;
    }
    setUpdating(true);
    try {
      const { error } = await apiCall(`/api/applications/partially-paid/${app.id}`, {
        method: "PATCH",
                body: {
          amount: Number(partialPaymentAmount),
          date: String(partialPaymentDate),
          external_reference: externalReference,
          idempotency_key: crypto.randomUUID()
        },
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Application marked as partially paid");
      setShowPartialPayment(false);
      setPartialPaymentAmount("");
      setPartialPaymentDate("");
                    setExternalReference("");
      window.location.reload();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleChargeInterest = async () => {
    if (!app || !chargeInterestAmount || isNaN(Number(chargeInterestAmount)) || Number(chargeInterestAmount) <= 0) {
      toast.error("Please enter a valid interest amount");
      return;
    }
    if (!chargeInterestDate) {
      toast.error("Please select a date and time");
      return;
    }
    setUpdating(true);
    try {
      const { error } = await apiCall(`/api/applications/charge-interest/${app.id}`, {
        method: "PATCH",
        body: {
          interest_rate: Number(chargeInterestAmount),
          date: String(chargeInterestDate),
        },
      });
      if (error) {
        toast.error(error);
        return;
      }
      toast.success("Interest charged successfully");
      setShowChargeInterest(false);
      setChargeInterestAmount("");
      setChargeInterestDate("");
      window.location.reload();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const closePenalty = () => {
    setShowPenalty(false);
    setPenaltyAmount("");
    setPenaltyDate("");
    setPenaltyDescription("");
    setPenaltyNotify(true);
  };

  const handleAddPenalty = async () => {
    const amount = Number(penaltyAmount);
    if (!app || !penaltyAmount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter the penalty amount");
      return;
    }
    if (penaltyDescription.trim().length < 3) {
      toast.error("Please describe the penalty (at least 3 characters)");
      return;
    }
    if (!penaltyDate) {
      toast.error("Please select a date and time");
      return;
    }
    setUpdating(true);
    try {
      const notify = penaltyNotify && !!app.email;
      const { data, error } = await apiCall<{ balance_owed: number; borrower_emailed: boolean }>(`/api/applications/penalty/${app.id}`, {
        method: "POST",
        body: { amount, date: penaltyDate, description: penaltyDescription.trim(), notify },
      });
      if (error) {
        toast.error(error);
        return;
      }
      const told = data?.borrower_emailed ? " The borrower has been emailed." : notify ? " The borrower could not be emailed (no usable address)." : "";
      toast.success(`Penalty of ${KES.format(amount)} added. Balance owed is now ${KES.format(data?.balance_owed ?? 0)}.${told}`);
      closePenalty();
      refetch();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleRepaymentAction = async (action: "default" | "paid" | "escalate") => {
    if (!app) return;
    setUpdating(true);
    try {
      if (action === "escalate") {
        const { error } = await downloadFile(`/api/applications/escalate/${app.id}`, `Escalated_Demand_Notice.pdf`);
        if (error) {
          toast.error(error);
          return;
        }
        toast.success("Escalation export downloaded");
      } else {
        const { error } = await apiCall(`/api/applications/${action}/${app.id}`, {
          method: "PATCH",
        });
        if (error) {
          toast.error(error);
          return;
        }
        toast.success(`Application marked as ${action}`);
        window.location.reload();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Handler to set loan terms (all editable fields) for personal/general loans
  const handleSetLoanTerms = async () => {
    if (!app) return;
    const rate = parseFloat(interestRate);
    const amount = parseFloat(loanAmount);
    const procFeePercentage = parseFloat(processingFees);
    const accessFeePercentage = parseFloat(accessFees);

    if (isNaN(rate) || rate <= 0 || rate > 100) {
      toast.error("Please enter a valid interest rate between 0 and 100");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid loan amount");
      return;
    }
    if (isNaN(procFeePercentage) || procFeePercentage < 0 || procFeePercentage > 100) {
      toast.error("Please enter a valid processing fee percentage between 0 and 100");
      return;
    }
    if (isNaN(accessFeePercentage) || accessFeePercentage < 0 || accessFeePercentage > 100) {
      toast.error("Please enter a valid access fee percentage between 0 and 100");
      return;
    }

    setSettingRate(true);
    try {
      // Convert percentage to decimal (e.g., 10% -> 0.10)
      const rateDecimal = rate / 100;

      // Convert processing fee percentage to absolute amount
      const procFees = amount * (procFeePercentage / 100);
      const accFees = amount * (accessFeePercentage / 100);

      // Calculate legal fees
      const legFees = parseFloat(legalFees) || 0;

      // Calculate breakdown using admin-entered values
      const disbursementAmount = amount - procFees - legFees - accFees;
      const interestAmount = amount * rateDecimal;
      const repaymentAmount = amount + interestAmount;


      // Use the amend endpoint with all editable loan values
      const response = await adminApplicationsApi.setLoanTerms(app.id, {
        loanAmount: amount,
        interestRate: rateDecimal,
        processingFees: procFees,
        legalFees: legFees,
        accessFees: accFees,
        disbursementAmount,
        repaymentAmount,
      });


      if (response.error) {
        console.error("[Terms] API returned error:", response.error);
        toast.error(`Could not set loan terms: ${response.error}`);
        return;
      }

      // Store rate details in our local rate-store so applicant can access them
      // (Backend doesn't return these fields to applicants)
      try {
        await apiCall(`/api/rate-store/${app.id}`, {
          method: "POST",
          body: {
            interestRate: rateDecimal,
            processingFees: procFees,
            legalFees: legFees,
            accessFees: accFees,
            disbursementAmount,
            repaymentAmount,
            loanAmount: amount,
          },
        });
      } catch (storeErr) {
        console.error("[Terms] Failed to store in rate-store:", storeErr);
        // Don't fail the whole operation if rate-store fails
      }

      // Check if the response actually contains updated data
      if (!response.data) {
        console.warn("[Terms] WARNING - No data in response, changes may not have persisted");
      }

      // Store the rate locally for display (backend GET doesn't return it)
      setSetRateValue(rate);

      toast.success(`Loan terms set successfully. Applicant will be notified.`);
      refetch();
    } catch (err) {
      console.error("[Terms] EXCEPTION:", err);
      toast.error("Failed to set loan terms. Please try again.");
    } finally {
      setSettingRate(false);
    }
  };

  // Email handlers
  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setEmailAttachments(prev => {
        const updated = [...prev, ...newFiles];
        return updated;
      });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendEmail = async () => {
    if (!app || !emailMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSendingEmail(true);
    try {

      const formData = new FormData();
      formData.append("confirmation_text", emailMessage.trim());
      formData.append("subject", emailSubject.trim() || defaultSubject);

      if (emailAttachments.length > 0) {
        for (const file of emailAttachments) {
          formData.append("files", file);
        }
      }

      const emailResponse = await emailApi.create(app.id, formData);


      if (emailResponse.error) {
        console.error("[Email] API Error:", emailResponse.error);
        toast.error(emailResponse.error);
        return;
      }

      toast.success("Email sent to applicant successfully!");
      setEmailSubject("");
      setEmailMessage("");
      setEmailAttachments([]);
      setShowEmailComposer(false);
    } catch (err) {
      console.error("Send email error:", err);
      toast.error("Failed to send email. The email endpoint may not be available on the backend.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Delete handler
  const handleDeleteApplication = async () => {
    if (!app) return;
    setIsDeleting(true);
    try {
      const res = await apiCall(`/api/applications/delete/${app.id}`, { method: "DELETE" });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Application deleted successfully");
      navigate("/admin/applications");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete application");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 w-full space-y-4">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <p className="text-slate-500">{error || "Application not found."}</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="rounded-lg"
          >
            Go Back
          </Button>
          <Button
            onClick={() => refetch()}
            className="rounded-lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(app.status);
  // Normalize status to handle both underscore and space variants from backend
  // e.g. "rate_confirmed", "Rate Confirmed", "RATE_CONFIRMED" all map to "rate_confirmed"
  const normalizedStatus = (app.status || "").toLowerCase().replace(/[\s-]/g, "_");
  const isPending = normalizedStatus === "pending" || normalizedStatus === "pending_processing";
  const isAmended = normalizedStatus === "amended";
  const isApproved = normalizedStatus === "approved";
  const isConfirmed = normalizedStatus === "confirmed";
  const isRateSet = normalizedStatus === "rate_set";
  const isRateConfirmed = normalizedStatus === "rate_confirmed";
  const isRateDeclined = normalizedStatus === "rate_declined";
  const isDisbursed = normalizedStatus === "disbursed";
  const normalizedRepaymentStatus = (app.repaymentStatus || "").toLowerCase();

  // Check if this is a personal/general loan (not salary advance)
  const isPersonalLoan = app.loanType?.toLowerCase() === "personal" || app.loanType?.toLowerCase() === "general";
  const isSalaryAdvance = app.loanType?.toLowerCase() === "salary_advance" || app.loanType?.toLowerCase() === "salary advance" || app.loanType?.toLowerCase() === "advance";

  // Admin can set terms for both personal loans and salary advances
  const canEditLoanTerms = isPersonalLoan || isSalaryAdvance;

  // Calculate loan preview using editable values
  const previewRate = parseFloat(interestRate) / 100;  // Convert percentage to decimal
  const previewAmount = parseFloat(loanAmount) || 0;
  const previewProcFeesPercent = parseFloat(processingFees) || 0;
  const previewProcFees = (previewAmount * previewProcFeesPercent) / 100;
  const previewAccFeesPercent = parseFloat(accessFees) || 0;
  const previewAccFees = (previewAmount * previewAccFeesPercent) / 100;

  // Calculate preview legal fees
  const previewLegFees = parseFloat(legalFees) || 0;


  const loanPreview = canEditLoanTerms && !isNaN(previewRate) && previewRate > 0 && previewAmount > 0
    ? {
      loanAmount: previewAmount,
      processingFees: previewProcFees,
      legalFees: previewLegFees,
      accessFees: previewAccFees,
      disbursementAmount: previewAmount - previewProcFees - previewLegFees - previewAccFees,
      interestAmount: previewAmount * previewRate,
      repaymentAmount: previewAmount + (previewAmount * previewRate),
      interestRate: previewRate,
    }
    : null;

  const renderDeclineForm = (position: "top" | "bottom") => {
    if (activeDeclineForm !== position) return null;
    return (
      <div className="bg-red-50 border border-red-100 rounded-lg p-4 mt-4 w-full">
        <h3 className="text-sm font-bold text-red-900 mb-3">Reason for Rejection</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-red-700 uppercase tracking-wide mb-1.5">Reason</label>
            <input
              type="text"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Incomplete documents"
              className="w-full px-4 py-2.5 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                setActiveDeclineForm(null);
                setDeclineReason("");
              }}
              disabled={updating}
              className="flex-1 sm:flex-none rounded-lg text-red-600 border-red-200 hover:bg-red-100"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleStatus("Declined", declineReason);
                setActiveDeclineForm(null);
                setDeclineReason("");
              }}
              disabled={updating || !declineReason.trim()}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
            >
              Submit Rejection
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header: back + name/status on one row, the action buttons on their own row below (side by side only on very wide screens) */}
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="mt-0.5 p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900 break-words">
              {formatName(app.customerName)}
            </h1>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusDisplay.style}`}
            >
              {statusDisplay.label}
            </span>
            {normalizedRepaymentStatus && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_MAP[normalizedRepaymentStatus]?.style || "bg-slate-100 text-gray-700"
                  }`}
              >
                {PAYMENT_STATUS_MAP[normalizedRepaymentStatus]?.label || normalizedRepaymentStatus}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-xs mt-1 font-mono break-all">
            ID: {app.id}
          </p>
        </div>

        {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap basis-full 2xl:basis-auto">
            <Button
              onClick={handleDownloadDossier}
              disabled={downloadingDossier}
              variant="outline"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-brand-blue rounded-lg font-bold"
            >
              <Download className="mr-1.5 h-4 w-4" />
              {downloadingDossier ? "Exporting..." : "Export Debt Dossier"}
            </Button>
          {/* For loans that need rate setting in PENDING status, don't show approve/decline - show rate setting instead */}
          {(isPending && !canEditLoanTerms) && (
            <>
              <Button
                onClick={() => handleStatus("Approved")}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setActiveDeclineForm(activeDeclineForm === "top" ? null : "top")}
                disabled={updating}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Decline
              </Button>
            </>
          )}
          {/* For AMENDED status (application was amended by HR/applicant), show approve/decline */}
          {isAmended && (
            <>
              <Button
                onClick={() => handleStatus("Approved")}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setActiveDeclineForm(activeDeclineForm === "top" ? null : "top")}
                disabled={updating}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Decline
              </Button>
            </>
          )}
          {/* For loans with RATE_CONFIRMED status (applicant accepted rate), show approve/decline */}
          {isRateConfirmed && canEditLoanTerms && (
            <>
              <Button
                onClick={() => handleStatus("Approved")}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setActiveDeclineForm(activeDeclineForm === "top" ? null : "top")}
                disabled={updating}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Decline
              </Button>
            </>
          )}
          {/* For loans with CONFIRMED status (legacy), show approve/decline */}
          {isConfirmed && canEditLoanTerms && (
            <>
              <Button
                onClick={() => handleStatus("Approved")}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <Button
                onClick={() => setActiveDeclineForm(activeDeclineForm === "top" ? null : "top")}
                disabled={updating}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Decline
              </Button>
            </>
          )}

          {/* Repayment Actions for Disbursed Loans */}
          {isDisbursed && (
            <>
              {(normalizedRepaymentStatus === "unpaid" || normalizedRepaymentStatus === "partially_paid" || normalizedRepaymentStatus === "delinquent") && (
                <Button
                  onClick={() => handleRepaymentAction("default")}
                  disabled={updating}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold"
                >
                  <AlertTriangle className="mr-1.5 h-4 w-4" />
                  Mark as Default
                </Button>
              )}
              
              {(normalizedRepaymentStatus === "unpaid" || normalizedRepaymentStatus === "partially_paid" || normalizedRepaymentStatus === "delinquent" || normalizedRepaymentStatus === "defaulted" || normalizedRepaymentStatus === "escalated") && (
                <>
                  <Button
                    onClick={() => {
                      setShowPartialPayment(!showPartialPayment);
                      setShowChargeInterest(false);
                      closePenalty();
                    }}
                    disabled={updating}
                    className="bg-brand-blue hover:bg-slate-800 text-white rounded-lg font-bold"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Mark as Partially Paid
                  </Button>
                  {/* Rollover interest is not offered on a delinquent loan: its 15% collection fee was already added */}
                  {normalizedRepaymentStatus !== "delinquent" && (
                    <Button
                      onClick={() => {
                        setShowChargeInterest(!showChargeInterest);
                        setShowPartialPayment(false);
                        closePenalty();
                      }}
                      disabled={updating}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
                    >
                      <Percent className="mr-1.5 h-4 w-4" />
                      Charge Interest
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      if (showPenalty) {
                        closePenalty();
                        return;
                      }
                      setShowPenalty(true);
                      setPenaltyDate(localNow());
                      setShowPartialPayment(false);
                      setShowChargeInterest(false);
                    }}
                    disabled={updating}
                    className="bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold"
                  >
                    <Gavel className="mr-1.5 h-4 w-4" />
                    Add Penalty
                  </Button>
                  <Button
                    onClick={() => handleRepaymentAction("paid")}
                    disabled={updating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Mark as Paid
                  </Button>
                </>
              )}
            </>
          )}

          {/* Escalate action for Defaulted loans */}
          {(normalizedRepaymentStatus === "defaulted" || normalizedRepaymentStatus === "escalated") && (
            <Button
              onClick={() => handleRepaymentAction("escalate")}
              disabled={updating}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
            >
              <AlertTriangle className="mr-1.5 h-4 w-4" />
              Escalate
            </Button>
          )}
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            className="rounded-lg"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="basis-full">{renderDeclineForm("top")}</div>
      </div>

      {showPartialPayment && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-bold text-blue-900 mb-3">Mark as Partially Paid</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Amount Paid (KES)</label>
              <input
                type="number" onWheel={(e) => e.currentTarget.blur()}
                min="1"
                value={partialPaymentAmount}
                onChange={(e) => setPartialPaymentAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-4 py-2.5 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Date & Time</label>
              <input
                type="datetime-local"
                value={partialPaymentDate}
                onChange={(e) => setPartialPaymentDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
              />
            </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">Payment Reference</label>
                <input
                  type="text"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  placeholder="e.g. M-PESA Code"
                  className="w-full px-4 py-2.5 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                />
              </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPartialPayment(false);
                  setPartialPaymentAmount("");
                  setPartialPaymentDate("");
                    setExternalReference("");
                }}
                disabled={updating}
                className="flex-1 sm:flex-none rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePartialPayment}
                disabled={updating || !partialPaymentAmount || !partialPaymentDate}
                className="flex-1 sm:flex-none bg-brand-blue hover:bg-slate-800 text-white rounded-lg font-bold"
              >
                Submit Payment
              </Button>
            </div>
          </div>
        </div>
      )}

      {showChargeInterest && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-bold text-purple-900 mb-3">Charge Interest</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">Interest Rate (%)</label>
              <input
                type="number" onWheel={(e) => e.currentTarget.blur()}
                min="1"
                value={chargeInterestAmount}
                onChange={(e) => setChargeInterestAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-4 py-2.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-purple-700 uppercase tracking-wide mb-1.5">Date & Time</label>
              <input
                type="datetime-local"
                value={chargeInterestDate}
                onChange={(e) => setChargeInterestDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-colors"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChargeInterest(false);
                  setChargeInterestAmount("");
                  setChargeInterestDate("");
                }}
                disabled={updating}
                className="flex-1 sm:flex-none rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChargeInterest}
                disabled={updating || !chargeInterestAmount || !chargeInterestDate}
                className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
              >
                Charge Interest
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPenalty && (
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mt-4">
          <h3 className="text-sm font-bold text-rose-900 mb-3">Add Penalty</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="penalty-amount" className="block text-xs font-bold text-rose-800 uppercase tracking-wide mb-1.5">Amount (KES)</label>
              <input
                id="penalty-amount"
                type="number" onWheel={(e) => e.currentTarget.blur()}
                min="0.01"
                step="0.01"
                value={penaltyAmount}
                onChange={(e) => setPenaltyAmount(e.target.value)}
                placeholder="e.g. 500"
                className="w-full h-[42px] px-4 py-2.5 rounded-lg border border-rose-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-600/20 focus:border-rose-600 transition-colors"
              />
            </div>
            <div className="flex-1 w-full">
              <label htmlFor="penalty-date" className="block text-xs font-bold text-rose-800 uppercase tracking-wide mb-1.5">Date & Time</label>
              <input
                id="penalty-date"
                type="datetime-local"
                min={localDayStart(app.submittedAt)}
                max={localNow()}
                value={penaltyDate}
                onChange={(e) => setPenaltyDate(e.target.value)}
                className="w-full h-[42px] px-4 py-2.5 rounded-lg border border-rose-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-600/20 focus:border-rose-600 transition-colors"
              />
            </div>
            <div className="flex-[2] w-full">
              <label htmlFor="penalty-description" className="block text-xs font-bold text-rose-800 uppercase tracking-wide mb-1.5">Penalty Description</label>
              <input
                id="penalty-description"
                type="text"
                maxLength={120}
                value={penaltyDescription}
                onChange={(e) => setPenaltyDescription(e.target.value)}
                placeholder="e.g. Late payment, March instalment"
                className="w-full h-[42px] px-4 py-2.5 rounded-lg border border-rose-200 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-600/20 focus:border-rose-600 transition-colors"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={closePenalty} disabled={updating} className="flex-1 sm:flex-none rounded-lg">
                Cancel
              </Button>
              <Button
                onClick={handleAddPenalty}
                disabled={updating || !penaltyAmount || !penaltyDate || penaltyDescription.trim().length < 3}
                className="flex-1 sm:flex-none bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold"
              >
                Add Penalty
              </Button>
            </div>
          </div>
          <label className={`mt-3 flex items-start gap-2 text-[13px] text-slate-800 ${app.email ? "cursor-pointer" : ""}`}>
            <input
              type="checkbox"
              checked={penaltyNotify && !!app.email}
              disabled={!app.email}
              onChange={(e) => setPenaltyNotify(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-rose-300 accent-rose-700"
            />
            <span>
              {app.email ? (
                <>
                  Email the borrower at <span className="font-semibold break-all">{app.email}</span>.{" "}
                  <span className="text-slate-600">They are told the amount, the reason, the date and what is now owed.</span>
                </>
              ) : (
                <>There is no email address on file for this borrower, so no email will be sent.</>
              )}
            </span>
          </label>
          <p className="mt-2 text-xs text-slate-700" aria-live="polite">
            {Number(penaltyAmount) > 0 ? (
              <>
                Balance owed: <span className="font-semibold tabular-nums">{KES.format(app.balanceOwed)}</span> →{" "}
                <span className="font-semibold tabular-nums text-rose-800">{KES.format(Math.round((app.balanceOwed + Number(penaltyAmount)) * 100) / 100)}</span>
                {" · "}
              </>
            ) : (
              <>Balance owed now: <span className="font-semibold tabular-nums">{KES.format(app.balanceOwed)}</span>{" · "}</>
            )}
            Added to the statement as a charge; the repayment amount and due date do not change.
          </p>
        </div>
      )}

      {/* ── Applicant Info ── */}
      {/* AI Decision Engine Card */}
      {(riskProfile || loadingRisk) && app.amountApplied && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg ring-1 ring-slate-800 shadow-xl p-4 text-white overflow-hidden relative">
          <div className="absolute -right-10 -top-10 opacity-10">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-indigo-400" />
              </div>
              <h2 className="text-sm font-bold tracking-wide">AI DECISION ENGINE</h2>
            </div>
            
            {loadingRisk ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-slate-700 rounded w-1/4"></div>
                <div className="h-10 bg-slate-700 rounded w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wide mb-0.5">CRB Score</p>
                    <p className="text-2xl font-bold text-emerald-400">{riskProfile?.score} <span className="text-sm text-slate-500">/ 1000</span></p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Requested Amount</p>
                    <p className="text-xl font-bold text-white">{KES.format(app.amountApplied)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Calculated Capacity</p>
                    {(() => {
                      const rec = getLoanRecommendation(riskProfile?.score, app.amountApplied);
                      if (!rec) return null;
                      return <p className="text-xl font-bold text-indigo-400">{KES.format(rec.recommendedAmount)}</p>;
                    })()}
                  </div>
                </div>

                {(() => {
                  const rec = getLoanRecommendation(riskProfile?.score, app.amountApplied);
                  if (!rec) return null;
                  return (
                    <div className={`px-3 py-2.5 rounded-lg border ${rec.style} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm`}>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Engine Recommendation</p>
                        <p className="font-semibold">{rec.recommendation}</p>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            setLoanAmount(rec.recommendedAmount.toString());
                            toast.success(`Loan amount overridden to ${KES.format(rec.recommendedAmount)}`);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
                        >
                          Apply Haircut
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                
                <p className="text-xs text-slate-500 max-w-2xl">
                  * Manual Executive Override: If you disagree with the AI recommendation, you can manually type a different approved amount in the "Loan Details" section below before clicking Approve.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <Section title="Applicant Information">
        <Field label="Full Name" value={formatName(app.customerName)} />
        <Field label="Email Address" value={app.email} />
        <Field label="Phone Number" value={app.phone} />
        <Field label="ID Number" value={app.idNumber} />
      </Section>

      {/* ── Employment Details ── */}
      <Section title="Employment Details">
        <Field label="Employment Type" value={app.employmentType} />
        <Field label="Company" value={app.company} />
        {app.employerName && <Field label="Employer" value={app.employerName} />}
        <Field label="Employment Nature" value={app.employmentNature} />
        <Field label="Designation" value={app.designation} />
        <Field label="Payroll Number" value={app.payrollNumber} />
      </Section>

      {/* ── Income Details ── */}
      <Section title="Income Details (Last 3 Months)">
        <Field label="Month 1" value={app.monthOne} />
        <Field label="Month 2" value={app.monthTwo} />
        <Field label="Month 3" value={app.monthThree} />
        <Field
          label="Average Monthly"
          value={(app.monthOne + app.monthTwo + app.monthThree) / 3}
        />
      </Section>

      {/* ── Loan Details ── */}
      <Section title="Loan Details">
        <Field label="Loan Type" value={getLoanTypeDisplay(app.loanType)} />
        <Field label="Amount Applied" value={app.amountApplied} />
        <Field label="Processing Fees" value={app.processingFees} />
        <Field label="Legal Fees" value={app.legalFees} />
        <Field label="Access Fees" value={app.accessFees} />
        <Field
          label="Interest Rate"
          value={app.interestRate
            ? `${app.interestRate <= 1 ? (app.interestRate * 100).toFixed(2) : app.interestRate}%`
            : null
          }
        />
        <Field label="Disbursement Amount" value={app.disbursementAmount} />
        <Field label="Repayment Amount" value={app.repaymentAmount} />
      </Section>

      {/* ── Documents ── */}
      {app.documents && app.documents.length > 0 && (
        <Section title="Documents">
          {app.documents.map((doc) => (
            <div key={doc.id} className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                {doc.document_type.replace(/_/g, " ")}
              </p>
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-4 transition-colors hover:bg-slate-100/80">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="bg-white p-2 rounded-lg ring-1 ring-slate-200 shadow-sm flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{doc.file_name}</p>
                    {doc.document_passcode && (
                      <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                        <span className="bg-slate-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">Passcode</span>
                        {doc.document_passcode}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg bg-white flex-shrink-0 ml-4 shadow-sm border-slate-200 text-gray-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50"
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
          ))}
        </Section>
      )}

      {/* ── Set Loan Terms (Personal loan types - Pending or Rate Declined status) ── */}
      {canEditLoanTerms && (isPending || isRateDeclined) && app.loanType.toLowerCase() === "personal" && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg overflow-hidden">
          <div className="bg-indigo-100 px-4 py-3 border-b border-indigo-200">
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-indigo-600" />
              <div>
                <h2 className="font-bold text-indigo-900">
                  Set Loan Terms for This Application
                </h2>
                <p className="text-sm text-indigo-700 mt-0.5">
                  Review and edit the loan terms below. The applicant will be notified to accept or reject these terms.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-5">
            {/* Editable Loan Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Loan Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Loan Amount (KES)
                </label>
                <input
                  type="number" onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  step="100"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="100000"
                />
              </div>

              {/* Interest Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Interest Rate (%)
                </label>
                <input
                  type="number" onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  max="100"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="10"
                />
              </div>

              {/* Processing Fees */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Processing Fees (%)
                </label>
                <input
                  type="number" onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  max="100"
                  step="0.1"
                  value={processingFees}
                  onChange={(e) => setProcessingFees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="3"
                />
              </div>

              {/* Access Fees */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Access Fees (%)
                </label>
                <input
                  type="number" onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  max="100"
                  step="0.1"
                  value={accessFees}
                  onChange={(e) => setAccessFees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>

              {/* Legal Fees */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Legal Fees
                </label>
                <input
                  type="number" onWheel={(e) => e.currentTarget.blur()}
                  min="0"
                  step="1"
                  value={legalFees}
                  onChange={(e) => setLegalFees(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Preview Breakdown */}
            {loanPreview && (
              <div className="bg-white rounded-lg border border-indigo-200 p-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
                  Loan Breakdown Preview
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Loan Amount</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatKES(loanPreview.loanAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Processing Fees</span>
                    <span className="text-sm font-medium text-red-600">
                      - {formatKES(loanPreview.processingFees)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Access Fees</span>
                    <span className="text-sm font-medium text-red-600">
                      - {formatKES(loanPreview.accessFees)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">Legal Fees</span>
                    <span className="text-sm font-medium text-red-600">
                      - {formatKES(loanPreview.legalFees)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200 bg-emerald-50 -mx-5 px-5">
                    <span className="text-sm font-semibold text-emerald-700">
                      Applicant Will Receive
                    </span>
                    <span className="text-base font-bold text-emerald-700">
                      {formatKES(loanPreview.disbursementAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">
                      Interest ({interestRate}%)
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {formatKES(loanPreview.interestAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-slate-50 -mx-5 px-5 rounded-b-xl">
                    <span className="text-sm font-semibold text-gray-700">
                      Total Repayment
                    </span>
                    <span className="text-base font-bold text-slate-900">
                      {formatKES(loanPreview.repaymentAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleSetLoanTerms}
                disabled={settingRate || !interestRate || !loanAmount}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex-1"
              >
                {settingRate ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving Terms...
                  </>
                ) : (
                  <>
                    <Percent className="mr-2 h-4 w-4" />
                    Set Loan Terms & Notify Applicant
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleStatus("Declined")}
                disabled={updating}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-bold"
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Decline
              </Button>
            </div>

            <p className="text-xs text-indigo-600 text-center">
              The applicant will be notified and must accept or reject the proposed loan terms before the loan can be approved.
            </p>
          </div>
        </div>
      )}

      {/* ── Direct Approve/Decline for Non-Personal Loans ── */}
      {canEditLoanTerms && isPending && app.loanType.toLowerCase() !== "personal" && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
            Application Actions
          </h3>

          {normalizedStatus === "pending_processing" && isSalaryAdvance && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> This is a Salary Advance application and the status is currently pending review by HR.
              </p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={() => handleStatus("Approved")}
              disabled={updating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex-1 py-2"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Approve Application
            </Button>
            <Button
              onClick={() => setActiveDeclineForm(activeDeclineForm === "bottom" ? null : "bottom")}
              disabled={updating}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg font-bold flex-1 py-2"
            >
              <XCircle className="mr-2 h-5 w-5" />
              Decline Application
            </Button>
          </div>

          {renderDeclineForm("bottom")}
        </div>
      )}

      {/* ── Amended Status Notice ── */}
      {isAmended && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-brand-blue">
                Application Has Been Amended
              </p>
              <p className="text-sm text-blue-700 mt-1">
                The HR staff or applicant has amended this application. Please review the updated information and approve or decline.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Set Status Notice ── */}
      {canEditLoanTerms && isRateSet && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">
                Awaiting Applicant Confirmation
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Interest rate of {setRateValue ?? (app.interestRate && app.interestRate <= 1 ? (app.interestRate * 100).toFixed(2) : app.interestRate)}% has been set. Waiting for the applicant to accept or reject.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Confirmed Status Notice ── */}
      {canEditLoanTerms && isRateConfirmed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">
                Applicant Accepted the Rate
              </p>
              <p className="text-sm text-emerald-700 mt-1">
                The applicant has confirmed the {setRateValue ?? (app.interestRate && app.interestRate <= 1 ? (app.interestRate * 100).toFixed(2) : app.interestRate)}% interest rate. You can now approve or decline this application.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Rate Declined Status Notice ── */}
      {canEditLoanTerms && isRateDeclined && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-semibold text-red-800">
                Applicant Rejected the Rate
              </p>
              <p className="text-sm text-red-700 mt-1">
                The applicant has declined the proposed interest rate. You can set a new rate below or decline the application.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmed Status Notice ── */}
      {canEditLoanTerms && isConfirmed && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-800">
                Applicant Accepted the Terms
              </p>
              <p className="text-sm text-emerald-700 mt-1">
                The applicant has confirmed the {setRateValue ?? (app.interestRate && app.interestRate <= 1 ? (app.interestRate * 100).toFixed(2) : app.interestRate)}% interest rate. You can now approve or decline this application.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Application Timeline ── */}
      <Section title="Application Timeline">
        <Field
          label="Submitted On"
          value={new Date(app.submittedAt).toLocaleDateString("en-KE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        />
        <Field label="Current Status" value={statusDisplay.label} />
        <Field
          label="Repayment Status"
          value={app.repaymentStatus ? app.repaymentStatus.charAt(0).toUpperCase() + app.repaymentStatus.slice(1).replace(/_/g, ' ') : "N/A"}
        />
        {app.dueDate && (
          <Field
            label="Due Date"
            value={new Date(app.dueDate).toLocaleDateString("en-KE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
        )}
      </Section>

      {/* ── Admin Notes ── */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">
          Admin Notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add private notes about this application…"
          className="w-full h-24 px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue resize-none"
        />
        <p className="text-xs text-slate-400 mt-2">
          Notes are for internal use only and not visible to the applicant.
        </p>
      </div>

      {/* ── Disbursement Confirmation (shown only when Approved) ── */}
      {isApproved && (
        <div className="bg-white rounded-lg border-2 border-purple-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote className="h-4 w-4 text-purple-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Mark as Disbursed
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Enter the bank transfer reference or M-Pesa transaction code as payment confirmation before marking this loan as disbursed.
          </p>
          <textarea
            value={disbursementNote}
            onChange={(e) => setDisbursementNote(e.target.value)}
            placeholder="e.g. M-Pesa code: QKL3X9Z2A1 / Bank ref: TXN-20260601-00123…"
            className="w-full h-24 px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 resize-none"
          />
          <div className="mt-4">
            <Button
              onClick={handleDisburse}
              disabled={updating || !disbursementNote.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Banknote className="mr-1.5 h-4 w-4" />
              {updating ? "Processing…" : "Mark Disbursed"}
            </Button>
            {!disbursementNote.trim() && (
              <p className="text-xs text-purple-500 mt-2">
                Enter a payment confirmation note above to enable this button.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Send Email to Applicant ── */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Contact Applicant
          </h2>
          {!showEmailComposer && (
            <Button
              onClick={handleOpenComposer}
              className="bg-brand-blue hover:bg-slate-800 text-white rounded-lg font-bold"
            >
              <Mail className="mr-2 h-4 w-4" />
              Compose Email
            </Button>
          )}
        </div>

        {showEmailComposer && (
          <div className="space-y-4">
            {/* To field (read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                To
              </label>
              <div className="px-4 py-2 bg-slate-50 rounded-lg text-sm text-gray-700">
                {app.email || app.customerName}
              </div>
            </div>

            {/* Subject (editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Message
              </label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type your message to the applicant..."
                className="w-full h-32 px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 resize-none"
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Attachments
              </label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                onChange={handleAddAttachment}
                className="hidden"
                id="email-attachment-input"
              />

              {/* Attachment list or empty state */}
              {emailAttachments.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {emailAttachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-slate-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 mb-3">No attachments added yet.</p>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Paperclip className="h-4 w-4" />
                Add Attachment
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailMessage.trim()}
                className="bg-brand-blue hover:bg-slate-800 text-white rounded-lg font-bold"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowEmailComposer(false);
                  setEmailSubject("");
                  setEmailMessage("");
                  setEmailAttachments([]);
                }}
                variant="outline"
                className="rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!showEmailComposer && (
          <p className="text-sm text-slate-500">
            Send a message with attachments directly to the applicant regarding their loan application.
          </p>
        )}
      </div>

      {/* ── Delete Application ── */}
      <div className="bg-white rounded-lg border border-red-100 shadow-sm p-4 mt-8">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-sm font-bold text-red-600 uppercase tracking-wide">
            Danger Zone
          </h2>
        </div>
        {!canDeleteApplication(app.status) ? (
          <p className="text-sm text-slate-600">
            This loan was paid out, so it cannot be deleted: its history must stay on the borrower&apos;s statement. To correct a wrong line, use Edit or Delete on that line in the borrower&apos;s statement.
          </p>
        ) : (
        <>
        <p className="text-sm text-slate-600 mb-4">
          Deleting this application is permanent and cannot be undone: its documents, history and statement lines are removed with it. Please type <span className="font-mono font-bold select-all bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">delete {app?.id}</span> to confirm.
        </p>

        <div className="max-w-md space-y-3">
          <input
            type="text"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder={`delete ${app?.id}`}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600"
          />
          <Button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleteConfirmationText !== `delete ${app?.id}` || isDeleting}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Application
          </Button>
        </div>
        </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-4 w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-center text-slate-900 mb-2">Are you absolutely sure?</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              This action will permanently delete the application. All associated data will be removed.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
                onClick={handleDeleteApplication}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


