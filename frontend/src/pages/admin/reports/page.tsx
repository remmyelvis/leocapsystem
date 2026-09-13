import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, AlertTriangle, DollarSign, Users, TrendingUp, XCircle, Download, Clock, RefreshCw, LayoutList } from "lucide-react";
import { apiCall, downloadFile } from "@/lib/apiClient";

interface ApplicationRecord {
  id: string;
  company: string;
  created_at: string;
  loan_type: string;
  amount_applied: string;
  disbursement_amount: string;
  repayment_amount: string;
  loan_status: string;
  repayment_status: string;
  [key: string]: any;
}

export default function ReportsPage() {
  const [data, setData] = useState<ApplicationRecord[]>([]);
  const [advanceData, setAdvanceData] = useState({ total_applied: 0, total_disbursed: 0, total_repayment: 0 });
  const [personalData, setPersonalData] = useState({ total_applied: 0, total_disbursed: 0, total_repayment: 0 });
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total_records: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Aging Report
  const [agingData, setAgingData] = useState<any>(null);

  // Filters
  const [loanType, setLoanType] = useState<string>("all");
  const [company, setCompany] = useState<string>("all");
  const [loanStatus, setLoanStatus] = useState<string>("all");
  const [repayment, setRepayment] = useState<string>("all");
  const [month, setMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadCompany, setDownloadCompany] = useState("");
  const [companies, setCompanies] = useState<{name: string, code: string}[]>([]);

  const fetchReports = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("page_size", "10");

      if (loanType !== "all") params.append("loan_type", loanType);
      if (company !== "all") params.append("company", company);
      if (loanStatus !== "all") params.append("loan_status", loanStatus);
      if (repayment !== "all") params.append("repayment_status", repayment);
      if (month !== "all") params.append("month", month);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await apiCall<any>(`/api/reports/applications/get-all?${params.toString()}`);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      if (res.data) {
        setData(res.data.data);
        if (res.data.advance_data) setAdvanceData(res.data.advance_data);
        if (res.data.personal_data) setPersonalData(res.data.personal_data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await apiCall<{companies: {name: string, code: string}[]}>("/api/companies");
      if (res.data?.companies) {
        setCompanies(res.data.companies);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAging = async () => {
    const compTarget = company !== "all" ? company : "nakama";
    try {
      const res = await apiCall<any>(`/api/reports/aging/${compTarget}`);
      if (res.data && res.data.aging_buckets) {
        setAgingData(res.data.aging_buckets);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchReports(1);
    fetchAging();
  }, [loanType, company, loanStatus, repayment, month, startDate, endDate]);

  const handleDownload = async (type: "excel" | "pdf") => {
    const compTarget = company !== "all" ? company : "nakama";
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    
    const res = await downloadFile(`/api/reports/applications/get-all/repayment/company/${compTarget}/${type}${qs}`, `repayment_${compTarget}.${type === 'excel' ? 'xlsx' : 'pdf'}`);
    if (res.error) toast.error(res.error);
    else toast.success(`Downloaded ${type.toUpperCase()} report successfully`);
  };

  const displayData = useMemo(() => {
    if (loanType === "salary_advance") return advanceData;
    if (loanType === "personal") return personalData;
    return {
      total_applied: Number(advanceData?.total_applied || 0) + Number(personalData?.total_applied || 0),
      total_disbursed: Number(advanceData?.total_disbursed || 0) + Number(personalData?.total_disbursed || 0),
      total_repayment: Number(advanceData?.total_repayment || 0) + Number(personalData?.total_repayment || 0),
    };
  }, [loanType, advanceData, personalData]);

  const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">View and analyze loan applications across the platform</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={company} onChange={e => setCompany(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium capitalize">
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium" />
          
          <Link to="/admin/reports/builder">
            <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold">
              <LayoutList className="h-4 w-4 mr-2" /> Custom Builder
            </Button>
          </Link>
          <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold" onClick={() => handleDownload("excel")}>
            <Download className="h-4 w-4 mr-2" /> Download Excel
          </Button>
          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 font-semibold" onClick={() => handleDownload("pdf")}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Applications</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{loading ? <Skeleton className="h-8 w-16" /> : pagination.total_records}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><Users className="h-6 w-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Applied</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{loading ? <Skeleton className="h-8 w-24" /> : KES.format(displayData.total_applied)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0"><DollarSign className="h-6 w-6 text-purple-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total Disbursed</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{loading ? <Skeleton className="h-8 w-24" /> : KES.format(displayData.total_disbursed)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Expected Repayment</p>
              <p className="text-2xl font-black text-slate-900 mt-2">{loading ? <Skeleton className="h-8 w-24" /> : KES.format(displayData.total_repayment)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><DollarSign className="h-6 w-6 text-amber-600" /></div>
          </div>
        </div>
      </div>

      {/* Aging Report Widget */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center"><Clock className="mr-2 text-amber-500 h-5 w-5"/> Aging Report (Overdue Tracking)</h2>
          <Button variant="outline" size="sm" onClick={fetchAging}><RefreshCw className="h-4 w-4 mr-2"/> Refresh</Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
            <div className="text-[10px] font-bold text-emerald-600 uppercase">Current</div>
            <div className="text-xl font-black text-emerald-700 my-1">{agingData?.current?.count || 0}</div>
            <div className="text-xs text-emerald-600/80">{KES.format(agingData?.current?.total || 0)}</div>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
            <div className="text-[10px] font-bold text-amber-600 uppercase">1-30 Days</div>
            <div className="text-xl font-black text-amber-700 my-1">{agingData?.['1_30_days']?.count || 0}</div>
            <div className="text-xs text-amber-600/80">{KES.format(agingData?.['1_30_days']?.total || 0)}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
            <div className="text-[10px] font-bold text-orange-600 uppercase">31-60 Days</div>
            <div className="text-xl font-black text-orange-700 my-1">{agingData?.['31_60_days']?.count || 0}</div>
            <div className="text-xs text-orange-600/80">{KES.format(agingData?.['31_60_days']?.total || 0)}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
            <div className="text-[10px] font-bold text-red-600 uppercase">61-90 Days</div>
            <div className="text-xl font-black text-red-700 my-1">{agingData?.['61_90_days']?.count || 0}</div>
            <div className="text-xs text-red-600/80">{KES.format(agingData?.['61_90_days']?.total || 0)}</div>
          </div>
          <div className="bg-rose-100 p-4 rounded-xl border border-rose-200 text-center">
            <div className="text-[10px] font-bold text-rose-800 uppercase">90+ Days</div>
            <div className="text-xl font-black text-rose-900 my-1">{agingData?.['90_plus']?.count || 0}</div>
            <div className="text-xs text-rose-800/80">{KES.format(agingData?.['90_plus']?.total || 0)}</div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center">
          <select value={loanType} onChange={e => setLoanType(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium">
            <option value="all">All Types</option>
            <option value="salary_advance">Salary Advance</option>
            <option value="personal">Personal Loan</option>
          </select>
          <select value={company} onChange={e => setCompany(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium capitalize">
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <select value={loanStatus} onChange={e => setLoanStatus(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium">
            <option value="all">All Loan Status</option>
            <option value="pending_processing">Pending</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
            <option value="paid">Paid</option>
          </select>
          <select value={repayment} onChange={e => setRepayment(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium">
            <option value="all">All Repayments</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium" />
          <Button variant="ghost" onClick={() => { setStartDate(""); setEndDate(""); setLoanType("all"); setCompany("all"); setLoanStatus("all"); setRepayment("all"); }}>Clear</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-slate-500 font-bold uppercase text-[10px]">
                <th className="px-6 py-4">Borrower</th>
                <th className="px-6 py-4">Company / Type</th>
                <th className="px-6 py-4 text-right">Applied</th>
                <th className="px-6 py-4 text-right">Disbursed</th>
                <th className="px-6 py-4 text-right">To Repay</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No records found.</td></tr>
              ) : (
                data.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{app.Name || app.name || app.applicant_id || "Unknown"}</td>
                    <td className="px-6 py-4">
                      <div className="capitalize font-medium text-gray-700">{app.company}</div>
                      <div className="text-xs text-slate-500 capitalize">{app.loan_type?.replace("_", " ")}</div>
                    </td>
                    <td className="px-6 py-4 text-right">{KES.format(parseFloat(app.Amount_Applied || app.amount_applied || '0'))}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{KES.format(parseFloat(app.Disbursement_Amount || app.disbursement_amount || '0'))}</td>
                    <td className="px-6 py-4 text-right text-amber-600 font-bold">{KES.format(parseFloat(app.Repayment_Amount || app.repayment_amount || '0'))}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 capitalize">{app.loan_status?.replace("_", " ")}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-gray-700 capitalize">{app.repayment_status?.replace("_", " ")}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(app.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 text-sm">
          <span className="text-slate-500">Page {pagination.page} of {pagination.total_pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.has_prev} onClick={() => fetchReports(pagination.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => fetchReports(pagination.page + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
