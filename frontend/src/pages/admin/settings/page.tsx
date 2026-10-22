import { useState } from "react";
import { Settings, Shield, User, History } from "lucide-react";
import ManageAdmins from "../manage-admins/page";
import AuditTrail from "../audit-trail/page";
import ProfilePage from "../profile/page";

// Dummy settings component for the actual "Settings" tab content
function GeneralSettings() {
  return (
    <div className="bg-white rounded-lg ring-1 ring-slate-900/5 shadow-sm p-4">
      <h2 className="text-[13px] font-bold text-slate-900 mb-3">System Settings</h2>
      <div className="space-y-3 max-w-md">
        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1">Company Name</label>
          <input type="text" defaultValue="LeoCap Invest" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-[13px]" />
        </div>
        <div>
          <label className="block text-[13px] font-medium text-slate-700 mb-1">Support Email</label>
          <input type="email" defaultValue="support@leocap.com" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-[13px]" />
        </div>
        <button className="px-3 py-1.5 bg-brand-blue hover:bg-slate-800 text-white text-[13px] font-medium rounded-lg transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default function UnifiedSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", label: "My Profile", icon: User },
    { id: "manage-admins", label: "Manage Admins", icon: Shield },
    { id: "audit-trail", label: "Audit Trail", icon: History },
    { id: "general", label: "General Settings", icon: Settings },
  ];

  return (
    <div className="p-4 sm:p-6 w-full space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand-blue" /> Admin Control Panel
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5">Manage system configurations, administrators, and view audit logs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-fit max-w-full gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-blue shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content: the embedded pages bring their own page padding, which this wrapper cancels so it is not doubled */}
      {activeTab === "general" ? <GeneralSettings /> : (
        <div className="[&>div]:!p-0 [&>div]:!max-w-none">
          {activeTab === "profile" && <ProfilePage embedded />}
          {activeTab === "manage-admins" && <ManageAdmins embedded />}
          {activeTab === "audit-trail" && <AuditTrail embedded />}
        </div>
      )}
    </div>
  );
}
