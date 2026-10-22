import { formatName } from "@/lib/formatName";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Loader2, ArrowUpDown, History, ExternalLink } from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AuditTrail {
  id: string;
  application_id: string;
  applicant_name: string | null;
  company: string | null;
  loan_type: string | null;
  application_new_loan_amount: number;
  application_new_repayment_amount: number;
  application_old_loan_amount: number;
  application_old_repayment_amount: number;
  changed_at: string;
  changed_by_email: string;
  changed_by_role: string;
  changed_by_company?: string;
  field_name: string;
  new_status: string;
  old_status: string;
  notes: string;
}

interface PaginationData {
  has_next: boolean;
  has_prev: boolean;
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const label = (value?: string | null) => (value ? value.replace(/_/g, " ") : "—");
const sentence = (value?: string | null) => label(value).replace(/^\w/, (c) => c.toUpperCase());

// One readable line for what a row changed: "Loan status: pending processing → approved", "Amount applied: KES 20,000.00 → KES 30,000.00"
function formatValue(field: string, value?: string | null) {
  if (value === null || value === undefined || value === "") return "empty";
  if (/amount|fee|balance|limit/.test(field) && value.trim() !== "" && !isNaN(Number(value))) return KES.format(Number(value));
  return label(value);
}

function summarize(item: AuditTrail) {
  // A payment keeps the loan "partially paid": there is no before/after, so the note ("Partial repayment of KES ...") is the news.
  if (item.old_status === item.new_status && item.notes) return item.notes;
  return `${sentence(item.field_name)}: ${formatValue(item.field_name, item.old_status)} → ${formatValue(item.field_name, item.new_status)}`;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const thCls = "text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap";

function Borrower({ item }: { item: AuditTrail }) {
  return (
    <div className="min-w-0">
      <Link
        to={`/admin/applications/${item.application_id}`}
        className="inline-flex items-center gap-1 max-w-[240px] font-semibold text-slate-800 hover:text-blue-700 transition-colors"
        title={`Open loan ${item.application_id}`}
      >
        <span className="truncate">{formatName(item.applicant_name) || "Unknown borrower"}</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
      </Link>
      <p className="text-xs text-slate-400 capitalize">{item.company ? label(item.company) : "—"} • {item.application_id.substring(0, 8)}</p>
    </div>
  );
}

function ViewLink({ id }: { id: string }) {
  return (
    <Link to={`/admin/audit-trail/${id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-brand-blue transition-colors whitespace-nowrap">
      <Eye className="h-4 w-4" /> View
    </Link>
  );
}

const roleLabel = (role?: string | null) => (role === "hr" ? "HR" : role ? sentence(role) : "—");

const PERIODS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Last 24 Hours" },
  { value: "7d", label: "Past 7 Days" },
  { value: "30d", label: "Past 30 Days" },
];

const selectCls =
  "px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors bg-white w-full sm:w-auto sm:min-w-[150px] min-w-0";

export default function ApplicationChangesTab() {
  const [data, setData] = useState<AuditTrail[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // the search text once typing has paused; the server does the searching
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState("all");
  const [field, setField] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), period, order });
      if (query) params.set("q", query);
      if (field) params.set("field", field);
      const res = await apiCall<{ data: AuditTrail[]; fields: string[]; pagination: PaginationData }>(`/api/applications/audit-trails?${params}`);
      if (res.error || !res.data) {
        toast.error(res.error ?? "Failed to load audit trails");
        setData([]);
        setPagination(null);
      } else {
        setData(res.data.data || []);
        setFields(res.data.fields || []);
        setPagination(res.data.pagination || null);
      }
      setLoading(false);
    }
    fetchData();
  }, [page, period, field, order, query]);

  const filtered = Boolean(query || field || period !== "all");

  return (
    <div className="w-full space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search borrower, company, who, notes, loan ID…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:contents">
        <select value={field} onChange={(e) => { setField(e.target.value); setPage(1); }} className={selectCls}>
          <option value="">Everything changed</option>
          {fields.map((f) => (
            <option key={f} value={f}>{sentence(f)}</option>
          ))}
        </select>
        <select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }} className={selectCls}>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-black text-slate-900">Loan Changes</h2>
          </div>
          <span className="text-xs text-slate-400">
            {pagination ? `${pagination.total_items.toLocaleString()} change${pagination.total_items !== 1 ? "s" : ""}` : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            {filtered ? "No changes match your search." : "No loan changes recorded yet."}
          </div>
        ) : (
          <>
            {/* Wide screens (xl): a table. Narrower ones get cards below, where the change itself reads in full. */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th
                      className="text-left pl-6 pr-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => { setOrder(order === "desc" ? "asc" : "desc"); setPage(1); }}
                      title={order === "desc" ? "Newest first (click for oldest first)" : "Oldest first (click for newest first)"}
                    >
                      <div className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></div>
                    </th>
                    <th className={thCls}>Changed by</th>
                    <th className={thCls}>Borrower</th>
                    <th className={thCls}>What changed</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.map((item) => {
                    const [day, time] = formatDate(item.changed_at).split(", ");
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="pl-6 pr-4 py-3.5 whitespace-nowrap">
                          <p className="text-xs font-semibold text-slate-700">{day}</p>
                          {time && <p className="text-xs text-slate-400">{time}</p>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-800 truncate max-w-[180px] 2xl:max-w-[260px]" title={item.changed_by_email}>{item.changed_by_email}</p>
                          <p className="text-xs text-slate-400 capitalize">{roleLabel(item.changed_by_role)}{item.changed_by_company ? ` • ${item.changed_by_company}` : ""}</p>
                        </td>
                        <td className="px-4 py-3.5"><Borrower item={item} /></td>
                        <td className="px-4 py-3.5 w-full max-w-0 min-w-[240px]">
                          <p className="font-medium text-slate-800 break-words">{summarize(item)}</p>
                          {item.notes && item.old_status !== item.new_status && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 break-words" title={item.notes}>{item.notes}</p>}
                        </td>
                        <td className="pl-4 pr-6 py-3.5 text-right whitespace-nowrap"><ViewLink id={item.id} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="xl:hidden divide-y divide-slate-100">
              {data.map((item) => (
                <li key={item.id} className="px-4 sm:px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">{formatDate(item.changed_at)}</span>
                    <ViewLink id={item.id} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 break-words">{summarize(item)}</p>
                    {item.notes && item.old_status !== item.new_status && <p className="text-xs text-slate-400 mt-0.5 break-words">{item.notes}</p>}
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 pt-1">
                    <Borrower item={item} />
                    <div className="min-w-0 sm:text-right">
                      <p className="text-sm font-semibold text-slate-700 truncate">{item.changed_by_email}</p>
                      <p className="text-xs text-slate-400 capitalize">{roleLabel(item.changed_by_role)}{item.changed_by_company ? ` • ${item.changed_by_company}` : ""}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Pagination controls */}
      {pagination && (pagination.has_next || pagination.has_prev) && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl ring-1 ring-slate-200 shadow-sm">
          <Button
            variant="outline"
            disabled={!pagination.has_prev}
            onClick={() => setPage(page - 1)}
            className="rounded-xl border-slate-200"
          >
            Previous
          </Button>
          <span className="text-sm font-semibold text-slate-600">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            disabled={!pagination.has_next}
            onClick={() => setPage(page + 1)}
            className="rounded-xl border-slate-200"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
