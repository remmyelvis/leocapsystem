import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { LayoutList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiCall, downloadFile } from "@/lib/apiClient";
import {
  BookPanel, EMPTY_FILTERS, EmptyState, ErrorState, ExportMenu, FilterBar, LoansTable, Pagination, TableSkeleton,
  fmtDate, titleCase, toNumber,
  type Aging, type Filters, type LoanRow,
} from "./reportParts";

interface PageInfo { page: number; page_size: number; total_records: number; total_pages: number }

export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState<LoanRow[]>([]);
  const [totals, setTotals] = useState({ applied: 0, disbursed: 0, repayment: 0 });
  const [pagination, setPagination] = useState<PageInfo>({ page: 1, page_size: 10, total_records: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aging, setAging] = useState<Aging | null>(null);
  const [agingLoading, setAgingLoading] = useState(true);
  const [agingFailed, setAgingFailed] = useState(false);

  const [companies, setCompanies] = useState<{ name: string; code: string }[]>([]);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const latest = useRef(0);

  const changeFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);
  const clearFilters = useCallback(() => { setFilters(EMPTY_FILTERS); setPage(1); }, []);

  const loadLoans = useCallback(async () => {
    const id = ++latest.current; // a slower, older answer must not overwrite a newer one
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (filters.search) params.append("search", filters.search);
    if (filters.loanType !== "all") params.append("loan_type", filters.loanType);
    if (filters.company !== "all") params.append("company", filters.company);
    if (filters.loanStatus !== "all") params.append("loan_status", filters.loanStatus);
    if (filters.repayment !== "all") params.append("repayment_status", filters.repayment);
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);

    const res = await apiCall<any>(`/api/reports/applications/get-all?${params.toString()}`);
    if (id !== latest.current) return;
    if (res.error || !res.data) {
      const message = res.error || "The server sent an empty answer.";
      setError(message);
      toast.error(message);
    } else {
      const d = res.data;
      setRows(d.data || []);
      const a = d.advance_data || {}, p = d.personal_data || {};
      setTotals({
        applied: toNumber(a.total_applied) + toNumber(p.total_applied),
        disbursed: toNumber(a.total_disbursed) + toNumber(p.total_disbursed),
        repayment: toNumber(a.total_repayment) + toNumber(p.total_repayment),
      });
      if (d.pagination) setPagination(d.pagination);
    }
    setLoading(false);
  }, [filters, page, pageSize]);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const loadAging = useCallback(async () => {
    setAgingLoading(true);
    setAgingFailed(false);
    const url = filters.company === "all" ? "/api/reports/aging" : `/api/reports/aging/${filters.company}`;
    const res = await apiCall<{ summary?: Aging }>(url);
    if (res.data?.summary) setAging(res.data.summary);
    else setAgingFailed(true);
    setAgingLoading(false);
  }, [filters.company]);

  useEffect(() => { loadAging(); }, [loadAging]);

  useEffect(() => {
    apiCall<{ companies: { name: string; code: string }[] }>("/api/companies").then((res) => {
      if (res.data?.companies) setCompanies(res.data.companies);
    });
  }, []);

  const companyNameOf = (code: string) => companies.find((c) => c.code === code)?.name ?? titleCase(code);

  const handleExport = async (type: "excel" | "pdf") => {
    setExporting(type);
    const params = new URLSearchParams();
    if (filters.startDate) params.append("start_date", filters.startDate);
    if (filters.endDate) params.append("end_date", filters.endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await downloadFile(
      `/api/reports/applications/get-all/repayment/company/${filters.company}/${type}${qs}`,
      `repayment_${filters.company}.${type === "excel" ? "xlsx" : "pdf"}`,
    );
    setExporting(null);
    if (res.error) toast.error(res.error);
    else toast.success(`Downloaded ${type.toUpperCase()} report successfully`);
  };

  const filtered =
    filters.search !== "" || filters.company !== "all" || filters.loanType !== "all" || filters.loanStatus !== "all" ||
    filters.repayment !== "all" || filters.startDate !== "" || filters.endDate !== "";

  const who = filters.company === "all" ? "all companies" : companyNameOf(filters.company);
  const period = filters.startDate && filters.endDate
    ? `, applied for between ${fmtDate(filters.startDate + "T00:00:00")} and ${fmtDate(filters.endDate + "T00:00:00")}`
    : filters.startDate ? `, applied for since ${fmtDate(filters.startDate + "T00:00:00")}`
    : filters.endDate ? `, applied for up to ${fmtDate(filters.endDate + "T00:00:00")}` : "";

  const firstLoad = loading && rows.length === 0 && !error;

  return (
    <div className="min-h-full bg-slate-50 pb-10">
      {/* Header */}
      <header className="flex flex-col gap-4 px-4 pt-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#081430]">Reports &amp; Analytics</h1>
          <div className="mt-1 max-w-2xl text-sm text-slate-600" aria-live="polite">
            {loading && rows.length === 0 && !error ? <Skeleton className="mt-2 h-4 w-72" /> : error && rows.length === 0 ? (
              <span className="text-rose-700">The loan list did not load. Try again below.</span>
            ) : (
              <>
                <span className="font-semibold tabular-nums text-slate-800">{pagination.total_records.toLocaleString("en-KE")}</span>{" "}
                {pagination.total_records === 1 ? "loan" : "loans"} from {who}{period}.
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/reports/builder"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30"
          >
            <LayoutList className="h-4 w-4 text-slate-500" /> Custom report
          </Link>
          <ExportMenu exporting={exporting} onExport={handleExport} />
        </div>
      </header>

      {/* Filters stay in view while the list scrolls */}
      <div className="z-20 mt-5 bg-slate-50/95 px-4 pb-3 pt-1 backdrop-blur sm:px-6 md:sticky md:top-0 lg:px-8">
        <FilterBar filters={filters} companies={companies} onChange={changeFilters} onClear={clearFilters} />
      </div>

      <div className="space-y-6 px-4 pt-3 sm:px-6 lg:px-8">
        <BookPanel
          loading={firstLoad}
          count={pagination.total_records}
          applied={totals.applied}
          disbursed={totals.disbursed}
          repayment={totals.repayment}
          aging={aging}
          agingLoading={agingLoading}
          agingFailed={agingFailed}
          agingScope={filters.company === "all" ? "across all companies" : `at ${who}`}
          onRefreshAging={loadAging}
        />

        <section aria-label="Loans" className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,44,89,0.06)] ring-1 ring-slate-200">
          <div className="flex items-baseline justify-between gap-4 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Loans</h2>
            <p className="text-xs text-slate-500">Select a borrower to open their application.</p>
          </div>
          {firstLoad ? <TableSkeleton /> : error && rows.length === 0 ? (
            <ErrorState message={error} onRetry={loadLoans} />
          ) : rows.length === 0 ? (
            <EmptyState filtered={filtered} onClear={clearFilters} />
          ) : (
            <LoansTable rows={rows} loading={loading} companyNameOf={companyNameOf} />
          )}
          <Pagination
            page={pagination.page}
            pageSize={pagination.page_size || pageSize}
            total={pagination.total_records}
            totalPages={pagination.total_pages || 1}
            onPage={setPage}
            onPageSize={(n) => { setPageSize(n); setPage(1); }}
          />
        </section>
      </div>
    </div>
  );
}
