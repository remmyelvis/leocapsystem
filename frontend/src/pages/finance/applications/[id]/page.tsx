

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { apiCall } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { formatName } from "@/lib/formatName";

const mapStatus = (status: string) => {
  if (status === "pending_processing") return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const statusBadge = (status: string) => {
  const s = mapStatus(status).toLowerCase();
  if (s.includes("pending")) return "bg-amber-100 text-amber-700";
  if (s.includes("amend")) return "bg-blue-100 text-blue-700";
  if (s.includes("approve")) return "bg-emerald-100 text-emerald-700";
  if (s.includes("decline") || s.includes("reject")) return "bg-red-100 text-red-700";
  if (s.includes("disburse")) return "bg-blue-100 text-blue-700";
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
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-slate-900 font-medium">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
      <h2 className="text-[13px] font-bold text-slate-900 uppercase tracking-wide mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
        {children}
      </div>
    </div>
  );
}

interface GetOneResponse {
  application: {
    id: string;
    amount_applied: string;
    created_at: string;
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

export default function FinanceApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = { id: id! };
  const navigate = useNavigate();
  const [data, setData] = useState<GetOneResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApp() {
      try {
        const res = await apiCall<GetOneResponse>(`/api/applications/get-one/${params.id}`);
        if (res.data) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch application", error);
      } finally {
        setLoading(false);
      }
    }
    fetchApp();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
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
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {mapLoanType(application.loan_type)}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {application.id.substring(0, 8)}...
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(
            application.loan_status
          )}`}
        >
          {mapStatus(application.loan_status)}
        </span>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Date Submitted</p>
          <p className="text-sm font-semibold text-slate-900">{formatDate(application.created_at)}</p>
        </div>
        <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Amount</p>
          <p className="text-sm font-semibold text-slate-900">Ksh {amtApplied.toLocaleString()}</p>
        </div>
      </div>

      {/* Bio Data */}
      <Section title="BIO DATA">
        <Field label="Full Name" value={formatName(bio_data.full_name)} />
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
      {["pending_processing", "amended"].includes(application.loan_status) && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2 text-yellow-700 text-[13px] font-medium">
          Your application is under review. You will be notified once a decision is made (within 24 hours).
        </div>
      )}

      {/* Messages from Admin */}
      <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-violet-700" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            MESSAGES FROM ADMIN
          </h2>
        </div>
        <p className="text-[13px] text-slate-500">
          No messages yet. Admin communications regarding your application will appear here.
        </p>
      </div>
    </div>
  );
}
