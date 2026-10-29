import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** One friendly "nothing here yet" for the applicant's pages: an icon, what is missing, and (when there is one) the thing to do about it. */
export default function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: { label: string; to: string } }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand-blue">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-3 text-[15px] font-bold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[13px] text-slate-500">{text}</p>}
      {action && (
        <Link to={action.to} className="mt-4">
          <Button className="h-[44px] rounded-lg bg-red-600 px-5 text-[14px] font-bold text-white hover:bg-red-700">{action.label}</Button>
        </Link>
      )}
    </div>
  );
}
