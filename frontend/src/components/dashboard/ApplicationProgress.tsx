import { Link } from "react-router-dom";
import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PanelTone, Progress, StepState } from "@/lib/loanProgress";

// Where one application is: five steps and the one thing to know about the step it is on (lib/loanProgress.ts says what and why).
const PANEL: Record<PanelTone, string> = {
  navy: "border-blue-100 bg-blue-50 text-blue-950",
  amber: "border-amber-200 bg-amber-50 text-amber-950",
  red: "border-red-100 bg-red-50 text-red-950",
  green: "border-emerald-100 bg-emerald-50 text-emerald-950",
};
const BUTTON: Record<PanelTone, string> = {
  navy: "bg-blue-900 hover:bg-blue-800",
  amber: "bg-amber-700 hover:bg-amber-800",
  red: "bg-red-700 hover:bg-red-800",
  green: "bg-emerald-700 hover:bg-emerald-800",
};
const DOT: Record<PanelTone, string> = { navy: "bg-blue-900", amber: "bg-amber-600", red: "bg-red-600", green: "bg-emerald-600" };
const SAID: Record<StepState, string> = { done: "done", current: "now", todo: "to come", stopped: "stopped here" };

export default function ApplicationProgress({ progress: p }: { progress: Progress }) {
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
  };
  const cta = p.cta && (
    <Button className={`h-[44px] rounded-lg px-4 text-[14px] font-bold text-white ${BUTTON[p.tone]}`}>
      {p.cta.label}
      <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
    </Button>
  );

  return (
    <section aria-label="Where your application is" className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/80">
      <ol aria-label="Application progress" className="relative grid grid-cols-5">
        {/* the line behind the dots, filled as far as the loan has got (dot centres sit at 10%, 30%, 50%, 70%, 90%) */}
        <div className="absolute left-[10%] right-[10%] top-[11px] h-0.5 rounded bg-slate-200" aria-hidden>
          <div className="h-full rounded bg-blue-900 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${(Math.min(p.reached, 4) / 4) * 100}%` }} />
        </div>
        {p.steps.map((s) => (
          <li key={s.label} aria-current={s.state === "current" ? "step" : undefined} className="relative z-10 flex flex-col items-center">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ring-4 ring-white ${
                s.state === "done" ? "bg-blue-900" : s.state === "current" ? DOT[p.tone] : s.state === "stopped" ? "bg-red-600" : "border-2 border-slate-300 bg-white"
              }`}
            >
              {s.state === "done" && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />}
              {s.state === "stopped" && <X className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />}
              {s.state === "current" && <span className="h-2 w-2 rounded-full bg-white" aria-hidden />}
            </span>
            <span className={`mt-1.5 text-center text-[12px] leading-tight ${s.state === "current" || s.state === "stopped" ? "font-bold text-slate-900" : s.state === "done" ? "font-medium text-slate-700" : "text-slate-500"}`}>
              {s.label}
              <span className="sr-only">: {SAID[s.state]}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className={`mt-4 rounded-xl border px-3.5 py-3 ${PANEL[p.tone]}`}>
        <p className="text-[15px] font-bold leading-snug">{p.title}</p>
        {p.body && <p className="mt-0.5 text-[13px] leading-snug opacity-90">{p.body}</p>}
        {(p.cta || p.help) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-0.5">
            {p.cta &&
              (p.cta.anchor ? (
                <a href={`#${p.cta.anchor}`} onClick={scrollTo(p.cta.anchor)}>
                  {cta}
                </a>
              ) : (
                <Link to={p.cta.to ?? "/dashboard"}>{cta}</Link>
              ))}
            {p.help && (
              <Link to={p.help.to} className="tap-link inline-block py-1 text-[13px] font-semibold underline underline-offset-2 hover:no-underline">
                {p.help.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
