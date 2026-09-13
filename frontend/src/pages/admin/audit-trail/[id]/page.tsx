

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, History, FileText, User, Calendar, Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AuditTrailDetail {
  id: string;
  application_id: string;
  application_new_loan_amount: number | null;
  application_new_repayment_amount: number | null;
  application_old_loan_amount: number | null;
  application_old_repayment_amount: number | null;
  changed_at: string;
  changed_by_email: string;
  changed_by_role: string;
  changed_by_company?: string;
  field_name: string;
  new_status: string | null;
  old_status: string | null;
  notes: string | null;
}

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function DetailCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
        <Icon className="h-5 w-5 text-slate-400" />
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, isCurrency = false }: { label: string; value?: string | number | null; isCurrency?: boolean }) {
  if (value === undefined || value === null) return null;
  
  const displayValue = isCurrency && typeof value === "number" ? KES.format(value) : String(value);

  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-slate-900 font-medium break-words">{displayValue}</p>
    </div>
  );
}

export default function AuditTrailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = { id: id! };
  const navigate = useNavigate();
  const [data, setData] = useState<AuditTrailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditTrail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiCall(`/api/applications/audit-trails/${params.id}`);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else if (res.data) {
        const responseData = res.data as { data: AuditTrailDetail };
        setData(responseData.data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load audit trail details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditTrail();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6 w-full space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <p className="text-slate-500">{error || "Audit trail not found."}</p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
            Go Back
          </Button>
          <Button onClick={fetchAuditTrail} className="rounded-xl bg-brand-blue hover:bg-slate-800">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const date = new Date(data.changed_at).toLocaleString("en-GB", {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const actionName = data.field_name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="p-6 w-full space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="mt-1 p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900">
              Audit Trail Record
            </h1>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-brand-blue">
              {actionName}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            ID: {data.id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Details */}
        <DetailCard title="Action Initiated By" icon={User}>
          <Field label="User Email" value={data.changed_by_email} />
          <Field label="Role" value={data.changed_by_role.toUpperCase()} />
          {data.changed_by_company && <Field label="Company" value={data.changed_by_company} />}
          <Field label="Date & Time" value={date} />
        </DetailCard>

        {/* Application Details */}
        <DetailCard title="Application Context" icon={FileText}>
          <div className="col-span-full">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Application ID
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block">
                {data.application_id}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs rounded-lg"
                onClick={() => navigate(`/admin/applications/${data.application_id}`)}
              >
                View Application
              </Button>
            </div>
          </div>
          <Field label="Modified Field" value={actionName} />
        </DetailCard>
      </div>

      {/* Changes Made */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
          <Activity className="h-5 w-5 text-slate-400" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Changes Recorded</h2>
        </div>
        
        {data.notes && (
          <div className="mb-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Audit Notes</p>
            <p className="text-sm text-slate-800">{data.notes}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 rounded-t-xl">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase rounded-tl-xl w-1/3">Property</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-1/3">Previous Value</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase rounded-tr-xl w-1/3">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Status Row */}
              {(data.old_status || data.new_status) && (
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-700">Application Status</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{data.old_status?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-blue-700 font-semibold capitalize">{data.new_status?.replace(/_/g, " ") || "—"}</td>
                </tr>
              )}
              
              {/* Loan Amount Row */}
              {(data.application_old_loan_amount !== null || data.application_new_loan_amount !== null) && (
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-700">Loan Amount</td>
                  <td className="px-4 py-3 text-slate-500">
                    {data.application_old_loan_amount !== null ? KES.format(data.application_old_loan_amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-blue-700 font-semibold">
                    {data.application_new_loan_amount !== null ? KES.format(data.application_new_loan_amount) : "—"}
                  </td>
                </tr>
              )}

              {/* Repayment Amount Row */}
              {(data.application_old_repayment_amount !== null || data.application_new_repayment_amount !== null) && (
                <tr className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-gray-700">Repayment Amount</td>
                  <td className="px-4 py-3 text-slate-500">
                    {data.application_old_repayment_amount !== null ? KES.format(data.application_old_repayment_amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-blue-700 font-semibold">
                    {data.application_new_repayment_amount !== null ? KES.format(data.application_new_repayment_amount) : "—"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
