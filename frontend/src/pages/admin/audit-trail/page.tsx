import { useSearchParams } from "react-router-dom";
import { ShieldCheck, FileText } from "lucide-react";
import SystemLogsTab from "./SystemLogsTab";
import ApplicationChangesTab from "./ApplicationChangesTab";

const TABS = [
  { key: "system", label: "System Audit Logs", icon: ShieldCheck },
  { key: "applications", label: "Application Changes", icon: FileText },
] as const;

export default function AuditTrailPage({ embedded = false }: { embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "applications" ? "applications" : "system";

  return (
    <div className="p-4 sm:p-6 w-full space-y-4">
      {/* Header (the Admin Control Panel already has one) */}
      {!embedded && (
        <div>
          <h1 className="text-lg font-bold text-slate-900">Audit Trails</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">View system activity and logs.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-full sm:w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSearchParams(key === "system" ? {} : { tab: key })}
            className={`flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-bold whitespace-nowrap transition-colors ${
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "system" ? <SystemLogsTab /> : <ApplicationChangesTab />}
    </div>
  );
}
