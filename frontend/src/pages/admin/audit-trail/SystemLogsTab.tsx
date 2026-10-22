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
  formatAction, formatDateTime, actionStyle, buildQuery,
} from "./auditLogTypes";

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors";
const labelCls = "block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1";

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

  const [showDelete, setShowDelete] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const qs = buildQuery({ ...applied, q: query, page, page_size: pageSize });
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
  }, [applied, query, page, pageSize]);

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
    <div className="w-full space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-black text-slate-900">Filters</h2>
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
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Purge by Date
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
          <div>
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
          <div>
            <label className={labelCls}>Actor Role</label>
            <select className={inputCls} value={draft.actor_role}
              onChange={(e) => setDraft({ ...draft, actor_role: e.target.value })}>
              <option value="">All roles</option>
              {ACTOR_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search everything: what happened, who, endpoint, loan or applicant ID…"
              className={`${inputCls} pl-10`}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilters} className="rounded-xl border-slate-200">
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </Button>
            <Button onClick={applyFilters} className="rounded-xl bg-brand-blue hover:bg-slate-800">
              <Filter className="h-4 w-4 mr-1.5" /> Apply Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-black text-slate-900">System Audit Logs</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {pagination ? `${pagination.total_records.toLocaleString()} total record${pagination.total_records !== 1 ? "s" : ""}` : ""}
            </span>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Actor</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Endpoint</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleLogs.map((log) => {
                  const failed = (log.status || "").toLowerCase() !== "success";
                  const method = (log.http_method || "").toUpperCase();
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-800 truncate max-w-[200px]">{log.actor_email || log.actor_id || "Unknown"}</p>
                        <p className="text-xs text-slate-400 capitalize">{log.actor_role?.replace(/_/g, " ") || "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${actionStyle(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                        {log.entity_type && <p className="text-[11px] text-slate-400 mt-1">{log.entity_type}</p>}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell text-slate-600 max-w-[360px]">
                        <p className="line-clamp-2">{log.description || "—"}</p>
                      </td>
                      <td className="px-4 py-4 hidden xl:table-cell">
                        <div className="flex items-center gap-2">
                          {method && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${METHOD_STYLES[method] || "bg-slate-100 text-slate-600"}`}>
                              {method}
                            </span>
                          )}
                          <span className="font-mono text-xs text-slate-500 truncate max-w-[220px]" title={log.endpoint || ""}>
                            {log.endpoint || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-red-500" : "bg-emerald-500"}`} />
                          {log.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/admin/audit-trail/logs/${log.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-brand-blue transition-colors"
                        >
                          <Eye className="h-4 w-4" /> View
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
      {pagination && pagination.total_records > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-4 rounded-xl ring-1 ring-slate-200 shadow-sm">
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Purge Audit Logs</h3>
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
          <Button variant="outline" onClick={onClose} className="rounded-xl border-slate-200">Cancel</Button>
          <Button onClick={handleDelete} disabled={!valid || submitting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
            {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
            Delete Logs
          </Button>
        </div>
      </div>
    </div>
  );
}
