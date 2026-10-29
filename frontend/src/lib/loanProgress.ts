// Where one loan application is, for the applicant: five steps (Submitted, Review, Approved, Paid out, Repaid) and the one thing to know
// about the step it is on. Plain functions with no React, so every state can be tested alone. Like lib/nextStep.ts it states no timeline, fee or
// rule: for those it links to the FAQ answer (which an admin edits). The wording of the repayment lines is the page's existing wording.
import { ago, applyAgainTo, daysUntil, money, shortDate, when } from "./nextStep";

export type StepState = "done" | "current" | "todo" | "stopped";
export type PanelTone = "navy" | "amber" | "red" | "green";

export interface Progress {
  steps: { label: string; state: StepState }[];
  /** Index (0-4) of the step the loan is on: 5 when everything is done. */
  reached: number;
  tone: PanelTone;
  title: string;
  body?: string;
  /** `anchor` scrolls to a part of the same page, `to` goes to another page. */
  cta?: { label: string; to?: string; anchor?: string };
  help?: { label: string; to: string };
}

export interface ProgressInput {
  /** The application's id, so "Apply again" can start from it. */
  id?: string;
  /** The loan status in any case: pending, rate_set, rate_confirmed, confirmed, approved, disbursed, declined, rate_declined. */
  status: string;
  /** For a paid-out loan: UNPAID, PARTIALLY_PAID, DELINQUENT or FULLY_PAID. */
  paymentStatus?: string;
  dueDate?: string;
  /** What is still to repay on a paid-out loan. */
  owed?: number;
}

const LABELS = ["Submitted", "Review", "Approved", "Paid out", "Repaid"];
const norm = (s?: string | null) => (s ?? "").toLowerCase().replace(/[\s-]/g, "_");
const REPAY_HELP = { label: "How repayment works", to: "/faq#repay" };
const TIME_HELP = { label: "How long does it take?", to: "/faq#time" };
const AGAIN = { label: "Apply again", to: "/dashboard/apply" };

export function loanProgress(a: ProgressInput, now: Date = new Date()): Progress {
  // `at` is the step the loan is on; `stopped` marks it as where the loan ended without being approved.
  const build = (at: number, stopped = false): Pick<Progress, "steps" | "reached"> => ({
    reached: at,
    steps: LABELS.map((label, i) => ({ label, state: i < at ? "done" : i === at ? (stopped ? "stopped" : "current") : "todo" })),
  });
  const status = norm(a.status);

  if (status === "rate_set")
    return {
      ...build(1),
      tone: "amber",
      title: "Your move: review the rate",
      body: "We set a rate for your loan. Accept or decline it below. The loan only goes ahead once you accept.",
      cta: { label: "Review rate", anchor: "rate-review" },
    };
  if (status === "rate_confirmed" || status === "confirmed")
    return { ...build(2), tone: "navy", title: "Waiting for approval", body: "You accepted the terms. We pay out once the loan is approved.", help: TIME_HELP };
  if (status === "approved")
    return { ...build(3), tone: "green", title: "Approved: we are preparing your payout", help: { label: "When will I get the money?", to: "/faq#time" } };
  if (status === "declined" || status === "rejected")
    return {
      ...build(1, true),
      tone: "red",
      title: "Not approved this time",
      body: "You can apply again whenever you are ready. Contact us if you would like to know more.",
      cta: AGAIN,
      help: { label: "Contact us", to: "/#contact" },
    };
  if (status === "rate_declined")
    return { ...build(1, true), tone: "red", title: "You declined the rate", body: "This application is closed. You can apply again whenever you are ready.", cta: AGAIN };

  if (status === "disbursed") {
    const pay = (a.paymentStatus ?? "").toUpperCase();
    if (pay === "FULLY_PAID") return { ...build(5), tone: "green", title: "Fully repaid. Thank you!", cta: { label: "Apply again", to: applyAgainTo(a.id) } };
    const days = a.dueDate ? daysUntil(a.dueDate, now) : null;
    const owed = a.owed && a.owed > 0 ? a.owed : null;
    if (pay === "DELINQUENT" || (days !== null && days < 0))
      return {
        ...build(4),
        tone: "red",
        title: owed ? `${money(owed)} is overdue` : "Your payment is overdue",
        body: a.dueDate && days !== null && days < 0 ? `It was due on ${shortDate(a.dueDate)} (${ago(-days)}). Please repay as soon as you can.` : "Please repay as soon as you can.",
        help: REPAY_HELP,
      };
    const lead = pay === "PARTIALLY_PAID" ? "left to repay" : "to repay";
    if (a.dueDate && days !== null)
      return {
        ...build(4),
        tone: days <= 3 ? "amber" : "navy",
        title: owed ? `${money(owed)} ${lead} by ${shortDate(a.dueDate)}` : `Repayment due on ${shortDate(a.dueDate)}`,
        body: `That is ${when(days)}.`,
        help: REPAY_HELP,
      };
    return {
      ...build(4),
      tone: "navy",
      title: owed ? `You owe ${money(owed)}` : "Your loan is paid out",
      body: "Your due date shows here once it is set.",
      help: REPAY_HELP,
    };
  }

  // pending, and anything else still being looked at
  return { ...build(1), tone: "navy", title: "We are reviewing your application", body: "The decision will show here.", help: TIME_HELP };
}
