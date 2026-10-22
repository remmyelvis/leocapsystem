import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/contexts/AuthContext";
import { apiCall } from "@/lib/apiClient";
import { formatName } from "@/lib/formatName";
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
// KPI cards show whole shillings so the long totals fit; the tables below keep the cents.
const KES0 = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

const statusLabel = (status?: string) => (status || "—").replace(/_/g, " ");
const statusStyle = (status?: string) => (status === "disbursed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700");

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
  const [companies, setCompanies] = useState<{ code: string }[]>([]);
  
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
    apiCall<{ companies: { code: string }[] }>("/api/companies").then((res) => {
      if (res.data?.companies) setCompanies(res.data.companies);
    });
  }, []);

  useEffect(() => {
    if (isLoading) return;
    // wait for the typing to pause so each keystroke does not fire (and race) its own request
    const timer = setTimeout(fetchLoans, 300);
    return () => clearTimeout(timer);
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

  // Counts first (three wide cards), then the money figures (four cards): twelve-column grid on desktop.
  const stats = [
    { label: "Total Applications", value: kpis?.total_applications || 0, icon: FileText, span: "lg:col-span-4" },
    { label: "Overdue", value: kpis?.overdue_count || 0, icon: Clock, span: "lg:col-span-4" },
    { label: "Repayment Rate", value: `${(kpis?.repayment_rate_pct || 0).toFixed(1)}%`, icon: CheckCircle, span: "lg:col-span-4" },
    { label: "Total Disbursed", value: KES0.format(kpis?.total_disbursed_amount || 0), icon: Banknote, span: "lg:col-span-3" },
    { label: "Outstanding", value: KES0.format(kpis?.total_outstanding || 0), icon: AlertTriangle, span: "lg:col-span-3" },
    { label: "Fee Revenue", value: KES0.format(kpis?.revenue_from_fees || 0), icon: Banknote, span: "lg:col-span-3" },
    { label: "Interest Income", value: KES0.format(kpis?.interest_income || 0), icon: TrendingUp, span: "lg:col-span-3" },
  ];

  const rowActions = (app: any) => (
    <>
      {app.loan_status === 'pending_processing' && (
        <>
          <button onClick={() => handleAction(app.id, 'approve')} className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-200">Approve</button>
          <button onClick={() => handleAction(app.id, 'reject')} className="text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200">Reject</button>
        </>
      )}
      {app.loan_status === 'approved' && (
        <Link to={`/admin/applications/${app.id}`} className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-200 inline-block">Disburse</Link>
      )}
      {app.loan_status === 'disbursed' && (
        <button onClick={() => handleAction(app.id, 'paid')} className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-lg hover:bg-green-200">Mark Paid</button>
      )}
    </>
  );

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-5 min-h-full">
      {/* Welcome Banner */}
      <div className="relative bg-slate-900 rounded-xl p-5 sm:p-6 text-white overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">Welcome back,</p>
            <h1 className="text-2xl font-black">{session?.user?.name ?? "Admin"}</h1>
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
      <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        {loading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl lg:col-span-3" />)
          : stats.map(({ label, value, icon: Icon, span }) => (
            <div key={label} className={`bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-4 max-lg:last:col-span-2 ${span}`}>
              <div className="flex justify-between items-center gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                <div className="p-1.5 bg-slate-50 rounded-lg shrink-0"><Icon className="h-4 w-4 text-slate-400" /></div>
              </div>
              <p className="font-bold text-slate-900 mt-2 break-normal text-[clamp(1.125rem,5vw,1.5rem)] lg:text-xl xl:text-2xl">{value}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <div className="bg-white p-5 rounded-xl shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Loans by Status</h3>
            <div className="space-y-2">
              {Object.entries(kpis.loans_by_status || {}).map(([status, count]) => (
                <Link to={`/admin/applications?status=${status}`} key={status} className="flex justify-between gap-3 text-sm text-slate-600 border-b border-slate-100 py-1.5 px-1 hover:bg-slate-50 hover:text-brand-blue cursor-pointer transition-colors rounded -mx-1">
                  <span className="capitalize">{status.replace('_', ' ')}</span><span className="font-bold">{count as number}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm ring-1 ring-slate-200">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Loans by Company</h3>
            <div className="space-y-2">
              {(kpis.loans_by_company || []).map((c: any) => (
                <Link to={`/admin/applications?company=${c.company}`} key={c.company} className="flex justify-between gap-3 text-sm text-slate-600 border-b border-slate-100 py-1.5 px-1 hover:bg-slate-50 hover:text-brand-blue cursor-pointer transition-colors rounded -mx-1">
                  <span className="capitalize">{c.company}</span>
                  <span className="font-bold text-right">{c.count} <span className="font-medium text-slate-400">({KES0.format(c.total_amount)})</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loan Pipeline Table */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase">Loan Pipeline</h3>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-600 focus:ring-2 focus:ring-brand-blue/20">
              <option value="">All Status</option>
              <option value="pending_processing">Pending</option>
              <option value="approved">Approved</option>
              <option value="disbursed">Disbursed</option>
              <option value="rejected">Rejected</option>
              <option value="written_off">Written Off</option>
              <option value="paid">Repaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="delinquent">Delinquent</option>
              <option value="default">Defaulted</option>
            </select>
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-600 focus:ring-2 focus:ring-brand-blue/20 capitalize">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-center py-6 text-sm text-slate-500">Loading...</p>
        ) : loans.length === 0 ? (
          <p className="text-center py-6 text-sm text-slate-500">No loans found.</p>
        ) : (
          <>
            <div className="hidden xl:block overflow-auto max-h-[28rem]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 shadow-sm">
                  <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4 text-right">Applied</th>
                    <th className="py-3 px-4 text-right">Disbursed</th>
                    <th className="py-3 px-4 text-right">Repayment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Due</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loans.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-800 max-w-[200px]"><span className="block truncate" title={formatName(app.applicant_name)}>{formatName(app.applicant_name)}</span></td>
                      <td className="py-3 px-4 text-slate-600 capitalize whitespace-nowrap">{app.company}</td>
                      <td className="py-3 px-4 text-slate-700 text-right whitespace-nowrap">{KES.format(parseFloat(app.amount_applied || '0'))}</td>
                      <td className="py-3 px-4 text-slate-700 text-right whitespace-nowrap">{KES.format(parseFloat(app.disbursement_amount || '0'))}</td>
                      <td className="py-3 px-4 text-slate-700 text-right whitespace-nowrap">{KES.format(parseFloat(app.repayment_amount || '0'))}</td>
                      <td className="py-3 px-4 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusStyle(app.loan_status)}`}>{statusLabel(app.loan_status)}</span></td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{app.due_date ? app.due_date.substring(0, 10) : '-'}</td>
                      <td className="py-3 px-4"><div className="flex justify-end gap-2 whitespace-nowrap">{rowActions(app)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="xl:hidden divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
              {loans.map(app => (
                <li key={app.id} className="px-4 py-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-slate-800 break-words">{formatName(app.applicant_name)}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${statusStyle(app.loan_status)}`}>{statusLabel(app.loan_status)}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">{KES.format(parseFloat(app.amount_applied || '0'))}</span> applied
                    {" · "}repay {KES.format(parseFloat(app.repayment_amount || '0'))}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400"><span className="capitalize">{app.company}</span>{app.due_date ? ` · due ${app.due_date.substring(0, 10)}` : ""}</p>
                    <div className="flex gap-2">{rowActions(app)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Audit Trail Viewer */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div 
          className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100"
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
