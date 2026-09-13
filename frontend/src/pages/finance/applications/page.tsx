


import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { Search, Eye, Loader2, FileDown, FileSpreadsheet } from "lucide-react";
import { apiCall, downloadFile } from "@/lib/apiClient";
import type { UserRole } from "@/types/user";
import { toast } from "sonner";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatKsh = (amount: number) => {
  return KES.format(amount).replace("KES", "Ksh").trim();
};

const statusBadge = (status: string) => {
  if (status === "pending_processing") return "bg-amber-100 text-amber-700";
  if (status === "amended") return "bg-blue-100 text-blue-700";
  const map: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Declined: "bg-red-100 text-red-700",
    Disbursed: "bg-blue-100 text-blue-700",
  };
  return map[status] ?? "bg-amber-100 text-amber-700";
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

export default function FinanceCompanyApplicationsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const company = role === "FINANCE_IDEON" ? "ideon" : "nakama";
  const companyLabel = company === "ideon" ? "Ideon Limited" : "Nakama Tech Limited";

  const [search, setSearch] = useState("");
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

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("page_size", "10");
        params.append("company", company);

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
  }, [session, selectedMonth, page, company]);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (!search) return true;
      const s = search.toLowerCase();
      const app = a.application || a;
      const name = (a.bio_data?.full_name || app.applicant_id || "").toLowerCase();
      const email = (a.bio_data?.email || "").toLowerCase();
      const payroll = app.payroll_number ? String(app.payroll_number).toLowerCase() : "";
      return name.includes(s) || email.includes(s) || payroll.includes(s);
    });
  }, [applications, search]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const capitalizedMonth = selectedMonth ? selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1) : "";
    const url = capitalizedMonth
      ? `/api/reports/applications/get-all/repayment/${company}/pdf?month=${capitalizedMonth}`
      : `/api/reports/applications/get-all/repayment/${company}/pdf`;
    const { error } = await downloadFile(
      url,
      `repayment_${company}_export.pdf`
    );
    if (error) toast.error("Failed to download PDF. Please try again.");
    setDownloadingPdf(false);
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    const capitalizedMonth = selectedMonth ? selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1) : "";
    const url = capitalizedMonth
      ? `/api/reports/applications/get-all/repayment/${company}/excel?month=${capitalizedMonth}`
      : `/api/reports/applications/get-all/repayment/${company}/excel`;
    const { error } = await downloadFile(
      url,
      `repayment_${company}_export.xlsx`
    );
    if (error) toast.error("Failed to download Excel. Please try again.");
    setDownloadingExcel(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            All Applications
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Salary advance and finance applications from {companyLabel}
          </p>
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {downloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Download Repayment (PDF)
          </button>
          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {downloadingExcel ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Download Repayment (Excel)
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or payroll number…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600 transition-colors"
          />
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600/20 focus:border-violet-600 transition-colors bg-white sm:w-48"
        >
          <option value="">All Months</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900">
            Applications
          </h2>
          <span className="text-xs text-slate-400">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-violet-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No applications found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                    Date
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Applicant
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                    Loan Type
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    Company
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((item: any) => {
                  const app = item.application || item;
                  const bio = item.bio_data;
                  const name = bio?.full_name || app.applicant_id || "Unknown";
                  const initial = name ? name.charAt(0).toUpperCase() : "A";
                  const amount = Number(app.amount_applied || 0);

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs text-slate-400 hidden sm:table-cell">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-800 text-sm font-black flex-shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">
                              {name}
                            </p>
                            <p className="text-xs text-slate-400">{bio?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 hidden lg:table-cell">
                        {app.loan_type
                          ? app.loan_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                          : "N/A"}
                      </td>
                      <td className="px-4 py-4 text-slate-600 hidden md:table-cell">
                        {app.company
                          ? app.company.charAt(0).toUpperCase() + app.company.slice(1)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {formatKsh(amount)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusBadge(
                            app.loan_status
                          )}`}
                        >
                          {formatStatus(app.loan_status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link to={`/finance/applications/pending/${app.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 hover:text-violet-800 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && applications.length > 0 && (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm px-6 py-4 flex items-center justify-between mt-4">
          <div className="text-sm text-slate-600">
            Page {pagination.page} of {pagination.total_pages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={!pagination.has_prev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-gray-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={!pagination.has_next}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-gray-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
