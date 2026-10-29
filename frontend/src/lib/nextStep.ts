// What the applicant's home page says first: the ONE next thing for this person (act on a rate, repay, wait, finish the profile, apply).
// Plain functions with no React in them, so every state can be tested on its own. Nothing here states a timeline, fee or rule: where a
// person needs the details it links to the FAQ answer (which an admin edits), the way Leo does.

export type Tone = "navy" | "amber" | "red";

/** The loan fields this needs (the dashboard's own application rows have them all). */
export interface StepApp {
  id: string;
  status: string;
  amountApplied: number;
  repaymentAmount?: number;
  /** What is left to repay after part payments and any collection fee (the server keeps it; the loan page uses it too). */
  outstandingAmount?: number;
  repaymentStatus?: string;
  dueDate?: string;
  submittedAt: string;
}

export interface StepProfile {
  isComplete: boolean;
  percent: number;
  /** The most the lender will lend this person in one application, if an admin has set one. */
  loanLimit?: number | null;
  /** What is still missing, in words ("National ID number", "KRA PIN certificate"). */
  missing: string[];
}

export interface NextStep {
  key: "rate" | "overdue" | "due" | "owing" | "approved" | "review" | "profile" | "declined" | "again" | "ready";
  tone: Tone;
  eyebrow: string;
  title: string;
  body?: string;
  cta?: { label: string; to: string };
  /** A quieter second link (an FAQ answer). */
  help?: { label: string; to: string };
  /** Set on the "profile" step: shows the progress and what is missing. */
  profile?: StepProfile;
}

const norm = (s?: string | null) => (s ?? "").toLowerCase().replace(/[\s-]/g, "_");

const BEFORE_DECISION = new Set(["pending", "pending_processing", "processing", "amended", "rate_confirmed", "confirmed"]);
const DECLINED = new Set(["declined", "rejected", "rate_declined"]);
const LATE_STATUS = new Set(["delinquent", "escalated", "defaulted"]);
const PAID = new Set(["paid", "fully_paid"]);

/** What is still owed on a paid-out loan. Same rule as the loan page: once part payments or fees are involved the server's balance is the truth, not the original repayment amount. */
export function amountOwed(a: Pick<StepApp, "repaymentAmount" | "repaymentStatus" | "outstandingAmount">): number {
  const s = norm(a.repaymentStatus);
  return (s === "partially_paid" || s === "delinquent") && (a.outstandingAmount ?? 0) > 0 ? (a.outstandingAmount as number) : (a.repaymentAmount ?? 0);
}

export type LoanGroup = "active" | "progress" | "repaid" | "declined" | "other";

/** Which of the borrower's four groups a loan belongs to (the home page's counts and the applications list's filters use this one rule). */
export function loanGroup(status?: string | null, repaymentStatus?: string | null): LoanGroup {
  const st = norm(status);
  if (DECLINED.has(st)) return "declined";
  if (st === "disbursed" || LATE_STATUS.has(st)) return PAID.has(norm(repaymentStatus)) ? "repaid" : "active";
  if (st === "approved" || st === "rate_set" || BEFORE_DECISION.has(st)) return "progress";
  return "other";
}

/** The short "due" label for a loan still being repaid (null when there is no date). */
export function dueChip(dueDate: string | undefined | null, now: Date = new Date()): { text: string; tone: Tone } | null {
  if (!dueDate) return null;
  const days = daysUntil(dueDate, now);
  if (days < 0) return { text: `Overdue ${-days} ${-days === 1 ? "day" : "days"}`, tone: "red" };
  if (days === 0) return { text: "Due today", tone: "amber" };
  if (days <= 3) return { text: `Due ${when(days)}`, tone: "amber" };
  return { text: `Due ${shortDate(dueDate)}`, tone: "navy" };
}

