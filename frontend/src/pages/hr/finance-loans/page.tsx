

import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { Eye, Info } from "lucide-react";
import {
  getAllMockApplicationsWithOverrides,
} from "@/lib/mockStaff";
import type { UserRole } from "@/types/user";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Declined: "bg-red-100 text-red-700",
    Disbursed: "bg-blue-100 text-blue-700",
  };
  return map[status] ?? "bg-slate-100 text-slate-600";
};

export default function HRFinanceLoansPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const company = role === "HR_IDEON" ? ("IDEON" as const) : ("NAKAMA" as const);
  const companyLabel = company === "IDEON" ? "Ideon Limited" : "Nakama";

  // Use overrides
  const allApps = getAllMockApplicationsWithOverrides();
  const financeLoans = allApps.filter(
    (a) =>
      a.company === company &&
      (a.submitterRole === "finance_ideon" ||
        a.submitterRole === "finance_nakama")
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Finance Loans</h1>
        <p className="text-slate-400 text-sm mt-1">
          Salary advance applications submitted by the Finance Manager for{" "}
          {companyLabel}
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl px-4 py-3 text-sm">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          As HR Manager, you can view and <strong>edit the amount</strong> for
          the Finance Manager&apos;s salary advance applications. Open an
          application to make changes.
        </p>
      </div>

      {/* Cards */}
      {financeLoans.length === 0 ? (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
          No Finance loan applications at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {financeLoans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-800 text-sm font-black flex-shrink-0">
                  {loan.customerName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {loan.customerName}
                  </p>
                  <p className="text-xs text-slate-400">{loan.designation}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-bold">
                    Amount Applied
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    {KES.format(loan.amountApplied)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(
                    loan.status
                  )}`}
                >
                  {loan.status}
                </span>
              </div>

              <div className="text-xs text-slate-400">
                Submitted:{" "}
                {new Date(loan.submittedAt).toLocaleDateString("en-KE")}
              </div>

              <Link to={`/hr/applications/${loan.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                View & Edit Amount
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
