import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator } from "lucide-react";
import { useSession } from "@/contexts/AuthContext";
import { useApplicantProfileStore } from "@/store/applicantProfileStore";
import { Button } from "@/components/ui/button";
import { LOAN_SETTINGS } from "@/configs/loanSettings";
import { estimate, kes, parsePay, quote, type Loan } from "@/components/assistant/estimate";

// "How much could I get?": the borrower's own calculator (the page used to be the staff calculator, with its rates and fee switches). One figure
// in, what they could borrow and what reaches them out, using the same maths as the application forms and Leo (lib/loanCalculations.ts).
// It is an estimate: one pay figure stands for the three months the form asks for. A personal loan's repayment depends on the rate we set after review.

export default function BorrowerCalculatorPage() {
  const { data: session } = useSession();
  const company = session?.user?.applicant_type || session?.user?.company || (typeof window !== "undefined" ? localStorage.getItem("leocap_user_company") : "") || "";
  const loan: Loan = company === "personal" ? "personal" : "advance";
  const limit = useApplicantProfileStore((s) => s.profiles[session?.user?.id ?? ""]?.loanLimit);
  const [text, setText] = useState("");
  const [pick, setPick] = useState<number | null>(null);

  const pay = text.trim() ? parsePay(text) : null;
  const best = typeof pay === "number" ? estimate(loan, pay) : null;
  // the most they can ask for: their pay allows it, and an admin-set limit can lower it
  const allowed = best ? (limit && limit > 0 ? Math.min(best.amount, limit) : best.amount) : 0;
  const top = allowed >= 100 ? Math.floor(allowed / 100) * 100 : 0;
  const low = Math.min(1000, top);
  const amount = top ? Math.min(Math.max(pick ?? top, low), top) : 0;
  const q = top ? quote(loan, amount) : null;
  const limited = Boolean(best && limit && limit > 0 && limit < best.amount);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">How much could I get?</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">A quick estimate from your pay. Your application shows the exact figures.</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/80">
        <label htmlFor="pay" className="block text-[13px] font-semibold text-slate-700">
          Your basic pay each month (KES)
        </label>
        <input
          id="pay"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPick(null);
          }}
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 50000 or 50k"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[16px] font-medium text-slate-900 placeholder:text-slate-500 focus:border-brand-blue focus:outline-none focus:ring-4 focus:ring-brand-blue/10"
        />
        <p className="mt-1.5 text-xs text-slate-500">Use the average of your last 3 months. {loan === "advance" ? "This is for a salary advance." : "This is for a personal loan."}</p>
        {pay === "low" && <p className="mt-1.5 text-xs font-semibold text-orange-600">Please enter your monthly pay: at least KES 1,000.</p>}
        {pay === "high" && <p className="mt-1.5 text-xs font-semibold text-orange-600">That looks too high. Please check the amount.</p>}
        {text.trim() && pay === null && <p className="mt-1.5 text-xs font-semibold text-orange-600">Please enter a number, for example 50000.</p>}
      </div>

      {!q ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/60 px-4 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-brand-blue">
            <Calculator className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-[14px] font-semibold text-slate-800">Enter your pay to see what you could get</p>
          <p className="text-[13px] text-slate-500">Nothing is saved or sent anywhere.</p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-200/80" aria-live="polite">
          <div>
            <p className="text-[13px] font-medium text-slate-500">You could borrow up to</p>
            <p className="font-display text-3xl font-bold tracking-tight tabular-nums text-brand-blue">{kes(top)}</p>
            {limited && <p className="mt-1 text-xs text-slate-500">Your limit is {kes(limit as number)}, so that is the most you can ask for.</p>}
          </div>

          {top > low && (
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="amount" className="text-[13px] font-semibold text-slate-700">
                  How much do you want?
                </label>
                <span className="text-[15px] font-bold tabular-nums text-slate-900">{kes(amount)}</span>
              </div>
              <input
                id="amount"
                type="range"
                min={low}
                max={top}
                step={100}
                value={amount}
                onChange={(e) => setPick(Number(e.target.value))}
                aria-valuetext={kes(amount)}
                className="mt-1 h-11 w-full cursor-pointer accent-[#0F2C59]"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{kes(low)}</span>
                <span>{kes(top)}</span>
              </div>
            </div>
          )}

          <dl className="divide-y divide-slate-100 rounded-lg bg-slate-50 px-3">
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-[13px] text-slate-600">You receive</dt>
              <dd className="text-[16px] font-bold tabular-nums text-emerald-700">{kes(q.receive)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-[13px] text-slate-600">Fees taken from the loan</dt>
              <dd className="text-[15px] font-semibold tabular-nums text-slate-800">{kes(q.fees)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2.5">
              <dt className="text-[13px] text-slate-600">You repay</dt>
              <dd className="text-right text-[15px] font-semibold tabular-nums text-slate-800">
                {q.repay ? (
                  <>
                    {kes(q.repay)}
                    <span className="block text-xs font-normal text-slate-500">{LOAN_SETTINGS.salaryAdvance.repaymentDays} days after you receive it</span>
                  </>
                ) : (
                  <span className="text-[13px] font-normal text-slate-600">Set after we review your application</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <Link to="/dashboard/apply">
              <Button className="h-[44px] rounded-lg bg-red-600 px-5 text-[14px] font-bold text-white hover:bg-red-700">
                Start my application
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </Link>
            <Link to="/faq#cost" className="tap-link inline-block py-1 text-[13px] font-semibold text-brand-blue underline underline-offset-2 hover:no-underline">
              What will it cost me?
            </Link>
          </div>
          <p className="text-xs text-slate-500">An estimate only. The exact amount and fees are confirmed when you apply.</p>
        </div>
      )}
    </div>
  );
}