/** KES 19,800 (no decimals unless there are some). */
export const money = (n: number) => `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** A date as a calendar day: a plain "2026-11-04" is that day wherever the phone is. */
function day(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days from today to a due date (negative once it has passed). */
export const daysUntil = (due: string, now: Date) => Math.round((midnight(day(due)) - midnight(now)) / 86_400_000);

export const shortDate = (value: string) => day(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

export const when = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);
export const ago = (n: number) => (n === 1 ? "yesterday" : `${n} days ago`);

const APPLY = { label: "Apply for a loan", to: "/dashboard/apply" };
/** "Apply again": the form opens with what does not change between applications already filled in (see hooks/useApplyAgain.ts). */
export const applyAgainTo = (id?: string) => (id ? `/dashboard/apply?again=${encodeURIComponent(id)}` : "/dashboard/apply");
/** " You can apply for up to KES 150,000." (nothing when no limit is set) */
const limitLine = (limit?: number | null) => (limit && limit > 0 ? ` You can apply for up to ${money(limit)}.` : "");
const REPAY_HELP = { label: "How repayment works", to: "/faq#repay" };
const detail = (id: string) => `/dashboard/applications/${id}`;

export function nextStep(apps: StepApp[], profile: StepProfile, now: Date = new Date()): NextStep {
  const status = (a: StepApp) => norm(a.status);
  const newestFirst = (a: StepApp, b: StepApp) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();

  // 1. A personal loan whose rate is waiting for the borrower to accept or decline.
  const rate = apps.filter((a) => status(a) === "rate_set").sort(newestFirst);
  if (rate.length)
    return {
      key: "rate",
      tone: "amber",
      eyebrow: "Action needed",
      title: rate.length === 1 ? "Your loan rate is ready" : `${rate.length} loans need your decision`,
      body: "Review the rate we set and accept or decline it. The loan only goes ahead once you accept.",
      cta: { label: rate.length === 1 ? "Review rate" : "Review rates", to: rate.length === 1 ? detail(rate[0].id) : "/dashboard/applications" },
    };

  // 2. Money owed: loans paid out and not yet repaid.
  const owed = apps
    .filter((a) => (status(a) === "disbursed" || LATE_STATUS.has(status(a))) && !PAID.has(norm(a.repaymentStatus)))
    .map((a) => ({ app: a, days: a.dueDate ? daysUntil(a.dueDate, now) : null }));
  if (owed.length) {
    const total = (list: typeof owed) => list.reduce((sum, o) => sum + amountOwed(o.app), 0);
    const late = owed.filter((o) => (o.days !== null && o.days < 0) || LATE_STATUS.has(status(o.app)) || norm(o.app.repaymentStatus) === "delinquent");
    if (late.length) {
      const worst = [...late].sort((a, b) => (a.days ?? 0) - (b.days ?? 0))[0];
      return {
        key: "overdue",
        tone: "red",
        eyebrow: "Overdue",
        title: `${money(total(late))} is overdue`,
        body:
          worst.app.dueDate && worst.days !== null && worst.days < 0
            ? `It was due on ${shortDate(worst.app.dueDate)} (${ago(-worst.days)}). Please repay as soon as you can.`
            : "Please repay as soon as you can.",
        cta: { label: late.length === 1 ? "View loan" : "View loans", to: late.length === 1 ? detail(late[0].app.id) : "/dashboard/applications" },
        help: REPAY_HELP,
      };
    }
    const dated = owed.filter((o) => o.days !== null).sort((a, b) => (a.days as number) - (b.days as number));
    const first = dated[0];
    const to = owed.length === 1 ? detail(owed[0].app.id) : "/dashboard/applications";
    const cta = { label: owed.length === 1 ? "View loan" : "View loans", to };
    if (first && (first.days as number) <= 7) {
      // the amount that falls due on that first day (two loans can share a date)
      const sameDay = dated.filter((o) => o.days === first.days);
      return {
        key: "due",
        tone: (first.days as number) <= 3 ? "amber" : "navy",
        eyebrow: "Payment due",
        title: `${money(total(sameDay))} due ${when(first.days as number)}`,
        body: `Due on ${shortDate(first.app.dueDate as string)}.`,
        cta,
        help: REPAY_HELP,
      };
    }
    return {
      key: "owing",
      tone: "navy",
      eyebrow: "Your loan",
      title: `You owe ${money(total(owed))}`,
      body: first ? `Next payment due on ${shortDate(first.app.dueDate as string)} (${when(first.days as number)}).` : "Your due date shows here once it is set.",
      cta,
      help: REPAY_HELP,
    };
  }

  // 3. Waiting on us: approved and being paid out, or in review.
  const approved = apps.filter((a) => status(a) === "approved").sort(newestFirst);
  if (approved.length)
    return {
      key: "approved",
      tone: "navy",
      eyebrow: "Good news",
      title: approved.length === 1 ? "Your loan is approved" : `${approved.length} loans are approved`,
      body: `${money(approved[0].amountApplied)}: we are preparing your payout.`,
      cta: { label: "Track application", to: approved.length === 1 ? detail(approved[0].id) : "/dashboard/applications" },
      help: { label: "When will I get the money?", to: "/faq#time" },
    };
  const review = apps.filter((a) => BEFORE_DECISION.has(status(a))).sort(newestFirst);
  if (review.length)
    return {
      key: "review",
      tone: "navy",
      eyebrow: "In review",
      title: review.length === 1 ? "We are reviewing your application" : `We are reviewing ${review.length} applications`,
      body: `${money(review[0].amountApplied)}, submitted ${shortDate(review[0].submittedAt)}. You can follow it here at any time.`,
      cta: { label: "Track application", to: review.length === 1 ? detail(review[0].id) : "/dashboard/applications" },
      help: { label: "How long does it take?", to: "/faq#time" },
    };

  // 4. Nothing is open: finish the profile first (applying needs it), then invite them to apply.
  if (!profile.isComplete)
    return {
      key: "profile",
      tone: "navy",
      eyebrow: "Next step",
      title: "Finish your profile to apply",
      cta: { label: "Complete profile", to: "/dashboard/profile" },
      profile,
    };
  if (apps.some((a) => status(a) === "written_off"))
    return { key: "again", tone: "navy", eyebrow: "Your account", title: "Please get in touch about your account", body: "There is something to sort out on a past loan.", cta: { label: "Contact us", to: "/#contact" } };
  const last = [...apps].sort(newestFirst)[0];
  if (last && DECLINED.has(status(last)))
    return {
      key: "declined",
      tone: "navy",
      eyebrow: "Update",
      title: "Your last application was not approved",
      body: "You can apply again whenever you are ready.",
      cta: APPLY,
      help: { label: "See the details", to: detail(last.id) },
    };
  if (apps.length) {
    const lastPaid = apps.filter((a) => loanGroup(a.status, a.repaymentStatus) === "repaid").sort(newestFirst)[0];
    return {
      key: "again",
      tone: "navy",
      eyebrow: "Welcome back",
      title: "Need funds again?",
      body: `Your profile is complete. Apply whenever you are ready.${limitLine(profile.loanLimit)}`,
      cta: lastPaid ? { label: "Apply again", to: applyAgainTo(lastPaid.id) } : APPLY,
    };
  }
  return { key: "ready", tone: "navy", eyebrow: "Ready", title: "You are ready to apply", body: `Your details are already filled in, so applying is quick.${limitLine(profile.loanLimit)}`, cta: APPLY };
}
