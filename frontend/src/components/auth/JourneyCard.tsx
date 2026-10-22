import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { statusDisplay } from "@/lib/loanStatus";
import type { AuthVariant } from "./AuthLayout";

// The real statuses, in the order a loan moves through them, with what each one means for the person looking at it.
const STEPS: Record<AuthVariant, { status: string; text: string }[]> = {
  applicant: [
    { status: "pending_processing", text: "We check your details and documents." },
    { status: "rate_set", text: "Personal loans: you see the rate and accept or decline it." },
    { status: "approved", text: "Approved and waiting for payout." },
    { status: "disbursed", text: "Funds sent. Your repayment date is on your dashboard." },
  ],
  admin: [
    { status: "pending_processing", text: "A new application arrives with its documents." },
    { status: "rate_set", text: "Set the rate on personal loans." },
    { status: "approved", text: "Sign off the application." },
    { status: "disbursed", text: "Add the transfer note, then mark it as sent." },
  ],
};

const FOOT: Record<AuthVariant, string> = {
  applicant: "These are the statuses you will see on your dashboard.",
  admin: "Applicants see these same statuses on their dashboard.",
};

export default function JourneyCard({ variant }: { variant: AuthVariant }) {
  const steps = STEPS[variant];
  const [active, setActive] = useState(0);
  const [still, setStill] = useState(false);

  // Walk through the steps slowly; someone who asked for less motion gets the first step, standing still.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(reduce.matches);
    if (reduce.matches) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % steps.length), 2600);
    return () => window.clearInterval(id);
  }, [steps.length]);

  return (
    <div className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-bold text-white">Application journey</p>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white/70">Example</span>
      </div>

      <ol className="space-y-0">
        {steps.map((step, i) => {
          const status = statusDisplay(step.status);
          const done = i < active;
          const current = i === active;
          return (
            <li key={step.status} className="relative flex gap-3.5 pb-4 last:pb-0" aria-current={current ? "step" : undefined}>
              {i < steps.length - 1 && (
                <span className={`absolute left-[11px] top-6 bottom-0 w-px transition-colors duration-500 ${done ? "bg-emerald-400/70" : "bg-white/15"}`} aria-hidden />
              )}
              <span
                className={`relative mt-0.5 flex h-[23px] w-[23px] flex-shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  done ? "bg-emerald-400 text-[#081430]" : current ? "bg-white text-[#081430]" : "border border-white/25 bg-transparent"
                }`}
                aria-hidden
              >
                {done ? <Check className="h-3 w-3" strokeWidth={3} /> : current ? <span className="h-2 w-2 rounded-full bg-[#0F2C59]" /> : null}
                {current && !still && <span className="absolute inset-0 rounded-full bg-white/50 animate-ping" />}
              </span>
              <div className={`min-w-0 transition-opacity duration-500 ${current || done ? "opacity-100" : "opacity-55"}`}>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${status.className}`}>{status.label}</span>
                <p className="mt-1 text-[13px] leading-snug text-white/75">{step.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-white/10 pt-3 text-[12px] text-white/55">{FOOT[variant]}</p>
    </div>
  );
}
