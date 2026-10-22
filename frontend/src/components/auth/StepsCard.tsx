import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export interface PanelStep {
  label: string;
  text: string;
  /** Badge colours for a step that is a loan status; other steps show plain text. */
  chipClassName?: string;
}

// One step list for every auth page: done steps get a tick, the current one a pulse, the rest stay dim.
// `cycle` walks through the steps slowly (and stands still for someone who asked for less motion);
// without it the card shows a fixed "you are here" at `current`.
export default function StepsCard({
  title,
  tag,
  steps,
  foot,
  cycle = false,
  current = 0,
}: {
  title: string;
  tag?: string;
  steps: PanelStep[];
  foot: string;
  cycle?: boolean;
  current?: number;
}) {
  const [active, setActive] = useState(current);
  const [still, setStill] = useState(!cycle);

  useEffect(() => {
    setActive(current);
    if (!cycle) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(reduce.matches);
    if (reduce.matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % steps.length), 2600);
    return () => window.clearInterval(id);
  }, [cycle, current, steps.length]);

  return (
    <div className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-bold text-white">{title}</p>
        {tag && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/85">{tag}</span>}
      </div>

      <ol>
        {steps.map((step, i) => {
          const done = i < active;
          const isCurrent = i === active;
          return (
            <li key={step.label} className="relative flex gap-3.5 pb-4 last:pb-0" aria-current={isCurrent ? "step" : undefined}>
              {i < steps.length - 1 && (
                <span className={`absolute left-[11px] top-6 bottom-0 w-px transition-colors duration-500 ${done ? "bg-emerald-400/70" : "bg-white/15"}`} aria-hidden />
              )}
              <span
                className={`relative mt-0.5 flex h-[23px] w-[23px] flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  done ? "bg-emerald-400 text-[#081430]" : isCurrent ? "bg-white text-[#081430]" : "border border-white/25 bg-transparent"
                }`}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : isCurrent ? <span className="h-2 w-2 rounded-full bg-[#0F2C59]" /> : null}
                {isCurrent && !still && <span className="absolute inset-0 rounded-full bg-white/50 animate-ping" />}
              </span>
              <div className="min-w-0">
                {step.chipClassName ? (
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${step.chipClassName}`}>{step.label}</span>
                ) : (
                  <p className={`text-[13px] font-semibold transition-colors duration-500 ${isCurrent || done ? "text-white" : "text-white/80"}`}>{step.label}</p>
                )}
                {/* Only the words dim for steps not reached yet; the badges keep their full colour so they stay readable. */}
                <p className={`mt-1 text-[13px] leading-snug transition-colors duration-500 ${isCurrent || done ? "text-white/90" : "text-white/75"}`}>{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-white/10 pt-3 text-[12px] text-white/75">{foot}</p>
    </div>
  );
}
