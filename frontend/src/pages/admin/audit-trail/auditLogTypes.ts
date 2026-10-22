// Types & helpers for the System Audit Logs endpoints (/api/audit-logs/*)

export interface AuditLog {
  id: string;
  action: string;
  description: string | null;
  endpoint: string | null;
  http_method: string | null;
  status: string | null;
  error_message: string | null;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string | null;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  // Any extra fields returned by AuditLog.to_dict() (ip_address, user_agent, ...)
  [key: string]: unknown;
}

export interface AuditLogPagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_records: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface AuditLogListResponse {
  message: string;
  data: AuditLog[];
  pagination: AuditLogPagination;
}

export interface AuditLogFilters {
  start_date: string;
  end_date: string;
  status: string;
  action: string;
  http_method: string;
  actor_role: string;
}

export const EMPTY_FILTERS: AuditLogFilters = {
  start_date: "",
  end_date: "",
  status: "",
  action: "",
  http_method: "",
  actor_role: "",
};

// The values the backend accepts for "action".
export const DEFAULT_ACTIONS = ["create", "update", "delete", "login", "export", "view", "logout", "other"];
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
export const ACTOR_ROLES = ["admin", "super_admin", "hr", "finance", "applicant"];
export const PAGE_SIZES = [10, 25, 50, 100];

// One wording for a role everywhere in the audit trail: "Admin", "Super Admin", "HR", "Finance", "Applicant".
export function formatRole(role?: string | null) {
  if (!role) return "—";
  return role.replace(/_/g, " ").split(" ").map((w) => (w.toLowerCase() === "hr" ? "HR" : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(" ");
}

export function formatAction(action?: string | null) {
  if (!action) return "—";
  // Handles both "update" and enum-style "AuditAction.UPDATE"
  const clean = action.includes(".") ? action.split(".").pop()! : action;
  return clean.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDateTime(value?: string | null, long = false) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString(
    "en-GB",
    long
      ? { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }
      : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
  );
}

export const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-amber-50 text-amber-700",
  delete: "bg-red-50 text-red-700",
  view: "bg-slate-100 text-slate-700",
  login: "bg-blue-50 text-blue-700",
  logout: "bg-indigo-50 text-indigo-700",
  export: "bg-cyan-50 text-cyan-700",
};

export const METHOD_STYLES: Record<string, string> = {
  GET: "text-sky-700 bg-sky-50",
  POST: "text-emerald-700 bg-emerald-50",
  PUT: "text-amber-700 bg-amber-50",
  PATCH: "text-amber-700 bg-amber-50",
  DELETE: "text-red-700 bg-red-50",
};

export function actionStyle(action?: string | null) {
  const key = (action || "").split(".").pop()!.toLowerCase();
  return ACTION_STYLES[key] || "bg-violet-50 text-violet-700";
}

export function buildQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.append(k, String(v));
  });
  return qs.toString();
}
