import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Info } from "lucide-react";
import { statusDisplay } from "@/lib/loanStatus";

// Small building blocks for the answers.

export const P = ({ children }: { children: ReactNode }) => <p>{children}</p>;

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-[12px] font-bold text-white">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2.5 rounded-xl bg-blue-50 px-4 py-3 text-[14px] text-slate-700 ring-1 ring-blue-100">
      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" />
      <span>{children}</span>
    </p>
  );
}

/** The next step for the question just answered. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3 pt-1">{children}</div>;
}

export function ActionLink({ to, href, primary = false, children }: { to?: string; href?: string; primary?: boolean; children: ReactNode }) {
  const cls = `group inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-[14px] font-semibold transition-colors ${
    primary ? "bg-brand-blue text-white shadow-sm hover:bg-[#0b2246]" : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
  }`;
  const inner = (
    <>
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {inner}
    </a>
  );
}

// ─── Document checklist ───────────────────────────────────────────────────────

const DOC_SETS = {
  "Salary Advance": {
    who: "For staff of a partner company.",
    profile: ["National ID copy (front and back)", "KRA PIN certificate", "Your original employment contract"],
    details: "Name, email, phone, ID number, KRA PIN and payroll number.",
    apply: [] as string[],
  },
  "Personal Loan": {
    who: "For individuals.",
    profile: ["National ID copy (front and back)", "KRA PIN certificate"],
    details: "Name, email, phone, ID number and KRA PIN.",
    apply: ["Bank statement (6 months)", "M-Pesa statement (6 months)", "Payslip (only if you are employed)"],
  },
} as const;

function DocList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-slate-600">{title}</p>
      <ul className="space-y-2">
        {items.map((d) => (
          <li key={d} className="flex items-center gap-2.5 text-slate-800">
            <FileText className="h-4 w-4 flex-shrink-0 text-brand-blue" />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DocChecklist() {
  const [loan, setLoan] = useState<keyof typeof DOC_SETS>("Salary Advance");
  const set = DOC_SETS[loan];
  return (
    <div className="space-y-4">
      <p>Pick your loan to see exactly what to have ready.</p>
      <div role="tablist" aria-label="Loan type" className="inline-flex rounded-xl bg-slate-100 p-1">
        {(Object.keys(DOC_SETS) as (keyof typeof DOC_SETS)[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={loan === k}
            onClick={() => setLoan(k)}
            className={`min-h-[40px] rounded-lg px-4 text-[14px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${
              loan === k ? "bg-white text-brand-blue shadow-sm ring-1 ring-slate-900/5" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="space-y-4 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
        <p className="font-semibold text-slate-900">{set.who}</p>
        <DocList title="Upload on your profile" items={set.profile} />
        <div>
          <p className="mb-1 text-[12px] font-bold uppercase tracking-wider text-slate-600">Fill in on your profile</p>
          <p className="text-slate-800">{set.details}</p>
        </div>
        {set.apply.length > 0 && <DocList title="Add when you apply" items={set.apply} />}
      </div>
      <Tip>
        {loan === "Personal Loan" ? "If a statement or payslip is password protected, type the password next to the upload. " : ""}
        Unclear files can be rejected, and we email you the reason so you can upload a better one.
      </Tip>
    </div>
  );
}

// ─── Status guide ─────────────────────────────────────────────────────────────

const STATUS_HELP: [string, string][] = [
  ["pending_processing", "We are checking your details and documents."],
  ["amended", "Our team adjusted the amount on your application. Check the new figures on your dashboard."],
  ["rate_set", "Personal loans: we set a rate. Open the application to accept or decline it."],
  ["rate_confirmed", "You accepted the rate. Next we approve the loan."],
  ["rate_declined", "You declined the rate we set."],
  ["approved", "Approved and waiting for payout."],
  ["declined", "We could not approve this application."],
  ["disbursed", "The money has been sent. Your dashboard shows what to repay and the due date."],
];

export function StatusGuide() {
  return (
    <ul className="divide-y divide-slate-200 rounded-2xl bg-slate-50 ring-1 ring-slate-200">
      {STATUS_HELP.map(([key, text]) => {
        const s = statusDisplay(key);
        return (
          <li key={key} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="sm:w-36 sm:flex-shrink-0">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold ${s.className}`}>{s.label}</span>
            </span>
            <span className="text-slate-700">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

