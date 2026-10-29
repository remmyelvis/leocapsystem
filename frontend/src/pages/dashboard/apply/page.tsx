

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "@/contexts/AuthContext";
import { AlertCircle, Loader2 } from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { ProfileApplyGate } from "@/components/profile/ProfileCompletion";
import { applicationApi } from "@/lib/applicationApi";
import { Button } from "@/components/ui/button";

type RouteState = "loading" | "redirecting" | "profile_incomplete" | "unknown_company" | "blocked";

export default function ApplyPage() {
  const navigate = useNavigate();
  const again = useSearchParams()[0].get("again");
  const { data: session, status } = useSession();
  const [routeState, setRouteState] = useState<RouteState>("loading");
  // The server refuses a new application while a loan is unpaid or another application is waiting for a decision (create_application in
  // backend/website/application.py). Say so here, before they fill in a whole form for nothing.
  const [blocker, setBlocker] = useState<{ kind: "unpaid" | "open"; id: string } | null>(null);
  const checked = useRef(false);

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

    if (checked.current) return;
    checked.current = true;
    (async () => {
      const { data } = await applicationApi.getAll();
      const rows = (Array.isArray(data) ? data : []).map((item: unknown) => ((item as { application?: Record<string, unknown> }).application ?? item) as Record<string, unknown>);
      // A new application starts as "unpaid" too, so "unpaid" only counts once the loan has been paid out (the server's own check ignores
      // declined applications since decision 24, and still counts the ones in progress)
      const unpaid = rows.find((a) => a.repayment_status === "unpaid" && a.loan_status === "disbursed");
      const open = rows.find((a) => ["pending_processing", "approved"].includes(String(a.loan_status)));
      const found = unpaid ?? open;
      if (found) {
        setBlocker({ kind: unpaid ? "unpaid" : "open", id: String(found.id) });
        setRouteState("blocked");
        return;
      }
      setRouteState("redirecting");
      const from = again ? `again=${encodeURIComponent(again)}` : "";
      if (company === "personal") navigate(`/dashboard/apply/general-loan${from ? `?${from}` : ""}`);
      // Dynamic routing for all registered corporate entities
      else navigate(`/dashboard/apply/salary-advance?company=${encodeURIComponent(company)}${from ? `&${from}` : ""}`);
    })();
  }, [session, status, profileCompletion.isComplete, navigate]);

  if (routeState === "profile_incomplete") {
    return <ProfileApplyGate profileHref="/dashboard/profile" />;
  }

  if (routeState === "blocked" && blocker) {
    const unpaid = blocker.kind === "unpaid";
    return (
      <div className="p-4 w-full max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-card p-6 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 bg-amber-50 rounded-lg flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{unpaid ? "You have a loan to repay first" : "You already have an application in progress"}</h1>
          <p className="text-[14px] text-slate-500 leading-relaxed">
            {unpaid ? "You can apply for a new loan once your current loan is repaid." : "You can apply for a new loan once it has been decided."}
          </p>
          <Link to={`/dashboard/applications/${blocker.id}`} className="mt-1">
            <Button className="h-[44px] bg-brand-blue px-5 font-bold text-white hover:bg-slate-800">{unpaid ? "View my loan" : "Track application"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (routeState === "unknown_company") {
    return (
      <div className="p-4 w-full max-w-lg mx-auto mt-12">
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 shadow-card p-6 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-lg flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Account type not set</h2>
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
    <div className="p-4 flex items-center justify-center min-h-64">
      <Loader2 className="h-6 w-6 animate-spin text-brand-blue" />
    </div>
  );
}
