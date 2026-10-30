

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { applicationApi } from "@/lib/applicationApi";
import { applicantApi } from "@/lib/applicantApi";
import { useApplicantProfileStore } from "@/store/applicantProfileStore";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  CheckCircle,
  Clock,
  Eye,
  XCircle,
  Info,
} from "lucide-react";
import NextStepHero from "@/components/dashboard/NextStepHero";
import EmptyState from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { CountUp } from "@/components/landing/motion";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { amountOwed, loanGroup, nextStep, type LoanGroup } from "@/lib/nextStep";
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
  outstandingAmount?: number;
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
  const completion = useProfileCompletion();
  const loanLimit = useApplicantProfileStore((s) => s.profiles[session?.user?.id ?? ""]?.loanLimit);
  const [profileLoaded, setProfileLoaded] = useState(false);

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
          loanLimit: detailsData.applicant.loan_limit ?? null,
          docs: Array.isArray(docsData) ? docsData : [],
          fetchedAt: new Date().toISOString(),
        });
      }
    }).finally(() => setProfileLoaded(true));
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
            outstandingAmount: app.outstanding_balance ? parseFloat(app.outstanding_balance as string) : undefined,
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

  const pendingDisbursement = applications
    .filter((a) => {
      const status = normalizeStatus(a.status);
      return status !== "DISBURSED" && status !== "DECLINED" && status !== "RATE_DECLINED";
    })
    .reduce((sum, app) => sum + (app.disbursementAmount || 0), 0);

  const outstandingLoans = applications.filter(
    (a) => normalizeStatus(a.status) === "DISBURSED" && a.repaymentStatus?.toLowerCase() !== "paid"
  );

  const outstandingBalance = outstandingLoans.reduce((sum, app) => sum + amountOwed(app), 0);

  const upcomingDueDates = outstandingLoans
    .map((a) => a.dueDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());
  
  const nextDueDate = upcomingDueDates.length > 0 ? upcomingDueDates[0] : null;

  // A newcomer has nothing to total up yet: no row of zeros, just the card and the empty list.
  const showFigures = !loading && applications.length > 0;
  const inGroup = (g: LoanGroup) => applications.filter((a) => loanGroup(a.status, a.repaymentStatus) === g).length;
  const stats = [
    { label: "Active", value: inGroup("active"), icon: Banknote, gradient: "from-blue-600 to-blue-800" },
    { label: "In progress", value: inGroup("progress"), icon: Clock, gradient: "from-amber-400 to-amber-600" },
    { label: "Repaid", value: inGroup("repaid"), icon: CheckCircle, gradient: "from-emerald-500 to-emerald-700" },
    { label: "Declined", value: inGroup("declined"), icon: XCircle, gradient: "from-red-500 to-red-700" },
  ];

  // What the top of the page says (lib/nextStep.ts). Not decided until the loans and the profile have both arrived.
  const missing: string[] = [];
  if (!completion.checks.hasIdNumber) missing.push("National ID number");
  if (!completion.checks.hasKraPin) missing.push("KRA PIN");
  completion.requiredDocuments.forEach((d) => {
    if (!completion.uploadedDocumentTypes.includes(d.key)) missing.push(d.label);
  });
  const step = loading || !profileLoaded ? null : nextStep(applications, { isComplete: completion.isComplete, percent: completion.overallPercent, loanLimit, missing });

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
      tip: "The earliest due date among the loans you still owe.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 bg-slate-50 min-h-full">
      {/* ── Next step ── */}
      <NextStepHero
        name={formatName(session?.user?.name)}
        greeting={applications.length ? "Welcome back" : "Welcome"}
        step={step}
        error={error}
        aside={
          !showFigures ? null : (
            <div className="relative z-10 hidden w-full grid-cols-3 gap-2 sm:grid lg:w-auto lg:min-w-[560px]">
              {figures.map(({ key, label, value, tip }) => (
                <div key={key} className="relative rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-md">
                  <div className="flex items-center gap-2 sm:justify-between">
                    <p className="text-blue-200 text-[12px] font-semibold uppercase tracking-wide">{label}</p>
                    <button
                      onClick={() => setActiveInfo(activeInfo === key ? null : key)}
                      aria-label={`About ${label}`}
                      className="text-blue-300 hover:text-white transition-colors focus:outline-none"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xl font-extrabold tracking-tight whitespace-nowrap">{value}</p>
                  {activeInfo === key && <div className={infoTip}>{tip}</div>}
                </div>
              ))}
            </div>
          )
        }
      />

      {/* The same three figures on a phone: one short list under the card, so no label can push an amount out of its box */}
      {showFigures && (
        <dl className="sm:hidden divide-y divide-slate-100 rounded-2xl bg-white shadow-card ring-1 ring-slate-200/80">
          {figures.map(({ key, label, value }) => (
            <div key={key} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
              <dt className="min-w-0 truncate text-[13px] text-slate-500">{label}</dt>
              <dd className="shrink-0 whitespace-nowrap text-[15px] font-bold tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* ── Stats grid ── */}
      {showFigures && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, gradient }) => (
            <div key={label} className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-card p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                <Icon className="h-[18px] w-[18px] text-white" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold leading-none tracking-tight text-slate-900">
                  <CountUp value={String(value)} />
                </p>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent applications ── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-card overflow-hidden">
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
          <div className="space-y-3 p-4" role="status" aria-label="Loading your applications">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-10 flex flex-col items-center justify-center text-center">
            <p className="text-red-500 font-medium text-[13px]">{error}</p>
            <p className="text-slate-500 text-xs mt-1">Please try again later</p>
          </div>
        ) : recentApps.length === 0 ? (
          <EmptyState icon={Banknote} title="No applications yet" text="Apply for your first loan to get started." action={{ label: "Apply now", to: "/dashboard/apply" }} />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[12px] font-bold uppercase tracking-wide text-slate-500">
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
