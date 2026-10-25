

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { Eye, Info, Loader2 } from "lucide-react";
import { applicationApi, type GetAllApplicationItem } from "@/lib/applicationApi";
import { companyLabel as getCompanyLabel } from "@/lib/company";
import { formatName } from "@/lib/formatName";

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
  const company = (session?.user?.company ?? "").toLowerCase();
  const companyLabel = getCompanyLabel(company, session?.user?.companyName);

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
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900">HR Loans</h1>
        <p className="text-slate-500 text-[13px] mt-0.5">
          Salary advance applications submitted by HR staff for {companyLabel}
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg px-3 py-2 text-[13px]">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <p>
          HR staff&apos;s salary advance applications are <strong>reviewed by finance</strong>. Open one to approve it,
          reject it or amend the amount.
        </p>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
        </div>
      ) : hrLoans.length === 0 ? (
        <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-10 text-center text-slate-500 text-sm">
          No HR loan applications at this time.
        </div>
      ) : null}

      {!loading && hrLoans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {hrLoans.map((loanData) => {
            const loan = loanData.application;
            const bio = loanData.bio_data;
            return (
              <div
                key={loan.id}
                className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4 space-y-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-800 text-xs font-bold flex-shrink-0">
                    {formatName(bio.full_name).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {formatName(bio.full_name)}
                    </p>
                    <p className="text-xs text-slate-500">{loan.designation}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wide font-semibold">
                      Amount Applied
                    </p>
                    <p className="text-[15px] font-bold text-slate-900">
                      {KES.format(Number(loan.amount_applied))}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(
                      loan.loan_status
                    )}`}
                  >
                    {mapStatus(loan.loan_status)}
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Submitted:{" "}
                  {new Date(loan.created_at).toLocaleDateString("en-KE")}
                </div>

                <Link to={`/finance/applications/pending/${loan.id}`}
                  className="flex items-center justify-center gap-2 w-full py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Review
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
