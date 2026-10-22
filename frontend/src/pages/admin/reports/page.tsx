import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { LayoutList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiCall, downloadFile } from "@/lib/apiClient";
import {
  BookPanel, DEFAULT_SORT, EMPTY_FILTERS, EmptyState, ErrorState, ExportMenu, FilterBar, LoansTable, Pagination, SortSelect, TableSkeleton,
  fmtDate, titleCase, toNumber,
  type Aging, type Filters, type LoanRow, type SortState,
} from "./reportParts";

interface PageInfo { page: number; page_size: number; total_records: number; total_pages: number }

export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

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
  const changeSort = useCallback((s: SortState) => { setSort(s); setPage(1); }, []);
  const clearFilters = useCallback(() => { setFilters(EMPTY_FILTERS); setPage(1); }, []);

  const loadLoans = useCallback(async () => {
    const id = ++latest.current; // a slower, older answer must not overwrite a newer one
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), sort: sort.key, order: sort.dir });
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
  }, [filters, page, pageSize, sort]);

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
    <div className="min-h-full pb-8 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-2 px-4 pt-4 sm:px-6 sm:pt-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#081430]">Reports &amp; Analytics</h1>
          <div className="mt-0.5 max-w-2xl text-[13px] text-slate-600" aria-live="polite">
            {loading && rows.length === 0 && !error ? <Skeleton className="mt-1.5 h-3.5 w-64" /> : error && rows.length === 0 ? (
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2C59]/30"
          >
            <LayoutList className="h-3.5 w-3.5 text-slate-500" /> Custom report
          </Link>
          <ExportMenu exporting={exporting} onExport={handleExport} />
        </div>
      </header>

      {/* Filters stay in view while the list scrolls */}
      <div className="z-20 mt-3 bg-slate-50/95 px-4 pb-2 pt-1 backdrop-blur sm:px-6 md:sticky md:top-0">
        <FilterBar filters={filters} companies={companies} onChange={changeFilters} onClear={clearFilters} />
      </div>

      <div className="space-y-3 px-4 pt-2 sm:px-6">
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

        <section aria-label="Loans" className="overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(15,44,89,0.06)] ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4 px-4 py-2">
            <h2 className="text-[13px] font-bold text-slate-900">Loans</h2>
            <div className="flex items-center gap-3">
              <p className="hidden text-[11px] text-slate-500 lg:block">Select a borrower to open their application.</p>
              <SortSelect sort={sort} onSort={changeSort} />
            </div>
          </div>
          {firstLoad ? <TableSkeleton /> : error && rows.length === 0 ? (
            <ErrorState message={error} onRetry={loadLoans} />
          ) : rows.length === 0 ? (
            <EmptyState filtered={filtered} onClear={clearFilters} />
          ) : (
            <LoansTable rows={rows} loading={loading} companyNameOf={companyNameOf} sort={sort} onSort={changeSort} />
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
