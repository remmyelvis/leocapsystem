import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/contexts/AuthContext";
import { apiCall } from "@/lib/apiClient";
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  History,
  TrendingUp,
} from "lucide-react";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminDashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [kpis, setKpis] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [auditTrails, setAuditTrails] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Pipeline
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  
  // Time Series Filter
  const [monthFilter, setMonthFilter] = useState("all");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  // Toggle for Audit Trail
  const [showAudit, setShowAudit] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch KPIs
      let kpiUrl = "/api/dashboard/kpis";
      if (monthFilter && monthFilter !== "all") kpiUrl += `?month=${monthFilter}`;
      
      const kpiRes = await apiCall<any>(kpiUrl);
      if (!kpiRes.error && kpiRes.data) {
        setKpis(kpiRes.data);
        if (kpiRes.data.available_months) {
          setAvailableMonths(kpiRes.data.available_months);
        }
      }

      // Fetch Audit Trails
      const auditRes = await apiCall<any>("/api/applications/audit-trails");
      if (!auditRes.error && auditRes.data?.data) {
        setAuditTrails(auditRes.data.data);
      }
      
      await fetchLoans();
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoans = async () => {
    let url = "/api/dashboard/loans";
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (companyFilter) params.append("company", companyFilter);
    if (params.toString()) url += `?${params.toString()}`;

    const loanRes = await apiCall<any>(url);
    if (!loanRes.error && (loanRes.data?.loans || loanRes.data?.applications)) {
      setLoans(loanRes.data?.loans || loanRes.data?.applications || []);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthFilter]);

  useEffect(() => {
    if (!isLoading) {
      fetchLoans();
    }
  }, [statusFilter, companyFilter]);

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await apiCall(`/api/applications/${action}/${id}`, { method: "PATCH" });
      if (!res.error) {
        fetchData();
      } else {
        alert(res.error || "Action failed");
      }
    } catch (err) {
      alert("An error occurred");
    }
  };

  const loading = sessionStatus === "loading" || isLoading;
  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats = [
    { label: "Total Applications", value: kpis?.total_applications || 0, icon: FileText, gradient: "from-blue-600 to-blue-800" },
    { label: "Total Disbursed", value: KES.format(kpis?.total_disbursed_amount || 0), icon: Banknote, gradient: "from-emerald-500 to-emerald-700" },
    { label: "Outstanding", value: KES.format(kpis?.total_outstanding || 0), icon: AlertTriangle, gradient: "from-amber-400 to-amber-600" },
    { label: "Repayment Rate", value: `${(kpis?.repayment_rate_pct || 0).toFixed(1)}%`, icon: CheckCircle, gradient: "from-emerald-400 to-emerald-600" },
    { label: "Overdue", value: kpis?.overdue_count || 0, icon: Clock, gradient: "from-red-500 to-red-700" },
    { label: "Fee Revenue", value: KES.format(kpis?.revenue_from_fees || 0), icon: Banknote, gradient: "from-purple-500 to-purple-700" },
    { label: "Interest Income", value: KES.format(kpis?.interest_income || 0), icon: TrendingUp, gradient: "from-teal-500 to-teal-700" },
  ];

  return (
    <div className="p-6 w-full space-y-6 bg-slate-50 min-h-full">
      {/* Welcome Banner */}
      <div className="relative bg-slate-900 rounded-xl p-6 sm:p-8 text-white overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">Welcome back,</p>
            <h1 className="text-2xl sm:text-3xl font-black">{session?.user?.name ?? "Admin"}</h1>
            <p className="text-slate-400/80 text-sm mt-1">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-white/30 [&>option]:text-slate-900"
            >
              <option value="all">All Time</option>
              {availableMonths.map((m) => {
                const [year, month] = m.split('-');
                const date = new Date(parseInt(year), parseInt(month) - 1);
                const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
            <button onClick={fetchData} disabled={isLoading} className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-xl transition-colors disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          : stats.map(({ label, value, icon: Icon, gradient }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <div className="p-2 bg-slate-50 rounded-lg"><Icon className="h-4 w-4 text-slate-400" /></div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-3">{value}</p>
            </div>
          ))}
      </div>

      {/* Period label */}
      {!loading && (
        <p className="text-xs text-slate-400 -mt-2 font-medium">
          {monthFilter === "all"
            ? "Showing all-time aggregated figures."
            : (() => {
                const [yr, mo] = monthFilter.split('-');
                const d = new Date(parseInt(yr), parseInt(mo) - 1);
                return `Showing figures for ${d.toLocaleString('default', { month: 'long', year: 'numeric' })}.`;
              })()}
        </p>
      )}

      {/* Distributions */}
      {!loading && kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-xl shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Loans by Status</h3>
            <div className="space-y-2">
              {Object.entries(kpis.loans_by_status || {}).map(([status, count]) => (
                <Link to={`/admin/applications?status=${status}`} key={status} className="flex justify-between text-xs text-slate-600 border-b border-slate-100 pb-1 hover:bg-slate-50 hover:text-brand-blue cursor-pointer transition-colors p-1 rounded -mx-1">
                  <span className="capitalize">{status.replace('_', ' ')}</span><span className="font-bold">{count as number}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Loans by Company</h3>
            <div className="space-y-2">
              {(kpis.loans_by_company || []).map((c: any) => (
                <Link to={`/admin/applications?company=${c.company}`} key={c.company} className="flex justify-between text-xs text-slate-600 border-b border-slate-100 pb-1 hover:bg-slate-50 hover:text-brand-blue cursor-pointer transition-colors p-1 rounded -mx-1">
                  <span className="capitalize">{c.company}</span>
                  <span className="font-bold">{c.count} ({KES.format(c.total_amount)})</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loan Pipeline Table */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase">Loan Pipeline</h3>
          <div className="flex space-x-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-600 focus:ring-2 focus:ring-brand-blue/20">
              <option value="">All Status</option>
              <option value="pending_processing">Pending</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="paid">Paid</option>
              <option value="default">Default</option>
              <option value="rejected">Rejected</option>
            </select>
            <input type="text" placeholder="Company..." value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-600 focus:ring-2 focus:ring-brand-blue/20" />
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 shadow-sm">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider tracking-wider">
                <th className="py-3 px-4 font-bold text-slate-500">Applicant</th>
                <th className="py-3 px-4 font-bold text-slate-500">Company</th>
                <th className="py-3 px-4 font-bold text-slate-500 text-right">Applied</th>
                <th className="py-3 px-4 font-bold text-slate-500 text-right">Disbursed</th>
                <th className="py-3 px-4 font-bold text-slate-500 text-right">Repayment</th>
                <th className="py-3 px-4 font-bold text-slate-500">Status</th>
                <th className="py-3 px-4 font-bold text-slate-500">Due Date</th>
                <th className="py-3 px-4 font-bold text-slate-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-4 text-slate-500">Loading...</td></tr>
              ) : loans.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-4 text-slate-500">No loans found.</td></tr>
              ) : (
                loans.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-500 font-semibold">{app.applicant_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-500 capitalize">{app.company}</td>
                    <td className="py-3 px-4 font-bold text-slate-500 text-right">{KES.format(parseFloat(app.amount_applied || '0'))}</td>
                    <td className="py-3 px-4 font-bold text-slate-500 text-right">{KES.format(parseFloat(app.disbursement_amount || '0'))}</td>
                    <td className="py-3 px-4 font-bold text-slate-500 text-right">{KES.format(parseFloat(app.repayment_amount || '0'))}</td>
                    <td className="py-3 px-4 font-bold text-slate-500">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${app.loan_status === 'disbursed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-gray-700'}`}>
                        {app.loan_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-500">{app.due_date ? app.due_date.substring(0, 10) : '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-500 text-center flex justify-center gap-2">
                      {app.loan_status === 'pending_processing' && (
                        <>
                          <button onClick={() => handleAction(app.id, 'approve')} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200">Approve</button>
                          <button onClick={() => handleAction(app.id, 'reject')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Reject</button>
                        </>
                      )}
                      {app.loan_status === 'approved' && (
                        <Link to={`/admin/applications/${app.id}`} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 inline-block">Disburse</Link>
                      )}
                      {app.loan_status === 'disbursed' && (
                        <button onClick={() => handleAction(app.id, 'paid')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Viewer */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div 
          className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100"
          onClick={() => setShowAudit(!showAudit)}
        >
          <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center">
            <History className="h-4 w-4 mr-2 text-purple-600" /> Audit Trail Viewer
          </h3>
          <span className="text-xs text-slate-500">{showAudit ? 'Hide' : 'Show'}</span>
        </div>
        {showAudit && (
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0 shadow-sm">
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider tracking-wider">
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Changed By</th>
                  <th className="py-2 px-4">Field</th>
                  <th className="py-2 px-4">Old Status</th>
                  <th className="py-2 px-4">New Status</th>
                  <th className="py-2 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditTrails.map((log: any, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-4">{log.changed_at.substring(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 px-4">{log.changed_by_email}</td>
                    <td className="py-2 px-4">{log.field_name}</td>
                    <td className="py-2 px-4 text-slate-500">{log.old_status}</td>
                    <td className="py-2 px-4 font-semibold">{log.new_status}</td>
                    <td className="py-2 px-4 text-[10px] text-slate-400">{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
