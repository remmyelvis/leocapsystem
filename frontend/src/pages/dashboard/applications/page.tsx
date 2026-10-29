

import { useEffect, useState } from "react";
import { useSession } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { applicationApi } from "@/lib/applicationApi";
import { statusDisplay } from "@/lib/loanStatus";
import { dueChip, loanGroup, type LoanGroup, type Tone } from "@/lib/nextStep";
import EmptyState from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Application {
  id: string;
  loan_type: string;
  company: string;
  amount_applied: string;
  loan_status: string;
  date_submitted?: string;
  created_at?: string;
  repayment_status?: string;
  due_date?: string;
}

export default function ApplicationsPage() {
  const { data: _session } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | LoanGroup>("all");

  useEffect(() => {
    async function fetchApplications() {
      setLoading(true);
      const { data, error } = await applicationApi.getAll();
      if (error) {
        setError(error);
      } else if (Array.isArray(data)) {
        // API returns array of { application: {...}, bio_data: {...} }
        // OR just array of application objects — handle both:
        const mapped = data.map((item: unknown) => {
          const app = ((item as Record<string, unknown>).application ?? item) as Record<string, string>;
          return {
            id: app.id,
            loan_type: app.loan_type,
            company: app.company,
            amount_applied: app.amount_applied,
            loan_status: app.loan_status,
            date_submitted: app.date_submitted ?? app.created_at,
            repayment_status: app.repayment_status,
            due_date: app.due_date,
          };
        });
        setApplications(mapped);
      }
      setLoading(false);
    }
    fetchApplications();
  }, []);

  function formatDate(dateStr?: string): string {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getLoanTypeLabel(loan_type: string, company: string): string {
    if (loan_type === "salary_advance" && company === "ideon") return "Ideon Salary Advance";
    if (loan_type === "salary_advance" && company === "nakama") return "Nakama Salary Advance";
    if (loan_type === "salary_advance") return "Salary Advance"; // any other partner company: the dashboard says the same
    return "Personal Loan";
  }

  // Filters appear once there are enough loans for them to help (and more than one kind to choose between)
  const groupOf = (a: Application) => loanGroup(a.loan_status, a.repayment_status);
  const counts = applications.reduce<Record<string, number>>((c, a) => ({ ...c, [groupOf(a)]: (c[groupOf(a)] ?? 0) + 1 }), {});
  const CHIPS: { key: "all" | LoanGroup; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "progress", label: "In progress" },
    { key: "repaid", label: "Repaid" },
    { key: "declined", label: "Declined" },
  ];
  const chips = applications.length >= 4 && Object.keys(counts).length > 1 ? CHIPS.filter((c) => c.key === "all" || counts[c.key]) : [];
  const shown = filter === "all" ? applications : applications.filter((a) => groupOf(a) === filter);
  const DUE: Record<Tone, string> = { navy: "bg-slate-100 text-slate-700", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-700" };
  // a loan still being repaid shows when it is due
  const due = (a: Application) => {
    const chip = groupOf(a) === "active" ? dueChip(a.due_date) : null;
    return chip && <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${DUE[chip.tone]}`}>{chip.text}</span>;
  };

  const amount = (app: Application) => (app.amount_applied ? KES.format(Number(app.amount_applied)) : "—");

  return (
    <div className="p-4 sm:p-6 w-full space-y-5">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">My Applications</h1>
        <p className="text-slate-500 text-[13px] mt-0.5">Track the status of all your loan applications.</p>
      </div>

      {chips.length > 0 && (
        <div role="group" aria-label="Show" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {chips.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
                filter === key ? "border-brand-blue bg-brand-blue text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {label}
              <span className={`ml-1.5 tabular-nums ${filter === key ? "text-white/80" : "text-slate-500"}`}>{key === "all" ? applications.length : counts[key]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading your applications">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-500 text-[13px]">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-blue-600 text-[13px] underline">
              Retry
            </button>
          </div>
        ) : applications.length === 0 ? (
          <EmptyState icon={FileText} title="No applications yet" text="When you apply for a loan, you can follow it here." action={{ label: "Apply now", to: "/dashboard/apply" }} />
        ) : (
          <>
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-[12px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Loan Type</th>
                    <th className="px-4 py-2">Amount Applied</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shown.map((app) => {
                    const status = statusDisplay(app.loan_status);
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{formatDate(app.date_submitted)}</td>
                        <td className="px-4 py-2 font-semibold text-slate-800 whitespace-nowrap">{getLoanTypeLabel(app.loan_type, app.company)}</td>
                        <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{amount(app)}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${status.className}`}>
                              {status.label}
                            </span>
                            {due(app)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link to={`/dashboard/applications/${app.id}`} className="text-blue-600 text-[13px] font-semibold hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-slate-100">
              {shown.map((app) => {
                const status = statusDisplay(app.loan_status);
                return (
                  <li key={app.id}>
                    <Link to={`/dashboard/applications/${app.id}`} className="block px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">{getLoanTypeLabel(app.loan_type, app.company)}</p>
                        <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{amount(app)}</p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold whitespace-nowrap ${status.className}`}>
                          {status.label}
                        </span>
                        {due(app)}
                        <span>{formatDate(app.date_submitted)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
