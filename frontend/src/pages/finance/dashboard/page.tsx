

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  ArrowRight,
  Building2,
  Calculator,
} from "lucide-react";
import { applicantApi } from "@/lib/applicantApi";
import { applicationApi } from "@/lib/applicationApi";
import type { GetAllApplicationItem } from "@/lib/applicationApi";
import { useFinanceProfileStore } from "@/store/financeProfileStore";
import { companyLabel as getCompanyLabel } from "@/lib/company";
import { ProfileIncompleteBanner } from "@/components/profile/ProfileCompletion";

const KES = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm p-4 flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function FinanceDashboardPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const setProfile = useFinanceProfileStore((s) => s.setProfile);

  // Fetch applicant details to power the progress banner
  useEffect(() => {
    if (!userId) return;

    Promise.all([
      applicantApi.getApplicantDetails(userId),
      applicantApi.getApplicantDocuments(userId),
    ]).then(([detailsResponse, docsResponse]) => {
      const { data: detailsData } = detailsResponse;
      const { data: docsData } = docsResponse;

      if (detailsData?.applicant) {
        setProfile({
          userId,
          name: detailsData.applicant.name ?? "",
          email: detailsData.applicant.email ?? "",
          phoneNumber: detailsData.applicant.phone_number ?? "",
          idNumber: detailsData.applicant.id_number ?? null,
          kraPin: detailsData.applicant.kra_pin ?? null,
          applicantType: detailsData.applicant.applicant_type ?? "",
          payrollNumber: detailsData.applicant.payroll_number ?? null,
          docs: Array.isArray(docsData) ? docsData : [],
          fetchedAt: new Date().toISOString(),
        });
      }
    });
  }, [userId, setProfile]);

  const company = (session?.user?.company ?? "").toLowerCase();
  const companyLabel = getCompanyLabel(company, session?.user?.companyName);

  const [apiApps, setApiApps] = useState<GetAllApplicationItem[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  // Fetch applications from API
  useEffect(() => {
    async function fetchApps() {
      setAppsLoading(true);
      const { data } = await applicationApi.getAll();
      if (data) {
        // Filter by the Finance team's company
        const filtered = data.filter(
          (item) => item.application.company?.toLowerCase() === company
        );
        setApiApps(filtered);
      }
      setAppsLoading(false);
    }
    fetchApps();
  }, [company]);

  // Map the API data into the shape expected by the UI
  const companyApps = apiApps.map((item) => {
    const rawStatus = item.application.loan_status?.toLowerCase() || "";
    let status = "Pending";
    if (rawStatus === "approved") status = "Approved";
    else if (rawStatus === "disbursed") status = "Disbursed";
    else if (rawStatus === "declined" || rawStatus === "rejected") status = "Declined";

    return {
      id: item.application.id,
      customerName: item.bio_data.full_name || "Unknown",
      designation: item.application.designation || "N/A",
      amountApplied: Number(item.application.amount_applied || 0),
      status,
      submittedAt: item.application.created_at,
    };
  });

  const pending = companyApps.filter((a) => a.status === "Pending").length;
  const approved = companyApps.filter((a) => a.status === "Approved").length;
  const disbursed = companyApps.filter((a) => a.status === "Disbursed").length;
  const declined = companyApps.filter((a) => a.status === "Declined").length;

  const recentApps = [...companyApps]
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
    .slice(0, 4);

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: "bg-amber-100 text-amber-700",
      Approved: "bg-emerald-100 text-emerald-700",
      Declined: "bg-red-100 text-red-700",
      Disbursed: "bg-blue-100 text-blue-700",
    };
    return map[status] ?? "bg-slate-100 text-slate-600";
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Finance Dashboard
          </h1>
          <p className="text-slate-500 text-[13px] mt-0.5 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            {companyLabel} · {today}
          </p>
        </div>
        <Link to="/finance/apply"
          className="inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-600 text-white text-[13px] font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          Apply for Loan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Applications"
          value={companyApps.length}
          icon={FileText}
          gradient="from-violet-600 to-violet-800"
        />
        <StatCard
          label="Pending Review"
          value={pending}
          icon={Clock}
          gradient="from-amber-400 to-amber-600"
        />
        <StatCard
          label="Approved"
          value={approved}
          icon={CheckCircle}
          gradient="from-emerald-500 to-emerald-700"
        />
        <StatCard
          label="Disbursed"
          value={disbursed}
          icon={Banknote}
          gradient="from-purple-500 to-purple-700"
        />
      </div>

      {/* Profile incomplete banner */}
      <ProfileIncompleteBanner profileHref="/finance/profile" />

      {/* Two-column lower section */}
      <div className="grid grid-cols-1 gap-5">
        {/* Recent company applications */}
        <div className="bg-white rounded-lg ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Recent Company Applications
            </h2>
            <Link to="/finance/applications"
              className="text-xs text-violet-700 font-semibold hover:underline"
            >
              View all →
            </Link>
          </div>
          {appsLoading ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-slate-100 animate-pulse rounded w-1/2" />
                    <div className="h-3 bg-slate-100 animate-pulse rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              No applications yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentApps.map((app) => (
                <Link
                  key={app.id}
                  to={`/finance/applications/${app.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-800 text-xs font-bold flex-shrink-0">
                    {app.customerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {app.customerName}
                    </p>
                    <p className="text-xs text-slate-400">{app.designation}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                      {KES.format(app.amountApplied)}
                    </p>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${statusBadge(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
