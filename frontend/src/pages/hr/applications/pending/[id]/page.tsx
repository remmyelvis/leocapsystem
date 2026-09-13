

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const mapStatus = (status: string) => {
  if (status === "pending_processing") return "PENDING";
  return status.replace(/_/g, " ").toUpperCase();
};

const statusBadge = (status: string) => {
  const s = mapStatus(status);
  if (s.includes("PENDING")) return "bg-amber-100 text-amber-700";
  if (s.includes("APPROVE")) return "bg-emerald-100 text-emerald-700";
  if (s.includes("DECLINE")) return "bg-red-100 text-red-700";
  if (s.includes("DISBURSE")) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
};

const mapLoanType = (type: string) => {
  if (type === "personal") return "Personal / General Loan";
  if (type === "salary_advance") return "Salary Advance";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm text-slate-900 font-medium">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide mb-5">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
        {children}
      </div>
    </div>
  );
}

interface GetOneResponse {
  application: {
    id: string;
    amount_applied: string;
    date_submitted: string;
    loan_status: string;
    loan_type: string;
    month_one: string;
    month_two: string;
    month_three: string;
    employment_nature: string;
    employment_type?: string;
    is_first_time_applicant?: string;
  };
  bio_data: {
    full_name: string;
    email: string;
    phone_number: string;
    id_number: string;
  };
}

export default function HRPendingApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = { id: id! };
  const navigate = useNavigate();
  const [data, setData] = useState<GetOneResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Amend Amount States
  const [showAmend, setShowAmend] = useState(false);
  const [amendAmount, setAmendAmount] = useState("");
  const [amendLoading, setAmendLoading] = useState(false);

  // Approve State
  const [approveLoading, setApproveLoading] = useState(false);

  // Reject State
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await apiCall<GetOneResponse>(`/api/applications/get-one/${params.id}`);
        if (res.data) {
          setData(res.data);
          // Pre-fill amend amount with current amount
          setAmendAmount(res.data.application.amount_applied || "");
        }
      } catch (error) {
        console.error("Failed to fetch application", error);
      } finally {
        setLoading(false);
      }
    }
    fetchApp();
  }, [params.id]);

  const handleAmendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendAmount || isNaN(Number(amendAmount)) || Number(amendAmount) <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    setAmendLoading(true);
    try {
      const res = await apiCall(`/api/applications/hr/amend/${params.id}`, {
        method: "PATCH",
        body: { amount_applied: amendAmount.toString() },
      });
      if (res.error) {
        toast.error(res.error || "Failed to amend application");
      } else {
        toast.success("Application amended successfully");
        window.location.reload();
      }
    } catch (_err) {
      toast.error("Something went wrong");
    } finally {
      setAmendLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const res = await apiCall(`/api/applications/approve/${params.id}`, {
        method: "PATCH",
      });
      if (res.error) {
        toast.error(res.error || "Failed to approve application");
      } else {
        toast.success("Application approved successfully");
        navigate("/hr/applications");
      }
    } catch (_err) {
      toast.error("Something went wrong");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setRejectLoading(true);
    try {
      const res = await apiCall(`/api/applications/reject/${params.id}`, {
        method: "PATCH",
        body: { reason: rejectReason },
      });
      if (res.error) {
        toast.error(res.error || "Failed to reject application");
      } else {
        toast.success("Application rejected successfully");
        navigate("/hr/applications");
      }
    } catch (_err) {
      toast.error("Something went wrong");
    } finally {
      setRejectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-400 text-sm">
        Application not found.
      </div>
    );
  }

  const { application, bio_data } = data;
  
  // Format numbers
  const amtApplied = Number(application.amount_applied || 0);
  const m1 = Number(application.month_one || 0);
  const m2 = Number(application.month_two || 0);
  const m3 = Number(application.month_three || 0);
  
  // Employment Type handling
  const empTypeMap: Record<string, string> = {
    "employed": "Employed",
    "self_employed": "Self Employed",
  };
  const empTypeRaw = application.employment_type || application.employment_nature || "self_employed";
  const empType = empTypeMap[empTypeRaw.toLowerCase()] || empTypeRaw;
  
  const firstTime = application.is_first_time_applicant === "True" ? "Yes" : "No";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Information Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-brand-blue text-sm font-medium">
          Kindly review this application, amend the amount if needed and approve the application.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900">
                {mapLoanType(application.loan_type)}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                {application.id.substring(0, 8)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {["pending_processing", "amended"].includes(application.loan_status) && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={approveLoading}
                  className="text-sm font-bold px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {approveLoading ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => {
                    setShowReject(!showReject);
                    setShowAmend(false);
                  }}
                  className="text-sm font-bold px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowAmend(!showAmend);
                setShowReject(false);
              }}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Amend Amount
            </button>
            <span
              className={`text-xs font-black px-3 py-1.5 rounded-full ${statusBadge(
                application.loan_status
              )}`}
            >
              {mapStatus(application.loan_status)}
            </span>
          </div>
        </div>

        {/* Amend Form */}
        {showAmend && (
          <form onSubmit={handleAmendSubmit} className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5 flex flex-col sm:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">New Amount (KES)</label>
              <input
                type="number"
                value={amendAmount}
                onChange={(e) => setAmendAmount(e.target.value)}
                placeholder="e.g. 50000"
                min="1"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={amendLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-blue hover:bg-slate-800 text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {amendLoading ? "Saving..." : "Submit Amendment"}
            </button>
          </form>
        )}

        {/* Reject Form */}
        {showReject && (
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5 flex flex-col sm:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reason for Rejection</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Does not meet minimum requirements"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={rejectLoading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
            >
              {rejectLoading ? "Rejecting..." : "Submit Rejection"}
            </button>
          </form>
        )}
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date Submitted</p>
          <p className="text-sm font-semibold text-slate-900">{formatDate(application.date_submitted)}</p>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount</p>
          <p className="text-sm font-semibold text-slate-900">Ksh {amtApplied.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-5">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Updated</p>
          <p className="text-sm font-semibold text-slate-900">{formatDate(application.date_submitted)}</p>
        </div>
      </div>

      {/* Bio Data */}
      <Section title="BIO DATA">
        <Field label="Full Name" value={bio_data.full_name} />
        <Field label="ID Number" value={bio_data.id_number} />
        <Field label="Phone Number" value={bio_data.phone_number} />
        <Field label="Email Address" value={bio_data.email} />
      </Section>

      {/* General Loan Details */}
      <Section title="GENERAL LOAN DETAILS">
        <Field label="Employment Type" value={empType} />
        <Field label="First Time Applicant" value={firstTime} />
        <Field label="Month 1 Earnings" value={`KES ${m1.toLocaleString()}`} />
        <Field label="Month 2 Earnings" value={`KES ${m2.toLocaleString()}`} />
        <Field label="Month 3 Earnings" value={`KES ${m3.toLocaleString()}`} />
        <Field label="Terms Accepted" value="Yes" />
      </Section>

      {/* Notice box */}
      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-yellow-700 text-sm font-medium">
        Your application is under review. You will be notified once a decision is made (within 24 hours).
      </div>

      {/* Messages from Admin */}
      <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-blue-700" />
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            MESSAGES FROM ADMIN
          </h2>
        </div>
        <p className="text-sm text-slate-500">
          No messages yet. Admin communications regarding your application will appear here.
        </p>
      </div>
    </div>
  );
}
