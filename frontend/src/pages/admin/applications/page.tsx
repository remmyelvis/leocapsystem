

import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Eye, Filter, RefreshCw, Search, XCircle } from "lucide-react";
import {
  useAdminApplications,
  TransformedApplication,
  getStatusDisplay,
  getLoanTypeDisplay,
} from "@/hooks/useAdminData";
import { adminApplicationsApi } from "@/lib/adminApi";
import { apiCall } from "@/lib/apiClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DATE_RANGES = [
  { label: "All Time", value: "all" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 7 Days", value: "7" },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AllApplicationsPage() {
  const [searchParams] = useSearchParams();
  const { applications, isLoading, error, refetch } = useAdminApplications();

  // Pre-fill type filter from sidebar query param
  const urlType = searchParams.get("type") ?? "all";
  const urlStatus = searchParams.get("status") ?? "all";
  const urlCompany = searchParams.get("company") ?? "all";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus);
  const [typeFilter, setTypeFilter] = useState<string>(urlType === "all" ? "all" : urlType);
  const [companyFilter, setCompanyFilter] = useState<string>(urlCompany);
  const [dateRange, setDateRange] = useState<"all" | "7" | "30">("all");

  useEffect(() => {
    setStatusFilter(urlStatus);
    setCompanyFilter(urlCompany);
  }, [urlStatus, urlCompany]);
  const [marking, setMarking] = useState(false);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const handleMarkNakamaPaid = async () => {
    if (!confirm("Are you sure you want to mark all Nakama loans as paid?")) return;
    setMarking(true);
    try {
      const response = await apiCall("/api/applications/nakama/paid", { method: "PATCH" });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("All Nakama loans marked as paid");
        refetch();
      }
    } catch (error) {
      toast.error("Failed to mark Nakama loans as paid");
    } finally {
      setMarking(false);
    }
  };

  const handleMarkIdeonPaid = async () => {
    if (!confirm("Are you sure you want to mark all Ideon loans as paid?")) return;
    setMarking(true);
    try {
      const response = await apiCall("/api/applications/ideon/paid", { method: "PATCH" });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("All Ideon loans marked as paid");
        refetch();
      }
    } catch (error) {
      toast.error("Failed to mark Ideon loans as paid");
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => {
    setTypeFilter(urlType === "all" ? "all" : urlType);
  }, [urlType]);

    // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, companyFilter, dateRange]);

  const filtered = useMemo(() => {
    
    const now = Date.now();
    return [...applications]
      .filter((a) => {
        if (
          search &&
          !a.customerName.toLowerCase().includes(search.toLowerCase()) &&
          !a.id.toLowerCase().includes(search.toLowerCase()) &&
          !a.email.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        if (statusFilter !== "all" && a.status.toLowerCase() !== statusFilter.toLowerCase())
          return false;
        if (companyFilter !== "all" && a.company?.toLowerCase() !== companyFilter.toLowerCase())
          return false;
        if (typeFilter !== "all" && a.loanType.toLowerCase() !== typeFilter.toLowerCase())
          return false;
        if (dateRange !== "all") {
          const cutoff = now - parseInt(dateRange) * 24 * 60 * 60 * 1000;
          if (new Date(a.submittedAt).getTime() < cutoff) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
  }, [applications, search, statusFilter, typeFilter, dateRange]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppIds(filtered.map(app => app.id));
    } else {
      setSelectedAppIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAppIds(prev => [...prev, id]);
    } else {
      setSelectedAppIds(prev => prev.filter(appId => appId !== id));
    }
  };

  const handleMarkSelectedPaid = async () => {
    if (selectedAppIds.length === 0) return;
    if (!confirm(`Are you sure you want to mark ${selectedAppIds.length} application(s) as paid?`)) return;
    
    setMarking(true);
    try {
      const response = await apiCall("/api/applications/bulk/paid", { 
        method: "PATCH",
        body: { application_ids: selectedAppIds }
      });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(`Successfully marked applications as paid`);
        setSelectedAppIds([]);
        refetch();
      }
    } catch (error) {
      toast.error("Failed to mark selected applications as paid");
    } finally {
      setMarking(false);
    }
  };

  const pageTitle =
    urlType === "salary_advance"
      ? "Salary Advance Applications"
      : urlType === "personal"
        ? "Personal Loan Applications"
        : "All Applications";

    // Calculate paginated slice
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filtered.length} application{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedAppIds.length > 0 && (
            <button
              onClick={handleMarkSelectedPaid}
              disabled={marking}
              className="inline-flex items-center gap-1.5 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Selected Paid ({selectedAppIds.length})
            </button>
          )}
          {urlType === "salary_advance" && (
            <>
              <button
                onClick={handleMarkNakamaPaid}
                disabled={marking}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Nakama Paid
              </button>
              <button
                onClick={handleMarkIdeonPaid}
                disabled={marking}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Ideon Paid
              </button>
            </>
          )}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
          <button onClick={() => refetch()} className="ml-auto text-red-800 font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending_processing">Pending Processing</option>
          <option value="rate_set">Awaiting Rate Approval</option>
          <option value="rate_confirmed">Rate Accepted</option>
          <option value="rate_declined">Rate Declined</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="disbursed">Disbursed</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          disabled={urlType !== "all"}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          <option value="all">All Types</option>
          <option value="salary_advance">Salary Advance</option>
          <option value="personal">Personal Loan</option>
        </select>

        {/* Company filter */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
        >
          <option value="all">All Companies</option>
          <option value="ideon">Ideon</option>
          <option value="nakama">Nakama</option>
          <option value="joy_flowers">Joy Flowers</option>
          <option value="personal">Personal</option>
        </select>

        {/* Date range filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as "all" | "7" | "30")}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
        >
          {DATE_RANGES.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-400 text-sm">No applications match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-semibold sticky top-0 backdrop-blur-md">
                  <th className="px-4 py-3 text-left">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer w-4 h-4"
                      checked={filtered.length > 0 && selectedAppIds.length === filtered.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  {[
                    "ID",
                    "Date",
                    "Applicant",
                    "Loan Type",
                    "Company",
                    "Amount",
                    "Status",
                    "Repayment",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((app: TransformedApplication) => {
                  const statusDisplay = getStatusDisplay(app.status);

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer w-4 h-4"
                          checked={selectedAppIds.includes(app.id)}
                          onChange={(e) => handleSelectOne(app.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                        {app.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(app.submittedAt).toLocaleDateString("en-KE", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap max-w-[200px]">
                        <div>
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {app.customerName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{app.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {getLoanTypeDisplay(app.loanType)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap capitalize">
                        {app.company || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                        {app.amountApplied ? KES.format(app.amountApplied) : "—"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ${statusDisplay.style}`}
                        >
                          {statusDisplay.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap capitalize">
                        <span className={`inline-flex text-xs font-bold px-2.5 py-1 rounded-full ${
                          app.repaymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          app.repaymentStatus?.toLowerCase() === 'defaulted' ? 'bg-red-100 text-red-700' :
                          app.repaymentStatus?.toLowerCase() === 'partially_paid' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-gray-700'
                        }`}>
                          {app.repaymentStatus?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/applications/${app.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 rounded-lg border-slate-200"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {!isLoading && filtered.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="font-medium text-slate-900">{filtered.length}</span> results
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:bg-slate-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
