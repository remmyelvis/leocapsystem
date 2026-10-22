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

// Whole shillings throughout the dashboard so figures scan quickly; the loan pages show the cents.
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

  // Row one: the money. Row two: the health of the book. Four cards per row on desktop (the last cell is the period note).
  const stats = [
    { label: "Total Disbursed", value: KES0.format(kpis?.total_disbursed_amount || 0), icon: Banknote },
    { label: "Outstanding", value: KES0.format(kpis?.total_outstanding || 0), icon: AlertTriangle },
    { label: "Interest Income", value: KES0.format(kpis?.interest_income || 0), icon: TrendingUp },
    { label: "Fee Revenue", value: KES0.format(kpis?.revenue_from_fees || 0), icon: Banknote },
    { label: "Applications", value: kpis?.total_applications || 0, icon: FileText },
    { label: "Overdue", value: kpis?.overdue_count || 0, icon: Clock },
    { label: "Repayment Rate", value: `${(kpis?.repayment_rate_pct || 0).toFixed(1)}%`, icon: CheckCircle },
  ];

  const periodNote =
    monthFilter === "all"
      ? "All-time figures"
      : (() => {
          const [yr, mo] = monthFilter.split('-');
          return new Date(parseInt(yr), parseInt(mo) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        })();

  const rowActions = (app: any) => (
    <>
      {app.loan_status === 'pending_processing' && (
        <>
          <button onClick={() => handleAction(app.id, 'approve')} className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md hover:bg-emerald-200">Approve</button>
          <button onClick={() => handleAction(app.id, 'reject')} className="text-[11px] font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-md hover:bg-red-200">Reject</button>
        </>
      )}
      {app.loan_status === 'approved' && (
        <Link to={`/admin/applications/${app.id}`} className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md hover:bg-blue-200 inline-block">Disburse</Link>
      )}
      {app.loan_status === 'disbursed' && (
        <button onClick={() => handleAction(app.id, 'paid')} className="text-[11px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-md hover:bg-green-200">Mark Paid</button>
      )}
    </>
  );

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 min-h-full">
      {/* Slim header strip: greeting + date on the left, period and refresh on the right */}
      <div className="bg-slate-900 rounded-xl px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight truncate max-sm:!text-base max-sm:!leading-tight">Welcome back, {session?.user?.name ?? "Admin"}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Period"
            className="flex-1 sm:flex-none sm:w-auto bg-white/10 border border-white/15 text-white text-[11px] font-medium pl-2 pr-1 py-1 rounded-md outline-none focus:ring-2 focus:ring-white/30 [&>option]:text-slate-900"
          >
            <option value="all">All Time</option>
            {availableMonths.map((m) => {
              const [year, month] = m.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1);
              const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
              return <option key={m} value={m}>{label}</option>;
            })}
          </select>
          <button onClick={fetchData} disabled={isLoading} aria-label="Refresh" title="Refresh" className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/15 text-white p-1.5 rounded-md transition-colors disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* KPI cards: compact, label above value */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[62px] rounded-lg" />)
          : (
            <>
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
                    <Icon className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  </div>
                  <p className="font-bold text-slate-900 mt-0.5 break-normal tabular-nums text-[clamp(1.05rem,4.6vw,1.3rem)] leading-tight">{value}</p>
                </div>
              ))}
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5 flex flex-col justify-center">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Showing</p>
                <p className="text-sm font-semibold text-slate-600 leading-tight mt-0.5">{periodNote}</p>
              </div>
            </>
          )}
      </div>

      {/* Distributions */}
      {!loading && kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm ring-1 ring-slate-200">
            <h3 className="max-sm:!text-[11px] max-sm:!leading-4 text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Loans by status</h3>
            <div className="divide-y divide-slate-100">
              {Object.entries(kpis.loans_by_status || {}).map(([status, count]) => (
                <Link to={`/admin/applications?status=${status}`} key={status} className="flex justify-between gap-3 text-[13px] text-slate-600 py-1 px-2 -mx-2 rounded-md hover:bg-slate-50 hover:text-brand-blue transition-colors">
                  <span className="capitalize">{status.replace(/_/g, ' ')}</span><span className="font-bold text-slate-800 tabular-nums">{count as number}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white px-4 py-3 rounded-lg shadow-sm ring-1 ring-slate-200">
            <h3 className="max-sm:!text-[11px] max-sm:!leading-4 text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Loans by company</h3>
            <div className="divide-y divide-slate-100">
              {(kpis.loans_by_company || []).map((c: any) => (
                <Link to={`/admin/applications?company=${c.company}`} key={c.company} className="flex justify-between gap-3 text-[13px] text-slate-600 py-1 px-2 -mx-2 rounded-md hover:bg-slate-50 hover:text-brand-blue transition-colors">
                  <span className="capitalize">{c.company}</span>
                  <span className="text-right tabular-nums"><span className="font-bold text-slate-800">{c.count}</span> <span className="text-slate-400">· {KES0.format(c.total_amount)}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loan Pipeline Table */}
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="max-sm:!text-[11px] max-sm:!leading-4 text-[11px] font-bold text-slate-500 uppercase tracking-wide">Loan pipeline</h3>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 font-semibold text-slate-600 focus:ring-2 focus:ring-brand-blue/20">
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
            <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 font-semibold text-slate-600 focus:ring-2 focus:ring-brand-blue/20 capitalize">
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
            <div className="hidden xl:block overflow-auto max-h-[26rem]">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 sticky top-0 shadow-sm">
                  <tr className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    <th className="py-2 px-4">Applicant</th>
                    <th className="py-2 px-4">Company</th>
                    <th className="py-2 px-4 text-right">Applied</th>
                    <th className="py-2 px-4 text-right">Disbursed</th>
                    <th className="py-2 px-4 text-right">Repayment</th>
                    <th className="py-2 px-4">Status</th>
                    <th className="py-2 px-4">Due</th>
                    <th className="py-2 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loans.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-4 font-semibold text-slate-800 max-w-[200px]"><span className="block truncate" title={formatName(app.applicant_name)}>{formatName(app.applicant_name)}</span></td>
                      <td className="py-2 px-4 text-slate-600 capitalize whitespace-nowrap">{app.company}</td>
                      <td className="py-2 px-4 text-slate-700 text-right whitespace-nowrap tabular-nums">{KES0.format(parseFloat(app.amount_applied || '0'))}</td>
                      <td className="py-2 px-4 text-slate-700 text-right whitespace-nowrap tabular-nums">{KES0.format(parseFloat(app.disbursement_amount || '0'))}</td>
                      <td className="py-2 px-4 text-slate-700 text-right whitespace-nowrap tabular-nums">{KES0.format(parseFloat(app.repayment_amount || '0'))}</td>
                      <td className="py-2 px-4 whitespace-nowrap"><span className={`px-2 py-px rounded-full text-[11px] font-semibold capitalize ${statusStyle(app.loan_status)}`}>{statusLabel(app.loan_status)}</span></td>
                      <td className="py-2 px-4 text-slate-500 whitespace-nowrap">{app.due_date ? app.due_date.substring(0, 10) : '-'}</td>
                      <td className="py-2 px-4"><div className="flex justify-end gap-2 whitespace-nowrap">{rowActions(app)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="xl:hidden divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
              {loans.map(app => (
                <li key={app.id} className="px-4 py-2.5 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800 break-words">{formatName(app.applicant_name)}</p>
                    <span className={`shrink-0 px-2 py-px rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${statusStyle(app.loan_status)}`}>{statusLabel(app.loan_status)}</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">{KES0.format(parseFloat(app.amount_applied || '0'))}</span> applied
                    {" · "}repay {KES0.format(parseFloat(app.repayment_amount || '0'))}
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
      <div className="bg-white rounded-lg shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div 
          className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-100"
          onClick={() => setShowAudit(!showAudit)}
        >
          <h3 className="max-sm:!text-[11px] max-sm:!leading-4 text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center">
            <History className="h-3.5 w-3.5 mr-2 text-purple-500" /> Audit trail viewer
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
