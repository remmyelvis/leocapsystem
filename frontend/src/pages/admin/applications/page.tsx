

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
import { formatName } from "@/lib/formatName";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DATE_RANGES = [
  { label: "All Time", value: "all" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 7 Days", value: "7" },
] as const;

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

const repaymentStyle = (status?: string | null) => {
  const v = status?.toLowerCase();
  if (v === "paid") return "bg-emerald-100 text-emerald-700";
  if (v === "defaulted" || v === "delinquent") return "bg-red-100 text-red-700";
  if (v === "partially_paid") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-gray-700";
};

const Pill = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <span className={`inline-flex shrink-0 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap capitalize ${className}`}>{children}</span>
);

const ViewButton = ({ id }: { id: string }) => (
  <Link to={`/admin/applications/${id}`} aria-label="View details" title="View Details">
    <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-lg border-slate-200 gap-1.5">
      <Eye className="h-3.5 w-3.5" /> <span className="xl:hidden text-xs font-semibold">View</span>
    </Button>
  </Link>
);

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
  const [payMonth, setPayMonth] = useState(MONTH_NAMES[new Date().getMonth()]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Mark one company's unpaid, disbursed loans of one repayment month as paid. A preview says how many loans and how
  // much first, so nothing is cleared (and no borrower emailed) before the admin has seen it.
  const handleMarkCompanyPaid = async (code: "nakama" | "ideon", label: string) => {
    setMarking(true);
    try {
      const path = `/api/applications/${code}/paid?month=${payMonth}`;
      const preview = await apiCall<{ count: number; total: number }>(`${path}&dry_run=1`, { method: "PATCH" });
      if (preview.error || !preview.data) {
        toast.error(preview.error ?? `Could not check the ${label} loans`);
        return;
      }
      const { count, total } = preview.data;
      if (!confirm(`Mark ${count} ${label} loan${count !== 1 ? "s" : ""} for ${payMonth} (${KES.format(total)}) as paid?\n\nEach borrower will be emailed that their loan is fully repaid.`)) return;
      const response = await apiCall(path, { method: "PATCH" });
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(`${label} loans for ${payMonth} marked as paid`);
        refetch();
      }
    } catch (error) {
      toast.error(`Failed to mark ${label} loans as paid`);
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

  // Companies come from the loans themselves (the registered list does not cover every name in use)
  const companyOptions = useMemo(() => {
    const names = new Set(applications.map((a) => a.company).filter(Boolean));
    if (urlCompany !== "all") names.add(urlCompany);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [applications, urlCompany]);

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
  }, [applications, search, statusFilter, typeFilter, companyFilter, dateRange]);

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
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-5">
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
              <select
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                title="Repayment month the Mark Paid buttons clear"
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {MONTH_NAMES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                onClick={() => handleMarkCompanyPaid("nakama", "Nakama")}
                disabled={marking}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Nakama Paid
              </button>
              <button
                onClick={() => handleMarkCompanyPaid("ideon", "Ideon")}
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
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-3 sm:p-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <Filter className="hidden sm:block h-4 w-4 text-slate-400 flex-shrink-0" />

        {/* Search */}
        <div className="relative col-span-2 sm:col-span-1 flex-1 sm:min-w-[180px]">
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
          className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending_processing">Pending Processing</option>
          <option value="rate_set">Awaiting Rate Approval</option>
          <option value="rate_confirmed">Rate Accepted</option>
          <option value="rate_declined">Rate Declined</option>
          <option value="approved">Approved</option>
          <option value="rejected">Declined</option>
          <option value="disbursed">Disbursed</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          disabled={urlType !== "all"}
          className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        >
          <option value="all">All Types</option>
          <option value="salary_advance">Salary Advance</option>
          <option value="personal">Personal Loan</option>
        </select>

        {/* Company filter */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
        >
          <option value="all">All Companies</option>
          {companyOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Date range filter */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as "all" | "7" | "30")}
          className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue bg-white"
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
          <>
            {/* Wide screens (xl): a table. Narrower ones get cards below, where every figure stays readable. */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pl-5 pr-2 py-3 text-left w-8">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer w-4 h-4"
                        checked={filtered.length > 0 && selectedAppIds.length === filtered.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    {["Applicant", "Loan", "Amount", "Status", "Repayment", "Applied"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                    <th className="pl-4 pr-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((app: TransformedApplication) => {
                    const statusDisplay = getStatusDisplay(app.status);
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="pl-5 pr-2 py-3.5">
                          <input
                            type="checkbox"
                            aria-label="Select application"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer w-4 h-4"
                            checked={selectedAppIds.includes(app.id)}
                            onChange={(e) => handleSelectOne(app.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-3.5 max-w-[240px]">
                          <p className="font-semibold text-slate-800 truncate" title={formatName(app.customerName)}>{formatName(app.customerName)}</p>
                          <p className="text-xs text-slate-400 truncate" title={app.email}>{app.email}</p>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-slate-700">{getLoanTypeDisplay(app.loanType)}</p>
                          <p className="text-xs text-slate-400 capitalize">{app.company || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-800 font-medium whitespace-nowrap">{app.amountApplied ? KES.format(app.amountApplied) : "—"}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap"><Pill className={statusDisplay.style}>{statusDisplay.label}</Pill></td>
                        <td className="px-4 py-3.5 whitespace-nowrap"><Pill className={repaymentStyle(app.repaymentStatus)}>{app.repaymentStatus?.replace(/_/g, " ") || "—"}</Pill></td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-slate-600">{shortDate(app.submittedAt)}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{app.id.slice(0, 8)}</p>
                        </td>
                        <td className="pl-4 pr-5 py-3.5 text-right"><ViewButton id={app.id} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="xl:hidden">
              <label className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer w-4 h-4"
                  checked={filtered.length > 0 && selectedAppIds.length === filtered.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
                Select all {filtered.length}
              </label>
              <ul className="divide-y divide-slate-100">
                {paginated.map((app: TransformedApplication) => {
                  const statusDisplay = getStatusDisplay(app.status);
                  return (
                    <li key={app.id} className="flex gap-3 px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label="Select application"
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer w-4 h-4 shrink-0"
                        checked={selectedAppIds.includes(app.id)}
                        onChange={(e) => handleSelectOne(app.id, e.target.checked)}
                      />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 break-words">{formatName(app.customerName)}</p>
                            <p className="text-xs text-slate-400 truncate">{app.email}</p>
                          </div>
                          <Pill className={statusDisplay.style}>{statusDisplay.label}</Pill>
                        </div>
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">{app.amountApplied ? KES.format(app.amountApplied) : "—"}</span>
                          {" · "}{getLoanTypeDisplay(app.loanType)}{" · "}<span className="capitalize">{app.company || "—"}</span>
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                            <Pill className={repaymentStyle(app.repaymentStatus)}>{app.repaymentStatus?.replace(/_/g, " ") || "—"}</Pill>
                            <span>{shortDate(app.submittedAt)}</span>
                          </div>
                          <ViewButton id={app.id} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
        
        {/* Pagination Controls */}
        {!isLoading && filtered.length > itemsPerPage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 px-4 sm:px-6 py-3 bg-slate-50">
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
