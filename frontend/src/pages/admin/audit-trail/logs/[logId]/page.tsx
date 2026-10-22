import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, User, Globe, Database, Activity, AlertTriangle, RefreshCw, Copy } from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuditLog, formatAction, formatDateTime, actionStyle, METHOD_STYLES } from "../../auditLogTypes";

const KNOWN_KEYS = new Set([
  "id", "action", "description", "endpoint", "http_method", "status", "error_message",
  "actor_id", "actor_email", "actor_role", "entity_type", "entity_id",
  "old_values", "new_values", "created_at",
]);

function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
        <Icon className="h-5 w-5 text-slate-400" />
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">{children}</div>
    </div>
  );
}

function Field({ label, value, mono = false, full = false }: { label: string; value?: React.ReactNode; mono?: boolean; full?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={full ? "col-span-full" : ""}>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <div className={`text-sm text-slate-900 font-medium break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Old vs New diff table; falls back to raw JSON for non-object payloads. */
function ChangesTable({ oldValues, newValues }: { oldValues: AuditLog["old_values"]; newValues: AuditLog["new_values"] }) {
  const oldObj = oldValues && typeof oldValues === "object" ? oldValues : {};
  const newObj = newValues && typeof newValues === "object" ? newValues : {};
  const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

  if (keys.length === 0) {
    return <p className="text-sm text-slate-400">No value changes recorded for this event.</p>;
  }

  const hasOld = Object.keys(oldObj).length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-1/4">Field</th>
            {hasOld && <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Previous Value</th>}
            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">{hasOld ? "New Value" : "Value"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {keys.map((k) => {
            const o = renderValue((oldObj as any)[k]);
            const n = renderValue((newObj as any)[k]);
            const changed = hasOld && o !== n;
            return (
              <tr key={k} className="hover:bg-slate-50/50 align-top">
                <td className="px-4 py-3 font-semibold text-gray-700 capitalize">{k.replace(/_/g, " ")}</td>
                {hasOld && <td className="px-4 py-3 text-slate-500 font-mono text-xs break-all">{o}</td>}
                <td className={`px-4 py-3 font-mono text-xs break-all ${changed ? "text-blue-700 font-semibold" : "text-slate-700"}`}>{n}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditLogDetailPage() {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiCall<{ message: string; data: AuditLog }>(`/api/audit-logs/get-one/${logId}`);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      setLog(res.data?.data || null);
    }
    setLoading(false);
  }, [logId]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 w-full space-y-5 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <p className="text-slate-500">{error || "Audit log not found."}</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button onClick={() => navigate("/admin/audit-trail")} variant="outline" className="rounded-lg">Back to Audit Logs</Button>
          <Button onClick={fetchLog} className="rounded-lg bg-brand-blue hover:bg-slate-800">
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const failed = (log.status || "").toLowerCase() !== "success";
  const method = (log.http_method || "").toUpperCase();
  const extras = Object.entries(log).filter(([k, v]) => !KNOWN_KEYS.has(k) && v !== null && v !== undefined && v !== "");

  const copyId = () => {
    navigator.clipboard.writeText(log.id);
    toast.success("Log ID copied");
  };

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/admin/audit-trail")}
          className="mt-1 p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900">Audit Log Entry</h1>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${actionStyle(log.action)}`}>{formatAction(log.action)}</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full capitalize ${failed ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-red-500" : "bg-emerald-500"}`} />
              {log.status || "unknown"}
            </span>
          </div>
          <button onClick={copyId} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm mt-1 font-mono">
            ID: {log.id} <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {log.description && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
          <p className="text-sm text-slate-800">{log.description}</p>
        </div>
      )}

      {failed && log.error_message && (
        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Error Message</p>
          <p className="text-sm text-red-800 font-mono break-words">{log.error_message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Performed By" icon={User}>
          <Field label="Email" value={log.actor_email || "—"} />
          <Field label="Role" value={log.actor_role ? log.actor_role.replace(/_/g, " ").toUpperCase() : "—"} />
          <Field label="Actor ID" value={log.actor_id} mono full />
          <Field label="Date & Time" value={formatDateTime(log.created_at, true)} full />
        </Card>

        <Card title="Request" icon={Globe}>
          <Field
            label="HTTP Method"
            value={method ? <span className={`text-xs font-black px-2 py-0.5 rounded ${METHOD_STYLES[method] || "bg-slate-100 text-slate-600"}`}>{method}</span> : "—"}
          />
          <Field label="Status" value={<span className="capitalize">{log.status || "—"}</span>} />
          <Field label="Endpoint" value={log.endpoint} mono full />
          {extras.map(([k, v]) => (
            <Field key={k} label={k.replace(/_/g, " ")} value={renderValue(v)} mono={typeof v !== "string" || v.length > 40} full />
          ))}
        </Card>
      </div>

      <Card title="Affected Entity" icon={Database}>
        <Field label="Entity Type" value={log.entity_type || "—"} />
        <Field label="Entity ID" value={log.entity_id || "—"} mono />
      </Card>

      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
          <Activity className="h-5 w-5 text-slate-400" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Changes Recorded</h2>
        </div>
        <ChangesTable oldValues={log.old_values} newValues={log.new_values} />
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" /> Viewing this entry is itself recorded in the audit log.
      </p>
    </div>
  );
}
