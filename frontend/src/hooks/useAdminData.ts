// Hooks for admin operations
import { useState, useEffect, useCallback } from "react";
import { adminApplicationsApi, AdminApplicationItem, isSuperAdmin, ApplicationDocument } from "@/lib/adminApi";
import { getAdminUser } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Types for transformed application data
// ---------------------------------------------------------------------------

export interface TransformedApplication {
  id: string;
  applicantId: string;
  customerName: string;
  email: string;
  phone: string;
  idNumber: string;
  company: string;
  loanType: string;
  employmentType: string;
  employmentNature: string;
  designation: string;
  payrollNumber: string;
  monthOne: number;
  monthTwo: number;
  monthThree: number;
  amountApplied: number;
  processingFees: number;
  legalFees: number;
  accessFees: number;
  interestRate: number;
  disbursementAmount: number;
  repaymentAmount: number;
  status: string;
  repaymentStatus: string;
  submittedAt: string;
  dueDate: string | null;
  documents: ApplicationDocument[];
}

// ---------------------------------------------------------------------------
// Transform API response to UI-friendly format
// ---------------------------------------------------------------------------

function transformApplication(item: AdminApplicationItem): TransformedApplication {
  const app = item.application;
  const bio = item.bio_data;

  const amountApplied = parseFloat(app.amount_applied || "0") || 0;
  // Try both field names for total repayment
  const totalRepayment = parseFloat(app.repayment_amount || (app as Record<string, unknown>).total_repayment_amount || "0") || 0;
  
  // Parse interest rate - try direct field first
  let interestRate = parseFloat(app.interest_rate || "0") || 0;
  
  console.log("[transformApplication] Raw interest_rate from backend:", app.interest_rate, "-> parsed:", interestRate);
  
  // IMPORTANT: Backend stores interest rate as decimal (0.10 = 10%)
  // Keep it as decimal here, the UI will convert to percentage when displaying
  
  // Fallback: derive from total_repayment_amount and amount_applied
  // Formula: Interest = Total Repayment - Loan Amount, Rate = Interest / Loan Amount
  if (interestRate === 0 && amountApplied > 0 && totalRepayment > amountApplied) {
    const interestAmount = totalRepayment - amountApplied;
    interestRate = interestAmount / amountApplied;
    console.log("[transformApplication] Derived interest rate:", {
      totalRepayment,
      amountApplied,
      interestAmount,
      derivedRate: interestRate,
    });
  }
  
  console.log("[transformApplication] Final interestRate (decimal):", interestRate);

  return {
    id: app.id || crypto.randomUUID(),
    applicantId: app.applicant_id || "",
    customerName: bio.name || bio.full_name || "Unknown",
    email: bio.email || "",
    phone: bio.phone_number || "",
    idNumber: bio.id_number || "",
    company: app.company || "",
    loanType: app.loan_type || "personal",
    employmentType: app.employment_type || "",
    employmentNature: app.employment_nature || "",
    designation: app.designation || "",
    payrollNumber: app.payroll_number || "",
    monthOne: parseFloat(app.month_one) || 0,
    monthTwo: parseFloat(app.month_two) || 0,
    monthThree: parseFloat(app.month_three) || 0,
    amountApplied,
    processingFees: parseFloat(app.processing_fees || "0") || 0,
    legalFees: parseFloat(app.legal_fees || "0") || 0,
    accessFees: parseFloat(app.access_fees || "0") || 0,
    interestRate,
    disbursementAmount: parseFloat(app.disbursement_amount || "0") || 0,
    repaymentAmount: totalRepayment,
    status: app.loan_status || "Pending",
    repaymentStatus: app.repayment_status || "unpaid",
    submittedAt: app.date_submitted || app.created_at || new Date().toISOString(),
    dueDate: app.due_date || null,
    documents: app.documents || [],
  };
}

// ---------------------------------------------------------------------------
// useAdminApplications Hook
// ---------------------------------------------------------------------------

