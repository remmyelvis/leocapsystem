

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { applicationApi, GetAllApplicationItem } from "@/lib/applicationApi";
import { apiCall } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";

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

export default function HRMyLoansPage() {
  const [loans, setLoans] = useState<GetAllApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuthStore();

  useEffect(() => {
    async function fetchLoans() {
      try {
        const res = await apiCall<GetAllApplicationItem[]>("/api/applications/get-hr-all");
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

    // Only fetch if we have a current user, or if we know user is fully loaded
    if (currentUser) {
      fetchLoans();
    } else {
      // If auth isn't loaded yet, keep loading state
      const timeout = setTimeout(() => setLoading(false), 1000); // Fallback
      return () => clearTimeout(timeout);
    }
  }, [currentUser]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Applications</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your loan applications
        </p>
      </div>

      <div className="bg-white ring-1 ring-slate-200 shadow-sm rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-4 grid grid-cols-5 gap-4 items-center">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loan Type</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Applied</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</div>
          <div></div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No applications found.
            </div>
          ) : (
            loans.map((item) => {
              const loan = item.application;
              return (
                <div key={loan.id} className="px-6 py-4 grid grid-cols-5 gap-4 items-center hover:bg-slate-50/50 transition-colors">
                  <div className="text-sm font-medium text-slate-600">
                    {formatDate(loan.created_at)}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {mapLoanType(loan.loan_type)}
                  </div>
                  <div className="text-sm font-medium text-slate-600">
                    {KES.format(Number(loan.amount_applied))}
                  </div>
                  <div>
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${statusBadge(loan.loan_status)}`}>
                      {mapStatus(loan.loan_status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <Link to={`/hr/applications/${loan.id}`}
                      className="text-sm font-bold text-blue-600 hover:text-brand-blue transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
