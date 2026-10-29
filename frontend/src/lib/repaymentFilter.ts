// The admin's "paid / unpaid" filter on All Applications. Plain functions with no React in them, so every case can be tested on its own
// (tools/test_repayment_filter.mjs).
//
// Repayment only means something once money has been paid out. Every new application starts as repayment_status "unpaid" and a declined
// one keeps it, so "unpaid" alone would mostly list applications that owe nothing. A loan counts only when it was paid out: loan status
// "disbursed", or "defaulted" (marking a loan defaulted changes its loan status too). A written-off loan is marked paid but was never
// repaid, so it is in neither group.

export type RepaymentGroup = "unpaid" | "part" | "late" | "paid";
/** What the filter can be set to: a group, "owing" (all three unpaid groups together) or "all". */
export type RepaymentFilter = "all" | "owing" | RepaymentGroup;

/** The fields this needs (the admin list rows have them all). */
export interface RepaymentRow {
  status: string;
  repaymentStatus: string;
  outstandingBalance: number;
  repaymentAmount: number;
}

export const REPAYMENT_FILTERS: RepaymentFilter[] = ["all", "owing", "unpaid", "part", "late", "paid"];

/** A value from the address bar, or "all" when it is missing or not one of ours. */
export const asRepaymentFilter = (v: string | null | undefined): RepaymentFilter => ((REPAYMENT_FILTERS as string[]).includes(v ?? "") ? (v as RepaymentFilter) : "all");

const PAID_OUT = new Set(["disbursed", "defaulted"]);
const LATE = new Set(["delinquent", "escalated", "defaulted"]);
const norm = (s: string) => (s ?? "").toLowerCase().replace(/[\s-]/g, "_");

/** Which group a loan is in, or null when repayment does not apply to it (waiting, declined, written off...). */
export function repaymentGroup(a: Pick<RepaymentRow, "status" | "repaymentStatus">): RepaymentGroup | null {
  if (!PAID_OUT.has(norm(a.status))) return null;
  const r = norm(a.repaymentStatus);
  if (r === "paid") return "paid";
  if (r === "partially_paid") return "part";
  if (LATE.has(r)) return "late";
  return "unpaid"; // "unpaid" and anything older loans may carry
}

export function matchesRepayment(a: Pick<RepaymentRow, "status" | "repaymentStatus">, filter: RepaymentFilter): boolean {
  if (filter === "all") return true;
  const g = repaymentGroup(a);
  if (filter === "owing") return g === "unpaid" || g === "part" || g === "late";
  return g === filter;
}

/** What is still owed on a loan in one of the unpaid groups (0 for any other row): the tracked balance, else the repayment amount (the dashboard's rule). */
export function stillOwed(a: RepaymentRow): number {
  const g = repaymentGroup(a);
  if (g === null || g === "paid") return 0;
  return a.outstandingBalance > 0 ? a.outstandingBalance : a.repaymentAmount;
}

/** How many rows each option would show, for the option labels. */
export function repaymentCounts(rows: Pick<RepaymentRow, "status" | "repaymentStatus">[]): Record<RepaymentFilter, number> {
  const out: Record<RepaymentFilter, number> = { all: rows.length, owing: 0, unpaid: 0, part: 0, late: 0, paid: 0 };
  for (const r of rows) {
    const g = repaymentGroup(r);
    if (g) out[g] += 1;
    if (g === "unpaid" || g === "part" || g === "late") out.owing += 1;
  }
  return out;
}
