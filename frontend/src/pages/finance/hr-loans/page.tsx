

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { Eye, Info, Loader2 } from "lucide-react";
import { applicationApi, type GetAllApplicationItem } from "@/lib/applicationApi";
import type { UserRole } from "@/types/user";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending_processing: "bg-amber-100 text-amber-700",
    amended: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    declined: "bg-red-100 text-red-700",
    disbursed: "bg-blue-100 text-blue-700",
  };
  const normalized = status.toLowerCase();
  return map[normalized] ?? "bg-slate-100 text-slate-600";
};

const mapStatus = (status: string) => {
  if (status === "pending_processing") return "Pending";
  if (status === "amended") return "Amended";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function FinanceHRLoansPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const company = role === "FINANCE_IDEON" ? "ideon" : "nakama";
  const companyLabel = company === "ideon" ? "Ideon Limited" : "Nakama";

  const [hrLoans, setHrLoans] = useState<GetAllApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      setLoading(true);
      const { data } = await applicationApi.getHrAll();
      if (data) {
        // Only show loans for the finance user's company that are either amended or pending_processing
        const filtered = data.filter((item) => {
          const status = item.application.loan_status?.toLowerCase();
          return item.application.company === company && (status === "amended" || status === "pending_processing");
        });
        setHrLoans(filtered);
      }
      setLoading(false);
    }
    fetchApps();
  }, [company]);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">HR Loans</h1>
        <p className="text-slate-400 text-sm mt-1">
          Salary advance applications submitted by HR staff for {companyLabel}
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl px-4 py-3 text-sm">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          As Finance Manager, you can view and <strong>edit the amount</strong>{" "}
          for the HR Manager&apos;s salary advance applications. Open an
          application to make changes.
        </p>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
        </div>
      ) : hrLoans.length === 0 ? (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">
          No HR loan applications at this time.
        </div>
      ) : null}

      {!loading && hrLoans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hrLoans.map((loanData) => {
            const loan = loanData.application;
            const bio = loanData.bio_data;
            return (
              <div
                key={loan.id}
                className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-800 text-sm font-black flex-shrink-0">
                    {bio.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {bio.full_name}
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
                      {KES.format(Number(loan.amount_applied))}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(
                      loan.loan_status
                    )}`}
                  >
                    {mapStatus(loan.loan_status)}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Submitted:{" "}
                  {new Date(loan.created_at).toLocaleDateString("en-KE")}
                </div>

                <Link to={`/finance/hr-loans/pending/${loan.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View & Edit Amount
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
