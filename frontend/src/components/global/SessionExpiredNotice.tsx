import { useSearchParams } from "react-router-dom";
import { Clock } from "lucide-react";

// Shown above the sign-in form when an expired login sent the user here (?session=expired).
export default function SessionExpiredNotice() {
  const [params] = useSearchParams();
  if (params.get("session") !== "expired") return null;
  return (
    <div role="status" className="mb-5 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <span>Your session has ended. Sign in again to carry on where you left off.</span>
    </div>
  );
}
