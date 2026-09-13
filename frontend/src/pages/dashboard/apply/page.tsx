

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { AlertCircle, Loader2 } from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { ProfileApplyGate } from "@/components/profile/ProfileCompletion";

type RouteState = "loading" | "redirecting" | "profile_incomplete" | "unknown_company";

export default function ApplyPage() {
  const navigate = useNavigate();
  const { data: session, status } = useSession();
  const [routeState, setRouteState] = useState<RouteState>("loading");

  const profileCompletion = useProfileCompletion();

  useEffect(() => {
    if (status === "loading") return;

    // Check profile completeness first
    if (!profileCompletion.isComplete) {
      setRouteState("profile_incomplete");
      return;
    }

    // Backend returns 'applicant_type' for applicants, but fallback to 'company' for admins
    const sessionCompany = session?.user?.applicant_type || session?.user?.company;
    const storedCompany =
      typeof window !== "undefined"
        ? localStorage.getItem("leocap_user_company")
        : null;

    const company = sessionCompany || storedCompany;

    if (!company) {
      setRouteState("unknown_company");
      return;
    }

    if (company === "personal") {
      setRouteState("redirecting");
      navigate("/dashboard/apply/general-loan");
    } else {
      // Dynamic routing for all registered corporate entities
      setRouteState("redirecting");
      navigate(`/dashboard/apply/salary-advance?company=${encodeURIComponent(company)}`);
    }
  }, [session, status, profileCompletion.isComplete, navigate]);

  if (routeState === "profile_incomplete") {
    return <ProfileApplyGate profileHref="/dashboard/profile" />;
  }

  if (routeState === "unknown_company") {
    return (
      <div className="p-6 w-full max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-xl ring-1 ring-slate-200 shadow-sm p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Account type not set</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account doesn&apos;t have a loan type assigned. Please contact Leocap
            Invest support or sign out and register again.
          </p>
          <p className="text-xs text-slate-400">
            Expected values: <span className="font-mono">ideon</span>,{" "}
            <span className="font-mono">nakama</span>, or{" "}
            <span className="font-mono">personal</span>
          </p>
        </div>
      </div>
    );
  }

  // "loading" or "redirecting" — show spinner
  return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
    </div>
  );
}
