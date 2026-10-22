

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { applicationApi } from "@/lib/applicationApi";
import { applicantApi } from "@/lib/applicantApi";
import { useApplicantProfileStore } from "@/store/applicantProfileStore";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  PlusCircle,
  XCircle,
  Loader2,
  Info,
} from "lucide-react";
import { ProfileIncompleteBanner } from "@/components/profile/ProfileCompletion";
import { paymentStatusFromRepayment } from "@/lib/paymentStatus";
import { statusDisplay } from "@/lib/loanStatus";
import { formatName } from "@/lib/formatName";

// ---------------------------------------------------------------------------
// Types for API response
// ---------------------------------------------------------------------------

interface DashboardApplication {
  id: string;
  loanType: string;
  company: string;
  amountApplied: number;
  status: string;
  submittedAt: string;
  disbursementConfirmed?: boolean;
  paymentStatus?: string;
  interestRate?: number;  // Added to detect rate_set workaround
  disbursementAmount?: number;
  repaymentAmount?: number;
  repaymentStatus?: string;
  dueDate?: string;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-orange-100 text-orange-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  DELINQUENT: "bg-red-100 text-red-700",
  FULLY_PAID: "bg-emerald-100 text-emerald-700",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  DELINQUENT: "Overdue",
  FULLY_PAID: "Fully Paid",
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  salary_advance: "Salary Advance",
  personal: "Personal Loan",
  IDEON_SALARY_ADVANCE: "Ideon Salary Advance",
  NAKAMA_SALARY_ADVANCE: "Nakama Salary Advance",
  GENERAL_LOAN: "Personal Loan",
};

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Helper to get a display-friendly loan type label
function getLoanTypeLabel(loanType: string, company?: string): string {
  if (loanType === "salary_advance") {
    if (company === "ideon") return "Ideon Salary Advance";
    if (company === "nakama") return "Nakama Salary Advance";
    return "Salary Advance";
  }
  return LOAN_TYPE_LABELS[loanType] ?? "Personal Loan";
}

// Normalize status for comparison (API uses various cases)
function normalizeStatus(status: string): string {
  const lower = status.toLowerCase();
  if (lower === "pending" || lower === "pending_processing") return "PENDING";
  if (lower === "rate_set") return "RATE_SET";
  if (lower === "rate_confirmed") return "RATE_CONFIRMED";
  if (lower === "rate_declined") return "RATE_DECLINED";
  if (lower === "confirmed") return "CONFIRMED";
  if (lower === "approved") return "APPROVED";
  if (lower === "declined" || lower === "rejected") return "DECLINED";
  if (lower === "disbursed") return "DISBURSED";
  return status.toUpperCase();
}

const shortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// Loan status badge, plus the repayment badge once a loan is disbursed
function StatusBadges({ app }: { app: DashboardApplication }) {
  const status = statusDisplay(app.status);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${status.className}`}>{status.label}</span>
      {normalizeStatus(app.status) === "DISBURSED" && app.paymentStatus && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${PAYMENT_STATUS_STYLES[app.paymentStatus] ?? ""}`}>
          {PAYMENT_STATUS_LABELS[app.paymentStatus] ?? app.paymentStatus}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { data: session } = useSession();
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeInfo, setActiveInfo] = useState<"pending" | "outstanding" | "duedate" | null>(null);
  const setProfile = useApplicantProfileStore((s) => s.setProfile);

  // Fetch applicant details (id_number, kra_pin, docs) to power the progress banner
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    Promise.all([
      applicantApi.getApplicantDetails(userId),
      applicantApi.getApplicantDocuments(userId),
    ]).then(([detailsResponse, docsResponse]) => {
      const { data: detailsData } = detailsResponse;
      const { data: docsData } = docsResponse;

      if (detailsData?.applicant) {
        setProfile({
          userId,
          name: detailsData.applicant.name ?? "",
          email: detailsData.applicant.email ?? "",
          phoneNumber: detailsData.applicant.phone_number ?? "",
          idNumber: detailsData.applicant.id_number ?? null,
          kraPin: detailsData.applicant.kra_pin ?? null,
          applicantType: detailsData.applicant.applicant_type ?? "",
          payrollNumber: detailsData.applicant.payroll_number ?? null,
          docs: Array.isArray(docsData) ? docsData : [],
          fetchedAt: new Date().toISOString(),
        });
      }
    });
  }, [session?.user?.id, setProfile]);

  // Fetch applications from API
  useEffect(() => {
    async function fetchApplications() {
      setLoading(true);
      const { data, error } = await applicationApi.getAll();

      if (error) {
        setError(error);
        setLoading(false);
        return;
      }

      if (Array.isArray(data)) {
        // Map API response to dashboard format
        const mapped: DashboardApplication[] = data.map((item: unknown) => {
          const itemRecord = item as Record<string, unknown>;
          const appData = itemRecord.application ?? item;
          const app = appData as Record<string, unknown>;
          return {
            id: app.id as string,
            loanType: app.loan_type as string,
            company: app.company as string,
            amountApplied: parseFloat((app.amount_applied as string) || "0") || 0,
            status: app.loan_status as string,
            submittedAt: (app.date_submitted ?? app.created_at) as string,
            disbursementConfirmed: app.disbursement_confirmed as boolean,
            paymentStatus: paymentStatusFromRepayment(app.repayment_status),
            interestRate: app.interest_rate ? parseFloat(app.interest_rate as string) : undefined,
            disbursementAmount: app.disbursement_amount ? parseFloat(app.disbursement_amount as string) : 0,
            repaymentAmount: app.repayment_amount ? parseFloat(app.repayment_amount as string) : 0,
            repaymentStatus: app.repayment_status as string,
            dueDate: app.due_date as string,
          };
        });
        setApplications(mapped);
      }
      setLoading(false);
    }

    fetchApplications();
  }, []);

  const recentApps = [...applications]
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
    .slice(0, 5);

  // Personal loans with rate set, awaiting user acceptance/rejection
  // Check for RATE_SET status (backend now properly supports this)
  const rateReviewPendingApps = applications.filter(
    (a) => normalizeStatus(a.status) === "RATE_SET"
  );

  const pendingDisbursement = applications
    .filter((a) => {
      const status = normalizeStatus(a.status);
      return status !== "DISBURSED" && status !== "DECLINED" && status !== "RATE_DECLINED";
    })
    .reduce((sum, app) => sum + (app.disbursementAmount || 0), 0);

  const outstandingLoans = applications.filter(
    (a) => normalizeStatus(a.status) === "DISBURSED" && a.repaymentStatus?.toLowerCase() !== "paid"
  );

  const outstandingBalance = outstandingLoans.reduce((sum, app) => sum + (app.repaymentAmount || 0), 0);

  const upcomingDueDates = applications
    .map((a) => a.dueDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());
  
  const nextDueDate = upcomingDueDates.length > 0 ? upcomingDueDates[0] : null;

  const stats = [
    {
      label: "Total",
      value: applications.length,
      icon: FileText,
      gradient: "from-blue-600 to-blue-800",
    },
    {
      label: "Pending Review",
      value: applications.filter((a) => normalizeStatus(a.status) === "PENDING").length,
      icon: Clock,
      gradient: "from-amber-400 to-amber-600",
    },
    {
      label: "Approved",
      value: applications.filter((a) => normalizeStatus(a.status) === "APPROVED").length,
      icon: CheckCircle,
      gradient: "from-emerald-500 to-emerald-700",
    },
    {
      label: "Declined",
      value: applications.filter((a) => normalizeStatus(a.status) === "DECLINED").length,
      icon: XCircle,
      gradient: "from-red-500 to-red-700",
    },
  ];

  const infoTip = "absolute top-full right-0 mt-1.5 z-50 w-56 bg-blue-950 border border-brand-blue shadow-xl rounded-lg p-3 text-xs text-blue-100 font-medium";
  const figures = [
    {
      key: "pending" as const,
      label: "Pending Disbursement",
      value: KES.format(pendingDisbursement),
      tip: "Total expected disbursement amount for all active applications that have not yet been disbursed, rejected, or declined.",
    },
    {
      key: "outstanding" as const,
      label: "Outstanding Balance",
      value: KES.format(outstandingBalance),
      tip: "Total remaining repayment amount for all your active loans that have already been disbursed.",
    },
    {
      key: "duedate" as const,
      label: "Next Due Date",
      value: nextDueDate
        ? new Date(nextDueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
        : "—",
      tip: "The earliest due date for your loan applications.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 bg-slate-50 min-h-full">
      {/* ── Welcome card ── */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 rounded-lg p-4 sm:p-5 text-white flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10 min-w-0">
          <p className="text-blue-200 text-[13px] font-medium">Welcome back,</p>
          <h1 className="text-lg font-bold break-words">{formatName(session?.user?.name) || "Loading…"}</h1>
          <p className="text-blue-200/80 text-[13px] mt-0.5">Here&apos;s a summary of your loan activity.</p>
          <Link to="/dashboard/apply" className="mt-3 inline-block">
            <Button className="bg-brand-blue hover:bg-slate-800 active:bg-slate-900 text-white text-[13px] font-bold rounded-lg px-3 h-8 transition-colors">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              Apply for New Loan
            </Button>
          </Link>
        </div>

        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto lg:min-w-[560px]">
          {figures.map(({ key, label, value, tip }) => (
            <div key={key} className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2.5 border border-white/10 relative flex items-center justify-between gap-3 sm:block">
              <div className="flex items-center gap-2 sm:justify-between">
                <p className="text-blue-200 text-[11px] font-semibold uppercase tracking-wide">{label}</p>
                <button
                  onClick={() => setActiveInfo(activeInfo === key ? null : key)}
                  aria-label={`About ${label}`}
                  className="text-blue-300 hover:text-white transition-colors focus:outline-none"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-lg font-bold break-normal">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
              </p>
              {activeInfo === key && <div className={infoTip}>{tip}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
              </p>
              <p className="text-xs text-slate-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Profile Incomplete Banner ── */}
      <ProfileIncompleteBanner profileHref="/dashboard/profile" />

      {/* ── Rate Review Required Banner ── */}
      {rateReviewPendingApps.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-indigo-800">
              {rateReviewPendingApps.length === 1
                ? "Your loan rate has been set! Please review and accept or reject."
                : `You have ${rateReviewPendingApps.length} loans with rates awaiting your review.`}
            </p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Review the interest rate set by admin and confirm if you agree to the terms.
            </p>
          </div>
          <Link to={`/dashboard/applications/${rateReviewPendingApps[0].id}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            Review Rate
          </Link>
        </div>
      )}

      {/* ── Recent applications ── */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-slate-900">Recent Applications</h2>
          {applications.length > 0 && (
            <Link to="/dashboard/applications">
              <Button variant="outline" size="sm" className="text-xs rounded-lg h-7">
                View All
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-3" />
            <p className="text-slate-500 text-[13px]">Loading your applications...</p>
          </div>
        ) : error ? (
          <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
            <p className="text-red-500 font-medium text-[13px]">{error}</p>
            <p className="text-slate-500 text-xs mt-1">Please try again later</p>
          </div>
        ) : recentApps.length === 0 ? (
          <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-3 border border-slate-100">
              <Banknote className="h-6 w-6 text-gray-300" />
            </div>
            <p className="text-slate-700 font-semibold text-[13px]">No applications yet</p>
            <p className="text-slate-500 text-xs mt-0.5">Apply for your first loan to get started</p>
            <Link to="/dashboard/apply" className="mt-3">
              <Button className="bg-blue-900 hover:bg-slate-800 text-white text-[13px] font-bold rounded-lg h-8 px-3">
                Apply Now
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Loan Type</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{shortDate(app.submittedAt)}</td>
                      <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">{getLoanTypeLabel(app.loanType, app.company)}</td>
                      <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{app.amountApplied ? KES.format(app.amountApplied) : "—"}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusBadges app={app} />
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Link to={`/dashboard/applications/${app.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline text-blue-600">
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-100">
              {recentApps.map((app) => (
                <li key={app.id}>
                  <Link to={`/dashboard/applications/${app.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{getLoanTypeLabel(app.loanType, app.company)}</p>
                      <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{app.amountApplied ? KES.format(app.amountApplied) : "—"}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <StatusBadges app={app} />
                      <span>{shortDate(app.submittedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
