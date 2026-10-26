

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { GetAllApplicationItem } from "@/lib/applicationApi";
import { apiCall } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const mapStatus = (status: string) => {
  if (status === "pending_processing") return "Pending Review";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusBadge = (status: string) => {
  const s = mapStatus(status);
  if (s.includes("Pending")) return "bg-amber-100 text-amber-700";
  if (s.includes("Approve")) return "bg-emerald-100 text-emerald-700";
  if (s.includes("Decline")) return "bg-red-100 text-red-700";
  if (s.includes("Disburse")) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
};

const mapLoanType = (type: string) => {
  if (type === "personal") return "Personal Loan";
  if (type === "salary_advance") return "Salary Advance";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FinanceMyLoansPage() {
  const [loans, setLoans] = useState<GetAllApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLoans() {
      try {
        const res = await apiCall<GetAllApplicationItem[]>("/api/applications/get-finance-all");
        if (res.data) {
          // Sort descending by date
          const sorted = res.data.sort((a, b) => 
            new Date(b.application.created_at).getTime() - new Date(a.application.created_at).getTime()
          );
          setLoans(sorted);
        }
      } catch (error) {
        console.error("Failed to fetch loans", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLoans();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            Your personal loan applications
          </p>
        </div>
        <Link to="/finance/apply"
          className="tap-btn inline-flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 text-white text-[13px] font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Apply for Loan
        </Link>
      </div>

      <div className="bg-white ring-1 ring-slate-200 shadow-sm rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid bg-slate-50/50 border-b border-slate-100 px-4 py-2 grid-cols-5 gap-4 items-center">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Date</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Loan Type</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Amount Applied</div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</div>
          <div></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No applications found.
            </div>
          ) : (
            loans.map((item) => {
              const loan = item.application;
              const status = (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge(loan.loan_status)}`}>
                  {mapStatus(loan.loan_status)}
                </span>
              );
              return (
                <div key={loan.id}>
                  <div className="hidden md:grid px-4 py-2.5 grid-cols-5 gap-4 items-center hover:bg-slate-50/50 transition-colors">
                    <div className="text-sm text-slate-600">{formatDate(loan.created_at)}</div>
                    <div className="text-sm font-semibold text-slate-900">{mapLoanType(loan.loan_type)}</div>
                    <div className="text-sm text-slate-600">{KES.format(Number(loan.amount_applied))}</div>
                    <div>{status}</div>
                    <div className="text-right">
                      <Link to={`/finance/applications/${loan.id}`} className="text-[13px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
                        View
                      </Link>
                    </div>
                  </div>
                  <Link to={`/finance/applications/${loan.id}`} className="md:hidden flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{mapLoanType(loan.loan_type)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(loan.created_at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-sm font-bold text-slate-800 whitespace-nowrap">{KES.format(Number(loan.amount_applied))}</p>
                      {status}
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
