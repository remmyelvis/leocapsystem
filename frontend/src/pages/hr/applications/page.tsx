


import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { Search, Eye, Loader2, FileDown, FileSpreadsheet } from "lucide-react";
import { apiCall, downloadFile } from "@/lib/apiClient";
import { companyLabel as getCompanyLabel, repaymentReportPath } from "@/lib/company";
import { toast } from "sonner";
import { formatName } from "@/lib/formatName";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatKsh = (amount: number) => {
  return KES.format(amount).replace("KES", "Ksh").trim();
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending_processing: "bg-amber-100 text-amber-700",
    amended: "bg-blue-100 text-blue-700",
    approved: "bg-emerald-100 text-emerald-700",
    disbursed: "bg-blue-100 text-blue-700",
    declined: "bg-red-100 text-red-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status?.toLowerCase()] ?? "bg-amber-100 text-amber-700";
};

// One list row, read from an API item (shared by the table and the card list)
const rowOf = (item: any) => {
  const app = item.application || item;
  const name = formatName(item.bio_data?.full_name) || app.applicant_id || "Unknown";
  return {
    id: app.id as string,
    name: name as string,
    initial: name ? String(name).charAt(0).toUpperCase() : "A",
    email: (item.bio_data?.email || "") as string,
    created: app.created_at as string,
    amount: Number(app.amount_applied || 0),
    status: (app.loan_status || "") as string,
    type: app.loan_type ? app.loan_type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "N/A",
    company: app.company ? app.company.charAt(0).toUpperCase() + app.company.slice(1) : "N/A",
  };
};

const formatStatus = (status: string) => {
  if (status === "pending_processing") return "Pending";
  if (status === "amended") return "Amended";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

interface ApplicationItem {
  application: {
    id: string;
    applicant_id: string;
    loan_status: string;
    loan_type: string;
    company: string;
    amount_applied: number;
    created_at: string;
    payroll_number?: string | number;
    designation?: string;
    [key: string]: unknown;
  };
  bio_data: {
    full_name?: string;
    email?: string;
    phone_number?: string;
    id_number?: string;
  };
}

export default function HRApplicationsPage() {
  const { data: session } = useSession();
  const company = (session?.user?.company ?? "").toLowerCase();
  const companyLabel = getCompanyLabel(company, session?.user?.companyName);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  const MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // Search runs on the server (name, email, phone, payroll no.) so it covers every page, not just the one on screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("page_size", "10");
        params.append("company", company);
        if (debouncedSearch) params.append("search", debouncedSearch);

        if (selectedMonth) {
          const capitalizedMonth = selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1);
          params.append("month", capitalizedMonth);
        }

        const url = `/api/reports/applications/get-all?${params.toString()}`;
        const { data, error } = await apiCall(url);

        if (error) {
          console.error("Failed to fetch applications:", error);
          setApplications([]);
          return;
        }

        if (data && (data as any).data) {
          setApplications((data as any).data);
          if ((data as any).pagination) {
            setPagination((data as any).pagination);
          }
        } else {
          setApplications(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to fetch applications", error);
      } finally {
        setLoading(false);
      }
    }
    if (session) {
      fetchData();
    }
  }, [session, selectedMonth, page, company, debouncedSearch]);

  const filtered = applications;

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const capitalizedMonth = selectedMonth ? selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1) : "";
    const url = capitalizedMonth
      ? `${repaymentReportPath(company, "pdf")}?month=${capitalizedMonth}`
      : repaymentReportPath(company, "pdf");
    const { error } = await downloadFile(
      url,
      `repayment_${company}_export.pdf`
    );
    if (error) toast.error(error);
    setDownloadingPdf(false);
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    const capitalizedMonth = selectedMonth ? selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1) : "";
    const url = capitalizedMonth
      ? `${repaymentReportPath(company, "excel")}?month=${capitalizedMonth}`
      : repaymentReportPath(company, "excel");
    const { error } = await downloadFile(
      url,
      `repayment_${company}_export.xlsx`
    );
    if (error) toast.error(error);
    setDownloadingExcel(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            All Applications
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            Salary advance and finance applications from {companyLabel}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            Repayment downloads list the unpaid, disbursed loans for the month selected below (this month if none is selected).
          </p>
        </div>

        {/* Download buttons */}
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            Download Repayment (PDF)
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {downloadingExcel ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Download Repayment (Excel)
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or payroll number…"
            className="w-full pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors"
          />
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setPage(1);
          }}
          className="px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors bg-white sm:w-44"
        >
          <option value="">All Months</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* List: table from xl, cards below */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Applications</h2>
          <span className="text-xs text-slate-500">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center items-center">
            <Loader2 className="h-6 w-6 text-emerald-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">No applications found.</div>
        ) : (
          <>
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Applicant</th>
                    <th className="px-4 py-2">Loan Type</th>
                    <th className="px-4 py-2">Company</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item: any) => {
                    const r = rowOf(item);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{formatDate(r.created)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-xs font-bold flex-shrink-0">
                              {r.initial}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                              <p className="text-xs text-slate-500 truncate">{r.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{r.type}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{r.company}</td>
                        <td className="px-4 py-2 font-bold text-slate-800 whitespace-nowrap">{formatKsh(r.amount)}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(r.status)}`}>
                            {formatStatus(r.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link to={`/hr/applications/pending/${r.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="xl:hidden divide-y divide-slate-100">
              {filtered.map((item: any) => {
                const r = rowOf(item);
                return (
                  <li key={r.id}>
                    <Link to={`/hr/applications/pending/${r.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 text-xs font-bold flex-shrink-0">
                        {r.initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800 text-sm truncate min-w-0">{r.name}</p>
                          <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{formatKsh(r.amount)}</p>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{r.email}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span className={`inline-flex font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(r.status)}`}>
                            {formatStatus(r.status)}
                          </span>
                          <span>{r.type}</span>
                          <span aria-hidden>·</span>
                          <span>{formatDate(r.created)}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && applications.length > 0 && (
        <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm px-4 py-2.5 flex items-center justify-between">
          <div className="text-[13px] text-slate-600">
            Page {pagination.page} of {pagination.total_pages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={!pagination.has_prev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg text-[13px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={!pagination.has_next}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg text-[13px] font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
