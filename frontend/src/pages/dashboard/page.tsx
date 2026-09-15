

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

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  pending_processing: "bg-amber-100 text-amber-700",
  PENDING: "bg-amber-100 text-amber-700",
  // Rate workflow statuses
  rate_set: "bg-indigo-100 text-indigo-700",
  RATE_SET: "bg-indigo-100 text-indigo-700",
  rate_confirmed: "bg-cyan-100 text-cyan-700",
  RATE_CONFIRMED: "bg-cyan-100 text-cyan-700",
  rate_declined: "bg-orange-100 text-orange-700",
  RATE_DECLINED: "bg-orange-100 text-orange-700",
  CONFIRMED: "bg-cyan-100 text-cyan-700",
  // Final statuses
  Approved: "bg-emerald-100 text-emerald-700",
  approved: "bg-emerald-100 text-emerald-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  Declined: "bg-red-100 text-red-700",
  declined: "bg-red-100 text-red-700",
  DECLINED: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  Disbursed: "bg-purple-100 text-purple-700",
  disbursed: "bg-purple-100 text-purple-700",
  DISBURSED: "bg-purple-100 text-purple-700",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-orange-100 text-orange-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  FULLY_PAID: "bg-emerald-100 text-emerald-700",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
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
            paymentStatus: app.payment_status as string,
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

  return (
    <div className="p-6 w-full space-y-6 bg-slate-50 min-h-full">
      {/* ── Welcome card ── */}
      <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Decorative circle container */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium mb-1">Welcome back,</p>
          <h1 className="text-2xl sm:text-3xl font-black">
            {session?.user?.name ?? "Loading…"}
          </h1>
          <p className="text-blue-200/80 text-sm mt-2">
            Here&apos;s a summary of your loan activity.
          </p>

          <div className="mt-6">
            <Link to="/dashboard/apply">
              <Button className="bg-brand-blue hover:bg-slate-800 active:bg-slate-900 text-white font-bold rounded-xl px-5 h-10 transition-colors">
                <PlusCircle className="mr-2 h-4 w-4" />
                Apply for New Loan
              </Button>
            </Link>
          </div>
        </div>

        {/* Right side amounts */}
        <div className="relative z-10 flex flex-wrap gap-4 sm:gap-6 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 flex-1 md:flex-none border border-white/10 min-w-[160px] relative">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Pending Disbursement</p>
              <button 
                onClick={() => setActiveInfo(activeInfo === 'pending' ? null : 'pending')}
                className="text-blue-300 hover:text-white transition-colors focus:outline-none"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <p className="text-2xl font-black">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : KES.format(pendingDisbursement)}
            </p>
            {activeInfo === 'pending' && (
              <div className="absolute bottom-full right-0 sm:left-0 sm:right-auto mb-2 z-50 w-64 bg-blue-950 border border-brand-blue shadow-xl rounded-xl p-3.5 text-xs text-blue-100 font-medium">
                Total expected disbursement amount for all active applications that have not yet been disbursed, rejected, or declined.
              </div>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 flex-1 md:flex-none border border-white/10 min-w-[160px] relative">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Outstanding Balance</p>
              <button 
                onClick={() => setActiveInfo(activeInfo === 'outstanding' ? null : 'outstanding')}
                className="text-blue-300 hover:text-white transition-colors focus:outline-none"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <p className="text-2xl font-black">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : KES.format(outstandingBalance)}
            </p>
            {activeInfo === 'outstanding' && (
              <div className="absolute bottom-full right-0 sm:left-0 sm:right-auto mb-2 z-50 w-64 bg-blue-950 border border-brand-blue shadow-xl rounded-xl p-3.5 text-xs text-blue-100 font-medium">
                Total remaining repayment amount for all your active loans that have already been disbursed.
              </div>
            )}
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 flex-1 md:flex-none border border-white/10 min-w-[160px] relative">
            <div className="flex items-center justify-between gap-3 mb-1">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wider">Next Due Date</p>
              <button 
                onClick={() => setActiveInfo(activeInfo === 'duedate' ? null : 'duedate')}
                className="text-blue-300 hover:text-white transition-colors focus:outline-none"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <p className="text-2xl font-black">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : nextDueDate ? (
                new Date(nextDueDate).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })
              ) : (
                "—"
              )}
            </p>
            {activeInfo === 'duedate' && (
              <div className="absolute bottom-full right-0 sm:left-0 sm:right-auto mb-2 z-50 w-64 bg-blue-950 border border-brand-blue shadow-xl rounded-xl p-3.5 text-xs text-blue-100 font-medium">
                The earliest due date for your loan applications.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, gradient }) => (
          <div
            key={label}
            className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-5 text-white relative overflow-hidden`}
          >
            <div className="absolute top-4 right-4 opacity-20">
              <Icon className="h-10 w-10" />
            </div>
            <p className="text-3xl font-black mt-2">
              {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : value}
            </p>
            <p className="text-sm text-white/80 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Profile Incomplete Banner ── */}
      <ProfileIncompleteBanner profileHref="/dashboard/profile" />

      {/* ── Rate Review Required Banner ── */}
      {rateReviewPendingApps.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-indigo-800">
              {rateReviewPendingApps.length === 1
                ? "Your loan rate has been set! Please review and accept or reject."
                : `You have ${rateReviewPendingApps.length} loans with rates awaiting your review.`}
            </p>
            <p className="text-xs text-indigo-700 mt-1">
              Review the interest rate set by admin and confirm if you agree to the terms.
            </p>
          </div>
          <Link to={`/dashboard/applications/${rateReviewPendingApps[0].id}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
          >
            Review Rate
          </Link>
        </div>
      )}

      {/* ── Recent applications ── */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">
            Recent Applications
          </h2>
          {applications.length > 0 && (
            <Link to="/dashboard/applications">
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-lg h-8"
              >
                View All
              </Button>
            </Link>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading your applications...</p>
          </div>
        ) : error ? (
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <p className="text-red-500 font-medium">{error}</p>
            <p className="text-slate-400 text-sm mt-1">Please try again later</p>
          </div>
        ) : recentApps.length === 0 ? (
          /* Empty state */
          <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center mb-4 border border-slate-100">
              <Banknote className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-slate-600 font-semibold">No applications yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Apply for your first loan to get started
            </p>
            <Link to="/dashboard/apply" className="mt-5">
              <Button className="bg-blue-900 hover:bg-slate-800 text-white font-bold rounded-xl">
                Apply Now
              </Button>
            </Link>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Loan Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentApps.map((app) => {
                  const normalizedStatus = normalizeStatus(app.status);

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString("en-KE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">
                        {getLoanTypeLabel(app.loanType, app.company)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {app.amountApplied ? KES.format(app.amountApplied) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[app.status] ?? "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {app.status}
                          </span>
                          {normalizedStatus === "DISBURSED" && app.paymentStatus && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS_STYLES[app.paymentStatus] ?? ""
                                }`}
                            >
                              {PAYMENT_STATUS_LABELS[app.paymentStatus] ?? app.paymentStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link to={`/dashboard/applications/${app.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline text-blue-600"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
