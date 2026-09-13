import { useState } from "react";
import { Settings, Shield, User, History } from "lucide-react";
import ManageAdmins from "../manage-admins/page";
import AuditTrail from "../audit-trail/page";
import ProfilePage from "../profile/page";

// Dummy settings component for the actual "Settings" tab content
function GeneralSettings() {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-8">
      <h2 className="text-lg font-bold text-slate-900 mb-6">System Settings</h2>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
          <input type="text" defaultValue="LeoCap Invest" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Support Email</label>
          <input type="email" defaultValue="support@leocap.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 text-sm" />
        </div>
        <button className="px-4 py-2 bg-brand-blue hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors">
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
    <div className="p-6 w-full space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-brand-blue" /> Admin Control Panel
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage system configurations, administrators, and view audit logs.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-slate-50 p-1 rounded-xl w-max gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-blue shadow-sm ring-1 ring-slate-900/5"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "profile" && <div className="mt-[-24px]"><ProfilePage /></div>}
        {activeTab === "manage-admins" && <div className="mt-[-24px]"><ManageAdmins /></div>}
        {activeTab === "audit-trail" && <div className="mt-[-24px]"><AuditTrail /></div>}
        {activeTab === "general" && <GeneralSettings />}
      </div>
    </div>
  );
}
