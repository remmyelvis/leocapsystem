

import { useEffect, useState } from "react";
import { useSession } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { applicationApi } from "@/lib/applicationApi";

interface Application {
  id: string;
  loan_type: string;
  company: string;
  amount_applied: string;
  loan_status: string;
  date_submitted?: string;
  created_at?: string;
}

export default function ApplicationsPage() {
  const { data: _session } = useSession();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchApplications() {
      setLoading(true);
      const { data, error } = await applicationApi.getAll();
      console.log("RAW API RESPONSE:", JSON.stringify(data, null, 2));
      console.log("ERROR:", error);
      if (error) {
        setError(error);
      } else if (Array.isArray(data)) {
        // API returns array of { application: {...}, bio_data: {...} }
        // OR just array of application objects — handle both:
        const mapped = data.map((item: unknown) => {
          const app = (item as Record<string, unknown>).application ?? item;
          return {
            id: app.id,
            loan_type: app.loan_type,
            company: app.company,
            amount_applied: app.amount_applied,
            loan_status: app.loan_status,
            date_submitted: app.date_submitted ?? app.created_at,
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

  function getStatusDisplay(status: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
      Pending:            { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
      pending_processing: { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
      pending:            { label: "Pending Review", className: "bg-amber-100 text-amber-700" },
      // Rate workflow statuses
      rate_set:           { label: "Review Rate", className: "bg-indigo-100 text-indigo-700" },
      RATE_SET:           { label: "Review Rate", className: "bg-indigo-100 text-indigo-700" },
      rate_confirmed:     { label: "Rate Accepted", className: "bg-cyan-100 text-cyan-700" },
      RATE_CONFIRMED:     { label: "Rate Accepted", className: "bg-cyan-100 text-cyan-700" },
      rate_declined:      { label: "Rate Declined", className: "bg-orange-100 text-orange-700" },
      RATE_DECLINED:      { label: "Rate Declined", className: "bg-orange-100 text-orange-700" },
      // Final statuses
      Approved:           { label: "Approved",       className: "bg-emerald-100 text-emerald-700" },
      approved:           { label: "Approved",       className: "bg-emerald-100 text-emerald-700" },
      Declined:           { label: "Declined",       className: "bg-red-100 text-red-700" },
      declined:           { label: "Declined",       className: "bg-red-100 text-red-700" },
      rejected:           { label: "Declined",       className: "bg-red-100 text-red-700" },
      Disbursed:          { label: "Disbursed",      className: "bg-purple-100 text-purple-700" },
      disbursed:          { label: "Disbursed",      className: "bg-purple-100 text-purple-700" },
    };
    return map[status] ?? { label: status, className: "bg-slate-100 text-gray-700" };
  }

  function getLoanTypeLabel(loan_type: string, company: string): string {
    if (loan_type === "salary_advance" && company === "ideon") return "Ideon Salary Advance";
    if (loan_type === "salary_advance" && company === "nakama") return "Nakama Salary Advance";
    return "Personal Loan";
  }

  return (
    <div className="p-6 w-full space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Applications</h1>
        <p className="text-slate-500 text-sm mt-1">
          Track the status of all your loan applications.
        </p>
      </div>

      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            Loading applications...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-blue-600 text-sm underline"
            >
              Retry
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No applications yet.{" "}
            <Link to="/dashboard/apply" className="text-blue-600 underline">
              Apply now
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Loan Type</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Applied</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => {
                const status = getStatusDisplay(app.loan_status);
                return (
                  <tr key={app.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(app.date_submitted)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                      {getLoanTypeLabel(app.loan_type, app.company)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {app.amount_applied
                        ? `KES ${Number(app.amount_applied).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/dashboard/applications/${app.id}`}
                        className="text-blue-600 text-sm font-semibold hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
