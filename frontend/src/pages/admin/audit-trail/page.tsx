import { useSearchParams } from "react-router-dom";
import { ShieldCheck, FileText } from "lucide-react";
import SystemLogsTab from "./SystemLogsTab";
import ApplicationChangesTab from "./ApplicationChangesTab";

const TABS = [
  { key: "system", label: "System Audit Logs", icon: ShieldCheck },
  { key: "applications", label: "Application Changes", icon: FileText },
] as const;

export default function AuditTrailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "applications" ? "applications" : "system";

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Audit Trails</h1>
        <p className="text-slate-500 text-sm mt-1">View system activity and logs.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSearchParams(key === "system" ? {} : { tab: key })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "system" ? <SystemLogsTab /> : <ApplicationChangesTab />}
    </div>
  );
}