interface UseAdminApplicationsReturn {
  applications: TransformedApplication[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminApplications(): UseAdminApplicationsReturn {
  const [applications, setApplications] = useState<TransformedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminApplicationsApi.getAll();

      if (response.error) {
        setError(response.error);
        setApplications([]);
        return;
      }

      if (response.data) {
        const transformed = response.data.map(transformApplication);
        setApplications(transformed);
      } else {
        setApplications([]);
      }
    } catch (_err) {
      setError("Failed to fetch applications. Please try again.");
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    error,
    refetch: fetchApplications,
  };
}

// ---------------------------------------------------------------------------
// useAdminApplication Hook (single application)
// ---------------------------------------------------------------------------

interface UseAdminApplicationReturn {
  application: TransformedApplication | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminApplication(applicationId: string): UseAdminApplicationReturn {
  const [application, setApplication] = useState<TransformedApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplication = useCallback(async () => {
    if (!applicationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await adminApplicationsApi.getOne(applicationId);

      if (response.error) {
        setError(response.error);
        setApplication(null);
        return;
      }

      if (response.data) {
        const transformed = transformApplication(response.data);
        setApplication(transformed);
      } else {
        setApplication(null);
      }
    } catch (_err) {
      setError("Failed to fetch application. Please try again.");
      setApplication(null);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  return {
    application,
    isLoading,
    error,
    refetch: fetchApplication,
  };
}

// ---------------------------------------------------------------------------
// useCurrentAdmin Hook
// ---------------------------------------------------------------------------

interface CurrentAdmin {
  id: string;
  name: string;
  email: string;
  number: string;
  isSuperAdmin: boolean;
}

export function useCurrentAdmin(): CurrentAdmin | null {
  const [admin, setAdmin] = useState<CurrentAdmin | null>(null);

  useEffect(() => {
    const stored = getAdminUser();
    if (stored) {
      setAdmin({
        ...stored,
        isSuperAdmin: isSuperAdmin(stored.email),
      });
    }
  }, []);

  return admin;
}

// ---------------------------------------------------------------------------
// Application Status Helpers
// ---------------------------------------------------------------------------

export const STATUS_DISPLAY_MAP: Record<string, { label: string; style: string }> = {
  "Pending": { label: "Pending", style: "bg-amber-100 text-amber-700" },
  "pending": { label: "Pending", style: "bg-amber-100 text-amber-700" },
  "pending_processing": { label: "Pending", style: "bg-amber-100 text-amber-700" },
  // Rate workflow statuses
  "rate_set": { label: "Awaiting Rate Approval", style: "bg-indigo-100 text-indigo-700" },
  "RATE_SET": { label: "Awaiting Rate Approval", style: "bg-indigo-100 text-indigo-700" },
  "rate_confirmed": { label: "Rate Accepted", style: "bg-cyan-100 text-cyan-700" },
  "RATE_CONFIRMED": { label: "Rate Accepted", style: "bg-cyan-100 text-cyan-700" },
  "rate_declined": { label: "Rate Declined", style: "bg-orange-100 text-orange-700" },
  "RATE_DECLINED": { label: "Rate Declined", style: "bg-orange-100 text-orange-700" },
  "confirmed": { label: "Confirmed", style: "bg-cyan-100 text-cyan-700" },
  // Final statuses
  "Approved": { label: "Approved", style: "bg-emerald-100 text-emerald-700" },
  "approved": { label: "Approved", style: "bg-emerald-100 text-emerald-700" },
  "Declined": { label: "Declined", style: "bg-red-100 text-red-700" },
  "declined": { label: "Declined", style: "bg-red-100 text-red-700" },
  "rejected": { label: "Declined", style: "bg-red-100 text-red-700" },
  "Disbursed": { label: "Disbursed", style: "bg-purple-100 text-purple-700" },
  "disbursed": { label: "Disbursed", style: "bg-purple-100 text-purple-700" },
};

export function getStatusDisplay(status: string): { label: string; style: string } {
  // Try exact match first, then normalized (handle "Rate Confirmed" vs "rate_confirmed")
  if (STATUS_DISPLAY_MAP[status]) return STATUS_DISPLAY_MAP[status];
  const normalized = status.toLowerCase().replace(/[\s-]/g, "_");
  return STATUS_DISPLAY_MAP[normalized] || { label: status, style: "bg-gray-100 text-gray-700" };
}

export const LOAN_TYPE_DISPLAY: Record<string, string> = {
  "personal": "Personal Loan",
  "salary_advance": "Salary Advance",
  "general": "General Loan",
};

export function getLoanTypeDisplay(type: string): string {
  return LOAN_TYPE_DISPLAY[type?.toLowerCase()] || type || "Unknown";
}
