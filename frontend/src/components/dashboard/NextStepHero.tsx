import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NextStep, Tone } from "@/lib/nextStep";

// The top of the applicant's home page: a greeting and the ONE next thing for this person (see lib/nextStep.ts for what it says and why).
// The colour follows how urgent it is: navy as usual, amber when they must act or a payment is close, red when a payment is late.
const TONE: Record<Tone, string> = {
  navy: "from-[#081430] via-[#0F2C59] to-[#17418a]",
  amber: "from-amber-900 via-amber-800 to-amber-700",
  red: "from-red-900 via-red-800 to-red-700",
};

/** `step` is null while the page is still loading. `aside` is the row of figures shown beside it on wider screens. */
export default function NextStepHero({ name, greeting = "Welcome back", step, error, aside }: { name: string; greeting?: string; step: NextStep | null; error?: string | null; aside?: ReactNode }) {
  const first = name.split(" ")[0];
  const tone = error ? "navy" : (step?.tone ?? "navy");

  return (
    <section aria-label="Your next step" className={`relative flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r shadow-card p-4 text-white transition-colors duration-500 sm:p-5 lg:flex-row lg:items-center ${TONE[tone]}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-white/5" />
      </div>

      <div className="relative z-10 min-w-0 max-w-xl">
        <p className="text-[13px] font-medium text-white/75">{greeting}{first ? `, ${first}` : ""}</p>

        {error ? (
          <>
            <h1 className="mt-2 text-xl font-extrabold leading-tight tracking-tight">We could not load your loans</h1>
            <p className="mt-1.5 text-[14px] leading-snug text-white/85">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4 h-[44px] rounded-lg bg-white px-5 font-display text-[14px] font-semibold text-blue-950 hover:bg-blue-50">
              Try again
            </Button>
          </>
        ) : !step ? (
          <div className="mt-3 space-y-2.5" role="status" aria-label="Loading">
            <div className="h-5 w-24 animate-pulse rounded-full bg-white/15" />
            <div className="h-7 w-64 max-w-full animate-pulse rounded bg-white/15" />
            <div className="h-4 w-48 max-w-full animate-pulse rounded bg-white/10" />
            <div className="h-11 w-40 animate-pulse rounded-lg bg-white/15" />
          </div>
        ) : (
          <>
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              {step.eyebrow}
            </p>
            <h1 className="mt-2 break-words text-xl font-extrabold leading-tight tracking-tight sm:text-2xl">{step.title}</h1>
            {step.body && <p className="mt-1.5 text-[14px] leading-snug text-white/85">{step.body}</p>}

            {step.profile && (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={step.profile.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
                    <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${step.profile.percent}%` }} />
                  </div>
                  <span className="text-[13px] font-bold tabular-nums">{step.profile.percent}%</span>
                </div>
                {step.profile.missing.length > 0 && (
                  <>
                    <p className="mt-2.5 text-[13px] text-white/80">Still needed:</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {step.profile.missing.slice(0, 3).map((m) => (
                        <li key={m} className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium">
                          {m}
                        </li>
                      ))}
                      {step.profile.missing.length > 3 && <li className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium">+{step.profile.missing.length - 3} more</li>}
                    </ul>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
              {step.cta && (
                <Link to={step.cta.to}>
                  <Button className="h-[44px] rounded-lg bg-white px-5 font-display text-[14px] font-semibold text-blue-950 hover:bg-blue-50">
                    {step.cta.label}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                </Link>
              )}
              {step.help && (
                <Link to={step.help.to} className="tap-link inline-block py-1 text-[13px] font-semibold text-white/90 underline underline-offset-2 hover:text-white hover:no-underline">
                  {step.help.label}
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      {aside}
    </section>
  );
}
