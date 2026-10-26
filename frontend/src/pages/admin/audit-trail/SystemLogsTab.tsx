import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search, Eye, Loader2, ShieldCheck, Filter, RotateCcw, Trash2, X, AlertTriangle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw,
} from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AuditLog, AuditLogPagination, AuditLogListResponse, AuditLogFilters, EMPTY_FILTERS,
  DEFAULT_ACTIONS, HTTP_METHODS, ACTOR_ROLES, PAGE_SIZES, METHOD_STYLES,
  formatAction, formatRole, formatDateTime, actionStyle, buildQuery,
} from "./auditLogTypes";
import { Tip } from "@/components/ui/tooltip";
import { SortHeader, SortSelect, type SortSpecs, type SortState } from "@/components/ui/sortable";

// Newest first by default; oldest first reads an incident from the start. The server orders the pages (?order=).
const DATE_SORT: SortSpecs<"date"> = { date: { label: "Date", first: "desc", asc: "Oldest first", desc: "Newest first" } };

const inputCls =
  "w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors";
const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

export default function SystemLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<AuditLogPagination | null>(null);
  const [loading, setLoading] = useState(true);

  // Draft filters (form) vs applied filters (sent to API). Each fetch is itself
  // recorded as a VIEW audit entry by the backend, so we only fetch on "Apply".
  const [draft, setDraft] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // the search text once typing has paused; the server does the searching
  const actions = DEFAULT_ACTIONS;
  const [refreshKey, setRefreshKey] = useState(0);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const dateSort: SortState<"date"> = { key: "date", dir: order };
  const changeOrder = (s: SortState<"date">) => {
    setOrder(s.dir);
    setPage(1);
  };

  const [showDelete, setShowDelete] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const qs = buildQuery({ ...applied, q: query, page, page_size: pageSize, order });
    const res = await apiCall<AuditLogListResponse>(`/api/audit-logs/get-all?${qs}`);
    if (res.error) {
      toast.error(res.error);
      setLogs([]);
      setPagination(null);
    } else if (res.data) {
      setLogs(res.data.data || []);
      setPagination(res.data.pagination || null);
    }
    setLoading(false);
  }, [applied, query, page, pageSize, order]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const applyFilters = () => {
    if (draft.start_date && draft.end_date && draft.start_date > draft.end_date) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setPage(1);
    setApplied({ ...draft });
  };

  const resetFilters = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setSearch("");
    setQuery("");
    setPage(1);
  };

  const activeFilterCount = Object.values(applied).filter(Boolean).length + (query ? 1 : 0);

  const visibleLogs = logs;

  const totalPages = pagination?.total_pages || 1;
  const from = pagination && pagination.total_records > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.page_size, pagination.total_records) : 0;

  return (
    <div className="w-full space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-[13px]"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Purge by Date
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className={labelCls}>From</label>
            <input type="date" className={inputCls} value={draft.start_date}
              onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input type="date" className={inputCls} value={draft.end_date}
              onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Action</label>
            <select className={inputCls} value={draft.action}
              onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
              <option value="">All actions</option>
              {actions.map((a) => <option key={a} value={a}>{formatAction(a)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>HTTP Method</label>
            <select className={inputCls} value={draft.http_method}
              onChange={(e) => setDraft({ ...draft, http_method: e.target.value })}>
              <option value="">All</option>
              {HTTP_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Actor Role</label>
            <select className={inputCls} value={draft.actor_role}
              onChange={(e) => setDraft({ ...draft, actor_role: e.target.value })}>
              <option value="">All roles</option>
              {ACTOR_ROLES.map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search: what happened, who, endpoint, loan ID…"
              className={`${inputCls} pl-10`}
            />
          </div>
          <div className="flex gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
            <Button variant="outline" onClick={resetFilters} className="rounded-lg border-slate-200">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </Button>
            <Button onClick={applyFilters} className="rounded-lg bg-brand-blue hover:bg-slate-800">
              <Filter className="h-4 w-4 mr-1.5" /> Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 whitespace-nowrap">System Audit Logs</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {pagination ? `${pagination.total_records.toLocaleString()} record${pagination.total_records !== 1 ? "s" : ""}` : ""}
            </span>
            <Tip label="Refresh">
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                aria-label="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </Tip>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No audit logs found for the selected filters.
          </div>
        ) : (
          <>
            {/* Wide screens (xl): a table. Narrower ones get cards below, because six columns do not fit and the description matters most. */}
            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <SortHeader specs={DATE_SORT} col="date" sort={dateSort} onSort={changeOrder} className="pl-6 pr-4 text-left text-[11px] font-bold" />
                    <th className={thCls}>Actor</th>
                    <th className={thCls}>Action</th>
                    <th className={thCls}>What happened</th>
                    <th className={thCls}>Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleLogs.map((log) => {
                    const failed = (log.status || "").toLowerCase() !== "success";
                    const [day, time] = formatDateTime(log.created_at).split(", ");
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="pl-6 pr-4 py-2.5 whitespace-nowrap">
                          <p className="text-xs font-semibold text-slate-700">{day}</p>
                          {time && <p className="text-xs text-slate-400">{time}</p>}
                        </td>
                        <td className="px-4 py-2.5">
                          <Tip label={log.actor_email || log.actor_id} whenClipped><p className="font-semibold text-slate-800 truncate max-w-[180px] 2xl:max-w-[260px]">
                            {log.actor_email || log.actor_id || "Unknown"}
                          </p></Tip>
                          <p className="text-xs text-slate-400 capitalize">{formatRole(log.actor_role)}</p>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${actionStyle(log.action)}`}>
                            {formatAction(log.action)}
                          </span>
                          {log.entity_type && <p className="text-[11px] text-slate-400 mt-1">{log.entity_type}</p>}
                        </td>
                        <td className="px-4 py-2.5 w-full max-w-0 min-w-[260px] text-slate-700">
                          <Tip label={log.description} whenClipped><p className="line-clamp-3 break-words">{log.description || "—"}</p></Tip>
                          <Endpoint log={log} />
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><StatusBadge failed={failed} status={log.status} /></td>
                        <td className="pl-4 pr-6 py-2.5 text-right whitespace-nowrap"><ViewLink id={log.id} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="xl:hidden flex justify-end border-b border-slate-100 px-4 py-2">
              <SortSelect specs={DATE_SORT} sort={dateSort} onSort={changeOrder} label="Sort logs" />
            </div>
            <ul className="xl:hidden divide-y divide-slate-100">
              {visibleLogs.map((log) => {
                const failed = (log.status || "").toLowerCase() !== "success";
                return (
                  <li key={log.id} className="px-4 sm:px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                      <StatusBadge failed={failed} status={log.status} />
                    </div>
                    <p className="text-sm font-medium text-slate-800 break-words">{log.description || "—"}</p>
                    <Endpoint log={log} />
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{log.actor_email || log.actor_id || "Unknown"}</p>
                        <p className="text-xs text-slate-400 capitalize">{formatRole(log.actor_role)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${actionStyle(log.action)}`}>{formatAction(log.action)}</span>
                        <ViewLink id={log.id} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_records > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-lg ring-1 ring-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>
              Showing <b>{from.toLocaleString()}</b>–<b>{to.toLocaleString()}</b> of <b>{pagination.total_records.toLocaleString()}</b>
            </span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={!pagination.has_prev} onClick={() => setPage(1)} className="rounded-lg border-slate-200">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.has_prev} onClick={() => setPage(page - 1)} className="rounded-lg border-slate-200">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-sm font-semibold text-slate-600">
              Page {pagination.page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setPage(page + 1)} className="rounded-lg border-slate-200">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setPage(totalPages)} className="rounded-lg border-slate-200">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {showDelete && (
        <DeleteByDateModal
          onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); setPage(1); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}

const thCls = "text-left px-4 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap";

// "POST /api/applications/bulk/paid": the technical detail, kept small under the description so it never takes a column.
function Endpoint({ log }: { log: AuditLog }) {
  const method = (log.http_method || "").toUpperCase();
  if (!method && !log.endpoint) return null;
  if (log.endpoint && (log.description || "").includes(log.endpoint.replace(/^\/api\//, ""))) return null; // the description already shows the path
  return (
    <div className="flex items-center gap-2 mt-1 min-w-0">
      {method && <span className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded ${METHOD_STYLES[method] || "bg-slate-100 text-slate-600"}`}>{method}</span>}
      {log.endpoint && <Tip label={log.endpoint} whenClipped><span className="font-mono text-[11px] text-slate-400 truncate">{log.endpoint}</span></Tip>}
    </div>
  );
}

function StatusBadge({ failed, status }: { failed: boolean; status?: string | null }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-red-500" : "bg-emerald-500"}`} />
      {status || "—"}
    </span>
  );
}

function ViewLink({ id }: { id: string }) {
  return (
    <Link to={`/admin/audit-trail/logs/${id}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-brand-blue transition-colors whitespace-nowrap">
      <Eye className="h-4 w-4" /> View
    </Link>
  );
}

function DeleteByDateModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = startDate && endDate && startDate <= endDate && confirmText === "DELETE";

  const handleDelete = async () => {
    if (!valid) return;
    setSubmitting(true);
    const res = await apiCall<{ message: string; deleted_count: number }>(
      `/api/audit-logs/delete-by-date?${buildQuery({ start_date: startDate, end_date: endDate })}`,
      { method: "DELETE", body: { start_date: startDate, end_date: endDate } }
    );
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(res.data?.message || "Audit logs deleted");
    onDeleted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-4 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Purge Audit Logs</h3>
              <p className="text-xs text-slate-500">This permanently deletes logs in the selected range.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>From</label>
            <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>To</label>
            <input type="date" className={inputCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        {startDate && endDate && startDate > endDate && (
          <p className="text-xs text-red-600">Start date cannot be after end date.</p>
        )}

        <div>
          <label className={labelCls}>Type DELETE to confirm</label>
          <input className={inputCls} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-lg border-slate-200">Cancel</Button>
          <Button onClick={handleDelete} disabled={!valid || submitting} className="rounded-lg bg-red-600 hover:bg-red-700 text-white">
            {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
            Delete Logs
          </Button>
        </div>
      </div>
    </div>
  );
}
